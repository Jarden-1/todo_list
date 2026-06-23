import type {
  Attachment,
  Prisma,
  PrismaClient,
  Project,
  Tag,
  Todo
} from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";

import { ApiError } from "../../common/apiError";
import { getSoftDeleteTimestamps } from "../../common/softDelete";
import { toAuthUserDto } from "../auth/auth.types";
import { toUndoRecordDto } from "../ai/ai.dto";
import { getLatestUndoRecord } from "../ai/undo.service";
import { removeLocalFileIfExists, resolveLocalStoragePath } from "../files/localDiskStorage";
import { DEFAULT_SETTINGS } from "../settings/settings.dto";
import { replaceSettingsSchema, type ReplaceSettingsInput } from "../settings/settings.schemas";
import { getSettings } from "../settings/settings.service";
import { createEntityId } from "../todos/ids";
import {
  todoInclude,
  toProjectDto,
  toTagDto,
  toTodoDto,
  type TodoWithRelations
} from "../todos/todo.dto";
import type {
  BackupAttachmentInput,
  BackupTodoInput,
  WorkspaceBackupInput
} from "./workspace.schemas";

type WritableDb = PrismaClient | Prisma.TransactionClient;

interface WorkspaceDeleteCounts {
  todos: number;
  projects: number;
  tags: number;
  subtasks: number;
  reminders: number;
  attachments: number;
  todoTags: number;
  notifications: number;
  undoRecords: number;
}

interface ImportedWorkspaceCounts {
  todos: number;
  projects: number;
  tags: number;
  subtasks: number;
  reminders: number;
  attachments: number;
  todoTags: number;
  undoRecords: number;
  skippedAttachments: number;
}

interface ImportMaps {
  projects: Map<string, string>;
  tags: Map<string, string>;
  todos: Map<string, string>;
}

interface ImportableAttachment {
  input: BackupAttachmentInput;
  storageKey: string;
  storageProvider: "local";
}

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function toDate(value: string | null | undefined, fallback: Date): Date {
  return value ? new Date(value) : fallback;
}

function nullableDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

function jsonInput(value: unknown): Prisma.InputJsonValue | typeof PrismaNamespace.JsonNull {
  return value === null ? PrismaNamespace.JsonNull : (value as Prisma.InputJsonValue);
}

function optionalJsonInput(
  value: unknown
): Prisma.InputJsonValue | typeof PrismaNamespace.JsonNull | undefined {
  return value === undefined ? undefined : jsonInput(value);
}

function toStorageSegment(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9._-]/g, "_");
  return cleaned.length > 0 ? cleaned : "_";
}

