import type { Prisma, PrismaClient } from "@prisma/client";

import { ApiError } from "../../common/apiError";
import { DEFAULT_PROJECT_COLOR, DEFAULT_TAG_COLOR, DEFAULT_TIMEZONE } from "../../common/constants";
import { getSoftDeleteTimestamps } from "../../common/softDelete";
import { requireUserAiConfig } from "../settings/settings.service";
import {
  type AiTodoResult,
  type MarkdownPolishRequest,
  type TodoOrganizationRequest
} from "./ai.schemas";
import { toTodoDto, toUndoRecordDto, todoDtoInclude } from "./ai.dto";
import type { TodoDto, UndoRecordDto } from "./ai.dto";
import { parseAiTodoResultList } from "./aiResultParser";
import { createEntityId } from "./ids";
import {
  replaceImagesWithPlaceholders,
  restoreImagePlaceholders
} from "./markdownImages";
import { createChatCompletion } from "./modelClient";
import {
  buildMarkdownPolishSystemPrompt,
  buildTodoOrganizationSystemPrompt
} from "./prompts";

const AI_UNDO_TTL_MS = 5 * 60 * 1000;

export interface TodoOrganizationResponse {
  // Primary (first) created todo — kept for backward compatibility.
  todo: TodoDto;
  // All created todos (1..N) when the input was split by time.
  todos: TodoDto[];
  aiResult: AiTodoResult;
  aiResults: AiTodoResult[];
  undoRecord: UndoRecordDto;
}

export interface MarkdownPolishResponse {
  markdown: string;
}

function dateFromIso(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp) : undefined;
}

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

function formatLocalTime(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: timezone,
      dateStyle: "full",
      timeStyle: "medium",
      hour12: false
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: DEFAULT_TIMEZONE,
      dateStyle: "full",
      timeStyle: "medium",
      hour12: false
    }).format(date);
  }
}

function uniqueNames(names: string[] | undefined): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const name of names ?? []) {
    const trimmed = name.trim();
    const key = normalizeName(trimmed);

    if (!trimmed || seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(trimmed);
  }

  return output;
}

function assertAiEnabled(enabled: boolean): void {
  if (!enabled) {
    throw new ApiError("BUSINESS_ERROR", "AI 助手已在设置中关闭", 422);
  }
}

async function listProjectNames(
  prisma: PrismaClient,
  userId: string
): Promise<string[]> {
  const projects = await prisma.project.findMany({
    where: {
      userId,
      deletedAt: null
    },
    orderBy: { createdAt: "asc" },
    select: { name: true }
  });

  return projects.map((project) => project.name);
}

async function listTagNames(
  prisma: PrismaClient,
  userId: string
): Promise<string[]> {
  const tags = await prisma.tag.findMany({
    where: {
      userId,
      deletedAt: null
    },
    orderBy: { createdAt: "asc" },
    select: { name: true }
  });

  return tags.map((tag) => tag.name);
}

async function findOrCreateProject(
  tx: Prisma.TransactionClient,
  userId: string,
  projectName: string | undefined,
  now: Date
): Promise<string | undefined> {
  if (!projectName) {
    return undefined;
  }

  const projects = await tx.project.findMany({
    where: {
      userId,
      deletedAt: null
    },
    select: {
      id: true,
      name: true
    }
  });
  const existing = projects.find(
    (project) => normalizeName(project.name) === normalizeName(projectName)
  );

  if (existing) {
    return existing.id;
  }

  const project = await tx.project.create({
    data: {
      id: createEntityId("proj"),
      userId,
      name: projectName,
      color: DEFAULT_PROJECT_COLOR,
      createdAt: now,
      updatedAt: now
    },
    select: { id: true }
  });

  return project.id;
}

async function findOrCreateTags(
  tx: Prisma.TransactionClient,
  userId: string,
  tagNames: string[] | undefined,
  now: Date
): Promise<string[]> {
  const names = uniqueNames(tagNames);

  if (names.length === 0) {
    return [];
  }

  const existingTags = await tx.tag.findMany({
    where: {
      userId,
      deletedAt: null
    },
    select: {
      id: true,
      name: true
    }
  });
  const tagIds: string[] = [];

  for (const name of names) {
    const existing = existingTags.find(
      (tag) => normalizeName(tag.name) === normalizeName(name)
    );

    if (existing) {
      tagIds.push(existing.id);
      continue;
    }

    const tag = await tx.tag.create({
      data: {
        id: createEntityId("tag"),
        userId,
        name,
        color: DEFAULT_TAG_COLOR,
        createdAt: now,
        updatedAt: now
      },
      select: { id: true }
    });

    tagIds.push(tag.id);
  }

  return tagIds;
}

