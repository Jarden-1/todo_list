import { nanoid } from "nanoid";
import {
  parseMarkdownTasks,
  syncSubtasksFromMarkdown,
} from "./markdownTasks";
import type {
  AiOrganizeResult,
  Project,
  Reminder,
  Subtask,
  Tag,
  Todo,
  TodoAiMeta,
  TodoStatus,
  UndoRecord,
} from "./types";

export type TodoCreateInput = Partial<Todo> & { title: string };

const DEFAULT_PROJECT_COLOR = "#6366F1";

export function createTodo(input: TodoCreateInput, now = new Date().toISOString()): Todo {
  const contentMarkdown = input.contentMarkdown ?? "";
  const markdownSubtasks = parseMarkdownTasks(contentMarkdown);

  return {
    id: nanoid(),
    title: input.title,
    status: input.status ?? "todo",
    priority: input.priority ?? "medium",
    projectId: input.projectId,
    tagIds: input.tagIds ?? [],
    dueAt: input.dueAt,
    reminders: input.reminders ?? [],
    contentMarkdown,
    originalInput: input.originalInput,
    subtasks: input.subtasks ?? (
      markdownSubtasks.length > 0
        ? syncSubtasksFromMarkdown(contentMarkdown, [], now)
        : []
    ),
    attachments: input.attachments ?? [],
    aiMeta: input.aiMeta,
    assignee: input.assignee,
    createdAt: now,
    updatedAt: now,
  };
}

export function applyTodoUpdates(todo: Todo, updates: Partial<Todo>, now = new Date().toISOString()) {
  const next: Todo = { ...todo, ...updates, updatedAt: now };

  if (updates.contentMarkdown !== undefined && updates.subtasks === undefined) {
    const markdownTasks = parseMarkdownTasks(updates.contentMarkdown);
    const hadMarkdownTasks = parseMarkdownTasks(todo.contentMarkdown).length > 0;
    if (markdownTasks.length > 0 || hadMarkdownTasks) {
      next.subtasks = syncSubtasksFromMarkdown(updates.contentMarkdown, todo.subtasks, now);
    }
  }

  return next;
}

export function createProject(
  name: string,
  color = DEFAULT_PROJECT_COLOR,
  now = new Date().toISOString()
): Project {
  return {
    id: nanoid(),
    name,
    color,
    createdAt: now,
    updatedAt: now,
  };
}

export function createTag(name: string, color = DEFAULT_PROJECT_COLOR): Tag {
  return { id: nanoid(), name, color };
}

export function createSubtask(title: string, now = new Date().toISOString()): Subtask {
  return {
    id: nanoid(),
    title,
    done: false,
    createdAt: now,
  };
}

export function createRemindersFromAi(
  reminders: NonNullable<AiOrganizeResult["reminders"]> = []
): Reminder[] {
  return reminders.map((reminder) => ({
    id: nanoid(),
    remindAt: reminder.remindAt,
    reason: reminder.reason,
  }));
}

export function createSubtasksFromAi(
  subtasks: NonNullable<AiOrganizeResult["subtasks"]> = [],
  now = new Date().toISOString()
): Subtask[] {
  return subtasks.map((title) => createSubtask(title, now));
}

export function createAiMeta(result: AiOrganizeResult, now = new Date().toISOString()): TodoAiMeta {
  return {
    aiGenerated: true,
    aiModel: "gpt-4o",
    aiCreatedAt: now,
    confidence: result.confidence,
    warnings: result.warnings,
  };
}

export function createUndoRecord(
  todoId: string,
  originalInput: string,
  now = new Date().toISOString()
): UndoRecord {
  const timestamp = Number.isFinite(Date.parse(now)) ? Date.parse(now) : Date.now();

  return {
    id: nanoid(),
    action: "ai_create_todo",
    todoId,
    originalInput,
    createdAt: now,
    expiresAt: new Date(timestamp + 5 * 60 * 1000).toISOString(),
  };
}

export function applyTodoStatus(
  todo: Todo,
  status: TodoStatus,
  now = new Date().toISOString()
): Todo {
  if (status === "done") {
    return { ...todo, status, completedAt: now, updatedAt: now };
  }

  if (status === "cancelled") {
    return { ...todo, status, cancelledAt: now, updatedAt: now };
  }

  return {
    ...todo,
    status,
    completedAt: status === "todo" ? undefined : todo.completedAt,
    updatedAt: now,
  };
}