function contentUrlFor(fileId: string): string {
  return `/api/v1/files/${fileId}/content`;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeSettingsForImport(settings: unknown): ReplaceSettingsInput | null {
  if (!isPlainRecord(settings)) {
    return null;
  }

  const aiModel = isPlainRecord(settings.aiModel) ? settings.aiModel : {};
  const ringtone = isPlainRecord(settings.ringtone) ? settings.ringtone : {};
  const feedback = isPlainRecord(settings.feedback) ? settings.feedback : {};

  return replaceSettingsSchema.parse({
    schemaVersion: 2,
    aiModel: {
      enabled: booleanValue(aiModel.enabled, DEFAULT_SETTINGS.aiModel.enabled),
      model: stringValue(aiModel.model, DEFAULT_SETTINGS.aiModel.model),
      baseUrl: stringValue(aiModel.baseUrl, DEFAULT_SETTINGS.aiModel.baseUrl),
      assistantPrompt: stringValue(
        aiModel.assistantPrompt,
        DEFAULT_SETTINGS.aiModel.assistantPrompt
      )
    },
    ringtone: {
      enabled: booleanValue(ringtone.enabled, DEFAULT_SETTINGS.ringtone.enabled),
      sound: stringValue(ringtone.sound, DEFAULT_SETTINGS.ringtone.sound),
      volume: numberValue(ringtone.volume, DEFAULT_SETTINGS.ringtone.volume),
      advanceMinutes: numberValue(
        ringtone.advanceMinutes,
        DEFAULT_SETTINGS.ringtone.advanceMinutes
      )
    },
    feedback: {
      completeSound: booleanValue(
        feedback.completeSound,
        DEFAULT_SETTINGS.feedback.completeSound
      ),
      completeAnimation: booleanValue(
        feedback.completeAnimation,
        DEFAULT_SETTINGS.feedback.completeAnimation
      ),
      operationSound: booleanValue(
        feedback.operationSound,
        DEFAULT_SETTINGS.feedback.operationSound
      )
    }
  });
}

async function upsertImportedSettings(
  db: WritableDb,
  userId: string,
  settings: ReplaceSettingsInput
): Promise<void> {
  const now = new Date();

  await db.userSetting.upsert({
    where: { userId },
    create: {
      userId,
      schemaVersion: settings.schemaVersion ?? 2,
      aiEnabled: settings.aiModel.enabled,
      aiModel: settings.aiModel.model,
      aiBaseUrl: settings.aiModel.baseUrl,
      aiAssistantPrompt: settings.aiModel.assistantPrompt,
      ringtoneEnabled: settings.ringtone.enabled,
      ringtoneSound: settings.ringtone.sound,
      ringtoneVolume: settings.ringtone.volume,
      ringtoneAdvanceMinutes: settings.ringtone.advanceMinutes,
      feedbackCompleteSound: settings.feedback.completeSound,
      feedbackCompleteAnimation: settings.feedback.completeAnimation,
      feedbackOperationSound: settings.feedback.operationSound,
      createdAt: now,
      updatedAt: now
    },
    update: {
      schemaVersion: settings.schemaVersion ?? 2,
      aiEnabled: settings.aiModel.enabled,
      aiModel: settings.aiModel.model,
      aiBaseUrl: settings.aiModel.baseUrl,
      aiAssistantPrompt: settings.aiModel.assistantPrompt,
      ringtoneEnabled: settings.ringtone.enabled,
      ringtoneSound: settings.ringtone.sound,
      ringtoneVolume: settings.ringtone.volume,
      ringtoneAdvanceMinutes: settings.ringtone.advanceMinutes,
      feedbackCompleteSound: settings.feedback.completeSound,
      feedbackCompleteAnimation: settings.feedback.completeAnimation,
      feedbackOperationSound: settings.feedback.operationSound,
      updatedAt: now
    }
  });
}

function toExportAttachmentDto(attachment: Attachment) {
  return {
    id: attachment.id,
    type:
      attachment.type === "image" || attachment.type === "link"
        ? attachment.type
        : "file",
    name: attachment.originalName,
    url: attachment.contentUrl,
    mimeType: attachment.mimeType,
    size: Number(attachment.sizeBytes),
    todoId: attachment.todoId,
    createdAt: attachment.createdAt.toISOString(),
    storageProvider: attachment.storageProvider,
    storageKey: attachment.storageKey,
    checksumSha256: attachment.checksumSha256
  };
}

function toExportTodoDto(todo: TodoWithRelations) {
  return {
    ...toTodoDto(todo),
    attachments: todo.attachments.map(toExportAttachmentDto)
  };
}

function blankDeleteCounts(): WorkspaceDeleteCounts {
  return {
    todos: 0,
    projects: 0,
    tags: 0,
    subtasks: 0,
    reminders: 0,
    attachments: 0,
    todoTags: 0,
    notifications: 0,
    undoRecords: 0
  };
}

function blankImportCounts(): ImportedWorkspaceCounts {
  return {
    todos: 0,
    projects: 0,
    tags: 0,
    subtasks: 0,
    reminders: 0,
    attachments: 0,
    todoTags: 0,
    undoRecords: 0,
    skippedAttachments: 0
  };
}

async function hardDeleteWorkspaceData(
  db: WritableDb,
  userId: string
): Promise<WorkspaceDeleteCounts> {
  const counts = blankDeleteCounts();

  counts.notifications = (
    await db.notificationEvent.deleteMany({ where: { userId } })
  ).count;
  counts.todoTags = (await db.todoTag.deleteMany({ where: { userId } })).count;
  counts.subtasks = (await db.subtask.deleteMany({ where: { userId } })).count;
  counts.reminders = (await db.reminder.deleteMany({ where: { userId } })).count;
  counts.attachments = (await db.attachment.deleteMany({ where: { userId } })).count;
  counts.undoRecords = (await db.undoRecord.deleteMany({ where: { userId } })).count;
  counts.todos = (await db.todo.deleteMany({ where: { userId } })).count;
  counts.projects = (await db.project.deleteMany({ where: { userId } })).count;
  counts.tags = (await db.tag.deleteMany({ where: { userId } })).count;

  return counts;
}

async function softDeleteWorkspaceData(
  db: WritableDb,
  userId: string,
  now = new Date()
): Promise<{ timestamps: { deletedAt: Date; purgeAfter: Date }; counts: WorkspaceDeleteCounts }> {
  const timestamps = getSoftDeleteTimestamps(now);
  const counts = blankDeleteCounts();

  counts.todoTags = (await db.todoTag.deleteMany({ where: { userId } })).count;
  counts.subtasks = (
    await db.subtask.updateMany({
      where: { userId, deletedAt: null },
      data: timestamps
    })
  ).count;
  counts.reminders = (
    await db.reminder.updateMany({
      where: { userId, deletedAt: null },
      data: timestamps
    })
  ).count;
  counts.attachments = (
    await db.attachment.updateMany({
      where: { userId, deletedAt: null },
      data: timestamps
    })
  ).count;
  counts.notifications = (
    await db.notificationEvent.updateMany({
      where: { userId, deletedAt: null },
      data: timestamps
    })
  ).count;
  counts.undoRecords = (
    await db.undoRecord.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: now }
    })
  ).count;
  counts.todos = (
    await db.todo.updateMany({
      where: { userId, deletedAt: null },
      data: { ...timestamps, updatedAt: now }
    })
  ).count;
  counts.projects = (
    await db.project.updateMany({
      where: { userId, deletedAt: null },
      data: { ...timestamps, updatedAt: now }
    })
  ).count;
  counts.tags = (
    await db.tag.updateMany({
      where: { userId, deletedAt: null },
      data: { ...timestamps, updatedAt: now }
    })
  ).count;

  return { timestamps, counts };
}

