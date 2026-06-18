import type { Prisma } from "@prisma/client";

export interface ReminderDto {
  id: string;
  remindAt: string;
  reason?: string;
  sentAt?: string;
  dismissedAt?: string;
}

export interface SubtaskDto {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface AttachmentDto {
  id: string;
  type: "image" | "link" | "file";
  name?: string;
  url: string;
  mimeType?: string;
  size?: number;
  createdAt: string;
}

export interface TodoDto {
  id: string;
  title: string;
  status: string;
  priority: string;
  projectId?: string;
  tagIds: string[];
  dueAt?: string;
  reminders: ReminderDto[];
  contentMarkdown: string;
  originalInput?: string;
  subtasks: SubtaskDto[];
  attachments: AttachmentDto[];
  aiMeta?: unknown;
  assignee?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface UndoRecordDto {
  id: string;
  action: "ai_create_todo";
  todoId: string;
  originalInput: string;
  createdAt: string;
  expiresAt?: string;
}

export const todoDtoInclude = {
  reminders: {
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" }
  },
  subtasks: {
    where: { deletedAt: null },
    orderBy: { position: "asc" }
  },
  attachments: {
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" }
  },
  todoTags: true
} satisfies Prisma.TodoInclude;

export type TodoWithDtoRelations = Prisma.TodoGetPayload<{
  include: typeof todoDtoInclude;
}>;

export type UndoRecordModel = Prisma.UndoRecordGetPayload<Record<string, never>>;

function dateToIso(date: Date | null | undefined): string | undefined {
  return date ? date.toISOString() : undefined;
}

function attachmentType(type: string): AttachmentDto["type"] {
  return type === "image" || type === "link" || type === "file" ? type : "file";
}

export function toTodoDto(todo: TodoWithDtoRelations): TodoDto {
  return {
    id: todo.id,
    title: todo.title,
    status: todo.status,
    priority: todo.priority,
    projectId: todo.projectId ?? undefined,
    tagIds: todo.todoTags.map((todoTag) => todoTag.tagId),
    dueAt: dateToIso(todo.dueAt),
    reminders: todo.reminders.map((reminder) => ({
      id: reminder.id,
      remindAt: reminder.remindAt.toISOString(),
      reason: reminder.reason ?? undefined,
      sentAt: dateToIso(reminder.sentAt),
      dismissedAt: dateToIso(reminder.dismissedAt)
    })),
    contentMarkdown: todo.contentMarkdown,
    originalInput: todo.originalInput ?? undefined,
    subtasks: todo.subtasks.map((subtask) => ({
      id: subtask.id,
      title: subtask.title,
      done: subtask.done,
      createdAt: subtask.createdAt.toISOString(),
      completedAt: dateToIso(subtask.completedAt)
    })),
    attachments: todo.attachments.map((attachment) => ({
      id: attachment.id,
      type: attachmentType(attachment.type),
      name: attachment.originalName,
      url: attachment.contentUrl,
      mimeType: attachment.mimeType ?? undefined,
      size: Number(attachment.sizeBytes),
      createdAt: attachment.createdAt.toISOString()
    })),
    aiMeta: todo.aiMeta ?? undefined,
    assignee: todo.assignee ?? undefined,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
    completedAt: dateToIso(todo.completedAt),
    cancelledAt: dateToIso(todo.cancelledAt)
  };
}

export function toUndoRecordDto(record: UndoRecordModel): UndoRecordDto {
  return {
    id: record.id,
    action: "ai_create_todo",
    todoId: record.todoId ?? "",
    originalInput: record.originalInput ?? "",
    createdAt: record.createdAt.toISOString(),
    expiresAt: dateToIso(record.expiresAt)
  };
}