function buildAiMeta(aiResult: AiTodoResult, model: string, now: Date): Prisma.InputJsonObject {
  return {
    aiGenerated: true,
    aiModel: model,
    aiCreatedAt: now.toISOString(),
    confidence: aiResult.confidence ?? {},
    warnings: aiResult.warnings ?? []
  };
}

function buildDefaultReminder(dueAt: Date | undefined, advanceMinutes: number): {
  remindAt: Date;
  reason: string;
} | null {
  if (!dueAt) {
    return null;
  }

  return {
    remindAt: new Date(dueAt.getTime() - Math.max(advanceMinutes, 0) * 60 * 1000),
    reason: "截止时间提醒"
  };
}

function buildReminderInputs(
  aiResult: AiTodoResult,
  dueAt: Date | undefined,
  advanceMinutes: number
): Array<{ remindAt: Date; reason?: string }> {
  const modelReminders: Array<{ remindAt: Date; reason?: string }> = [];

  for (const reminder of aiResult.reminders ?? []) {
    const remindAt = dateFromIso(reminder.remindAt);

    if (!remindAt) {
      continue;
    }

    modelReminders.push(
      reminder.reason ? { remindAt, reason: reminder.reason } : { remindAt }
    );
  }

  if (modelReminders.length > 0) {
    return modelReminders;
  }

  const defaultReminder = buildDefaultReminder(dueAt, advanceMinutes);
  return defaultReminder ? [defaultReminder] : [];
}

// Inserts a single todo (and its project/tags/subtasks/reminders) within the
// transaction. Does NOT touch undo records — the batch orchestrator owns undo.
async function insertSingleTodo(
  tx: Prisma.TransactionClient,
  userId: string,
  originalInput: string,
  aiResult: AiTodoResult,
  model: string,
  advanceMinutes: number,
  now: Date
): Promise<string> {
  const projectId = await findOrCreateProject(tx, userId, aiResult.projectName, now);
  const tagIds = await findOrCreateTags(tx, userId, aiResult.tags, now);
  const todoId = createEntityId("todo");
  const dueAt = dateFromIso(aiResult.dueAt);
  const reminders = buildReminderInputs(aiResult, dueAt, advanceMinutes);

  await tx.todo.create({
    data: {
      id: todoId,
      userId,
      title: aiResult.title,
      status: "todo",
      priority: aiResult.priority,
      projectId,
      dueAt,
      dueAtPrecision: aiResult.dueAtPrecision ?? (dueAt ? "datetime" : "none"),
      contentMarkdown: aiResult.contentMarkdown ?? "",
      originalInput,
      aiMeta: buildAiMeta(aiResult, model, now),
      createdAt: now,
      updatedAt: now
    }
  });

  if (reminders.length > 0) {
    await tx.reminder.createMany({
      data: reminders.map((reminder) => ({
        id: createEntityId("rem"),
        userId,
        todoId,
        remindAt: reminder.remindAt,
        reason: reminder.reason,
        kind: "due",
        createdAt: now
      }))
    });
  }

  if ((aiResult.subtasks ?? []).length > 0) {
    await tx.subtask.createMany({
      data: (aiResult.subtasks ?? []).map((title, index) => ({
        id: createEntityId("sub"),
        userId,
        todoId,
        title,
        done: false,
        position: index,
        createdAt: now
      }))
    });
  }

  if (tagIds.length > 0) {
    await tx.todoTag.createMany({
      data: tagIds.map((tagId) => ({
        userId,
        todoId,
        tagId,
        createdAt: now
      })),
      skipDuplicates: true
    });
  }

  return todoId;
}

// Creates N todos (split by the AI) under a SINGLE undo record so the whole
// batch can be reverted in one action.
async function createTodosFromAiResults(
  tx: Prisma.TransactionClient,
  userId: string,
  input: TodoOrganizationRequest,
  aiResults: AiTodoResult[],
  model: string,
  advanceMinutes: number,
  now: Date
): Promise<{ todoIds: string[]; undoRecordId: string }> {
  const todoIds: string[] = [];
  for (const aiResult of aiResults) {
    const todoId = await insertSingleTodo(
      tx,
      userId,
      input.input,
      aiResult,
      model,
      advanceMinutes,
      now
    );
    todoIds.push(todoId);
  }

  const undoRecordId = createEntityId("undo");
  const undoExpiresAt = new Date(now.getTime() + AI_UNDO_TTL_MS);

  await tx.undoRecord.updateMany({
    where: {
      userId,
      action: "ai_create_todo",
      consumedAt: null
    },
    data: {
      consumedAt: now
    }
  });

  await tx.undoRecord.create({
    data: {
      id: undoRecordId,
      userId,
      action: "ai_create_todo",
      // Keep the first id in the dedicated column for backward compatibility;
      // the full list lives in payloadJson.todoIds.
      todoId: todoIds[0],
      originalInput: input.input,
      payloadJson: {
        todoIds,
        aiResults
      },
      createdAt: now,
      expiresAt: undoExpiresAt
    }
  });

  return { todoIds, undoRecordId };
}