function getImportableAttachment(
  userId: string,
  input: BackupAttachmentInput
): ImportableAttachment | null {
  if (input.type === "link") {
    return null;
  }

  if (input.storageProvider !== "local" || !input.storageKey) {
    return null;
  }

  const userStoragePrefix = `${toStorageSegment(userId)}/`;

  if (!input.storageKey.startsWith(userStoragePrefix)) {
    return null;
  }

  try {
    resolveLocalStoragePath(input.storageKey);
  } catch {
    return null;
  }

  return {
    input,
    storageKey: input.storageKey,
    storageProvider: "local"
  };
}

function collectImportStorageKeys(
  userId: string,
  backup: WorkspaceBackupInput
): Set<string> {
  const storageKeys = new Set<string>();

  for (const todo of backup.data.todos) {
    for (const attachment of todo.attachments) {
      const importable = getImportableAttachment(userId, attachment);
      if (importable) {
        storageKeys.add(importable.storageKey);
      }
    }
  }

  return storageKeys;
}

async function removeReplacedLocalFiles(
  attachments: Array<Pick<Attachment, "storageProvider" | "storageKey">>,
  retainedStorageKeys: Set<string>
): Promise<void> {
  for (const attachment of attachments) {
    if (
      attachment.storageProvider === "local" &&
      !retainedStorageKeys.has(attachment.storageKey)
    ) {
      await removeLocalFileIfExists(attachment.storageKey);
    }
  }
}

async function createImportedProjects(
  db: WritableDb,
  userId: string,
  backup: WorkspaceBackupInput,
  maps: ImportMaps,
  counts: ImportedWorkspaceCounts,
  now: Date
): Promise<void> {
  for (const project of backup.data.projects) {
    const projectId = createEntityId("proj");
    const createdAt = toDate(project.createdAt, now);
    const updatedAt = toDate(project.updatedAt, createdAt);

    if (project.id) {
      maps.projects.set(project.id, projectId);
    }

    await db.project.create({
      data: {
        id: projectId,
        userId,
        name: project.name.trim(),
        color: project.color ?? null,
        createdAt,
        updatedAt
      }
    });
    counts.projects += 1;
  }
}

async function createImportedTags(
  db: WritableDb,
  userId: string,
  backup: WorkspaceBackupInput,
  maps: ImportMaps,
  counts: ImportedWorkspaceCounts,
  now: Date
): Promise<void> {
  for (const tag of backup.data.tags) {
    const tagId = createEntityId("tag");
    const createdAt = toDate(tag.createdAt, now);
    const updatedAt = toDate(tag.updatedAt, createdAt);

    if (tag.id) {
      maps.tags.set(tag.id, tagId);
    }

    await db.tag.create({
      data: {
        id: tagId,
        userId,
        name: tag.name.trim(),
        color: tag.color ?? null,
        createdAt,
        updatedAt
      }
    });
    counts.tags += 1;
  }
}

async function createImportedTodo(
  db: WritableDb,
  userId: string,
  todo: BackupTodoInput,
  maps: ImportMaps,
  counts: ImportedWorkspaceCounts,
  now: Date
): Promise<void> {
  const todoId = createEntityId("todo");
  const createdAt = toDate(todo.createdAt, now);
  const updatedAt = toDate(todo.updatedAt, createdAt);
  const projectId = todo.projectId ? maps.projects.get(todo.projectId) ?? null : null;

  if (todo.id) {
    maps.todos.set(todo.id, todoId);
  }

  await db.todo.create({
    data: {
      id: todoId,
      userId,
      title: todo.title.trim(),
      status: todo.status,
      priority: todo.priority,
      projectId,
      dueAt: nullableDate(todo.dueAt),
      dueAtPrecision: todo.dueAtPrecision ?? "datetime",
      contentMarkdown: todo.contentMarkdown,
      originalInput: todo.originalInput ?? null,
      aiMeta: optionalJsonInput(todo.aiMeta),
      assignee: todo.assignee ?? null,
      createdAt,
      updatedAt,
      completedAt: nullableDate(todo.completedAt),
      cancelledAt: nullableDate(todo.cancelledAt)
    }
  });
  counts.todos += 1;

  const tagIds = Array.from(
    new Set(todo.tagIds.map((tagId) => maps.tags.get(tagId)).filter(Boolean))
  ) as string[];

  for (const tagId of tagIds) {
    await db.todoTag.create({
      data: {
        userId,
        todoId,
        tagId,
        createdAt: now
      }
    });
    counts.todoTags += 1;
  }

  for (const [index, subtask] of todo.subtasks.entries()) {
    await db.subtask.create({
      data: {
        id: createEntityId("sub"),
        userId,
        todoId,
        title: subtask.title.trim(),
        done: subtask.done,
        position: subtask.position ?? index,
        createdAt: toDate(subtask.createdAt, createdAt),
        completedAt: nullableDate(subtask.completedAt)
      }
    });
    counts.subtasks += 1;
  }

  for (const reminder of todo.reminders) {
    await db.reminder.create({
      data: {
        id: createEntityId("rem"),
        userId,
        todoId,
        remindAt: new Date(reminder.remindAt),
        reason: reminder.reason ?? null,
        kind: reminder.kind ?? "due",
        createdAt: toDate(reminder.createdAt, createdAt),
        sentAt: nullableDate(reminder.sentAt),
        dismissedAt: nullableDate(reminder.dismissedAt)
      }
    });
    counts.reminders += 1;
  }

  for (const attachment of todo.attachments) {
    const importable = getImportableAttachment(userId, attachment);

    if (!importable) {
      counts.skippedAttachments += 1;
      continue;
    }

    const fileId = createEntityId("file");

    await db.attachment.create({
      data: {
        id: fileId,
        userId,
        todoId,
        type: attachment.type === "image" ? "image" : "file",
        originalName: attachment.name?.trim() || "file",
        mimeType: attachment.mimeType ?? null,
        sizeBytes: BigInt(attachment.size ?? 0),
        checksumSha256: attachment.checksumSha256 ?? null,
        storageProvider: importable.storageProvider,
        storageKey: importable.storageKey,
        contentUrl: contentUrlFor(fileId),
        createdAt: toDate(attachment.createdAt, createdAt)
      }
    });
    counts.attachments += 1;
  }
}