export async function organizeTodoWithAi(
  prisma: PrismaClient,
  userId: string,
  input: TodoOrganizationRequest
): Promise<TodoOrganizationResponse> {
  const aiConfig = await requireUserAiConfig(prisma, userId);
  assertAiEnabled(aiConfig.enabled);
  const now = new Date();
  const { markdownWithPlaceholders: modelInput } = replaceImagesWithPlaceholders(
    input.input
  );
  const [projectNames, tagNames, settings] = await Promise.all([
    listProjectNames(prisma, userId),
    listTagNames(prisma, userId),
    prisma.userSetting.findUnique({
      where: { userId },
      select: { ringtoneAdvanceMinutes: true }
    })
  ]);
  const content = await createChatCompletion({
    apiKey: aiConfig.apiKey,
    baseUrl: aiConfig.baseUrl,
    model: aiConfig.model,
    messages: [
      {
        role: "system",
        content: buildTodoOrganizationSystemPrompt({
          assistantPrompt: aiConfig.assistantPrompt,
          nowIso: now.toISOString(),
          nowLocalText: formatLocalTime(now, input.timezone),
          timezone: input.timezone,
          projectNames,
          tagNames
        })
      },
      { role: "user", content: modelInput }
    ],
    temperature: 0.3,
    responseFormat: "json_object"
  });
  const aiResults = parseAiTodoResultList(content, input.input);
  const created = await prisma.$transaction(async (tx) =>
    createTodosFromAiResults(
      tx,
      userId,
      input,
      aiResults,
      aiConfig.model,
      settings?.ringtoneAdvanceMinutes ?? 15,
      now
    )
  );
  const [todoRows, undoRecord] = await Promise.all([
    prisma.todo.findMany({
      where: {
        id: { in: created.todoIds },
        userId,
        deletedAt: null
      },
      include: todoDtoInclude
    }),
    prisma.undoRecord.findFirstOrThrow({
      where: {
        id: created.undoRecordId,
        userId
      }
    })
  ]);

  // Preserve creation order (findMany does not guarantee it).
  const orderIndex = new Map(created.todoIds.map((id, index) => [id, index]));
  const orderedTodos = [...todoRows].sort(
    (a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0)
  );
  const todoDtos = orderedTodos.map((row) => toTodoDto(row));
  const [firstTodo] = todoDtos;
  const [firstAiResult] = aiResults;

  if (!firstTodo || !firstAiResult) {
    throw new ApiError("BUSINESS_ERROR", "AI 未能创建任何待办", 422);
  }

  return {
    todo: firstTodo,
    todos: todoDtos,
    aiResult: firstAiResult,
    aiResults,
    undoRecord: toUndoRecordDto(undoRecord)
  };
}

export async function polishMarkdownWithAi(
  prisma: PrismaClient,
  userId: string,
  input: MarkdownPolishRequest
): Promise<MarkdownPolishResponse> {
  const aiConfig = await requireUserAiConfig(prisma, userId);
  assertAiEnabled(aiConfig.enabled);
  const now = new Date();
  const { markdownWithPlaceholders, placeholders } = replaceImagesWithPlaceholders(
    input.markdown
  );
  const content = await createChatCompletion({
    apiKey: aiConfig.apiKey,
    baseUrl: aiConfig.baseUrl,
    model: aiConfig.model,
    messages: [
      {
        role: "system",
        content: buildMarkdownPolishSystemPrompt({
          assistantPrompt: aiConfig.assistantPrompt,
          nowIso: now.toISOString(),
          nowLocalText: formatLocalTime(now, input.timezone),
          timezone: input.timezone
        })
      },
      { role: "user", content: markdownWithPlaceholders }
    ],
    temperature: 0.25
  });

  return {
    markdown: restoreImagePlaceholders(content.trim(), placeholders)
  };
}

export async function softDeleteAiCreatedTodo(
  tx: Prisma.TransactionClient,
  userId: string,
  todoId: string,
  now = new Date()
): Promise<void> {
  const softDelete = getSoftDeleteTimestamps(now);

  await tx.todo.updateMany({
    where: {
      id: todoId,
      userId,
      deletedAt: null
    },
    data: {
      deletedAt: softDelete.deletedAt,
      purgeAfter: softDelete.purgeAfter,
      updatedAt: now
    }
  });

  await tx.subtask.updateMany({
    where: {
      todoId,
      userId,
      deletedAt: null
    },
    data: softDelete
  });

  await tx.reminder.updateMany({
    where: {
      todoId,
      userId,
      deletedAt: null
    },
    data: softDelete
  });

  await tx.attachment.updateMany({
    where: {
      todoId,
      userId,
      deletedAt: null
    },
    data: softDelete
  });
}