async function importWorkspaceRows(
  db: WritableDb,
  userId: string,
  backup: WorkspaceBackupInput
): Promise<ImportedWorkspaceCounts> {
  const now = new Date();
  const counts = blankImportCounts();
  const maps: ImportMaps = {
    projects: new Map(),
    tags: new Map(),
    todos: new Map()
  };

  await createImportedProjects(db, userId, backup, maps, counts, now);
  await createImportedTags(db, userId, backup, maps, counts, now);

  for (const todo of backup.data.todos) {
    await createImportedTodo(db, userId, todo, maps, counts, now);
  }

  const undoRecord = backup.data.undoRecord;
  const undoTodoId = undoRecord?.todoId ? maps.todos.get(undoRecord.todoId) : null;

  if (undoRecord && undoTodoId) {
    await db.undoRecord.create({
      data: {
        id: createEntityId("undo"),
        userId,
        action: "ai_create_todo",
        todoId: undoTodoId,
        originalInput: undoRecord.originalInput ?? null,
        payloadJson: optionalJsonInput(undoRecord.payloadJson),
        createdAt: toDate(undoRecord.createdAt, now),
        expiresAt: nullableDate(undoRecord.expiresAt),
        consumedAt: null
      }
    });
    counts.undoRecords += 1;
  }

  return counts;
}

export async function getWorkspaceBootstrap(prisma: PrismaClient, userId: string) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      disabledAt: null
    },
    select: {
      id: true,
      loginName: true,
      displayName: true,
      timezone: true,
      createdAt: true
    }
  });

  if (!user) {
    throw new ApiError("UNAUTHORIZED", "请先登录", 401);
  }

  const [settings, projects, tags, todos, undoRecord] = await Promise.all([
    getSettings(prisma, userId),
    prisma.project.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "asc" }
    }),
    prisma.tag.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "asc" }
    }),
    prisma.todo.findMany({
      where: { userId, deletedAt: null },
      include: todoInclude,
      orderBy: { updatedAt: "desc" }
    }),
    getLatestUndoRecord(prisma, userId)
  ]);

  return {
    user: toAuthUserDto(user, { includeCreatedAt: true }),
    settings,
    projects: projects.map(toProjectDto),
    tags: tags.map(toTagDto),
    todos: todos.map(toTodoDto),
    undoRecord,
    serverTime: new Date().toISOString()
  };
}

export async function exportWorkspace(prisma: PrismaClient, userId: string) {
  const [settings, projects, tags, todos, undoRecord] = await Promise.all([
    getSettings(prisma, userId),
    prisma.project.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "asc" }
    }),
    prisma.tag.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "asc" }
    }),
    prisma.todo.findMany({
      where: { userId, deletedAt: null },
      include: todoInclude,
      orderBy: { updatedAt: "desc" }
    }),
    getLatestUndoRecord(prisma, userId)
  ]);

  return {
    app: "SmartTodo" as const,
    exportedAt: new Date().toISOString(),
    settings,
    data: {
      todos: todos.map(toExportTodoDto),
      projects: projects.map((project: Project) => toProjectDto(project)),
      tags: tags.map((tag: Tag) => toTagDto(tag)),
      undoRecord
    }
  };
}

export async function importWorkspace(
  prisma: PrismaClient,
  userId: string,
  backup: WorkspaceBackupInput
) {
  const importedSettings = normalizeSettingsForImport(backup.settings);
  const retainedStorageKeys = collectImportStorageKeys(userId, backup);
  const replacedAttachments = await prisma.attachment.findMany({
    where: { userId },
    select: {
      storageProvider: true,
      storageKey: true
    }
  });

  const result = await prisma.$transaction(async (tx) => {
    const deleted = await hardDeleteWorkspaceData(tx, userId);

    if (importedSettings) {
      await upsertImportedSettings(tx, userId, importedSettings);
    }

    const imported = await importWorkspaceRows(tx, userId, backup);

    return {
      deleted,
      imported
    };
  });

  await removeReplacedLocalFiles(replacedAttachments, retainedStorageKeys);

  return {
    mode: "replace" as const,
    ...result
  };
}

export async function clearWorkspace(prisma: PrismaClient, userId: string) {
  return prisma.$transaction(async (tx) => {
    const result = await softDeleteWorkspaceData(tx, userId);

    return {
      ok: true,
      deletedAt: result.timestamps.deletedAt.toISOString(),
      purgeAfter: result.timestamps.purgeAfter.toISOString(),
      counts: result.counts
    };
  });
}
