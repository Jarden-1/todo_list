import { z } from "zod";

const isoDateString = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "必须是有效的 ISO 8601 时间字符串"
  });

const idString = z.string().trim().min(1).max(200);
const nullableText = (max: number) =>
  z.string().trim().max(max).nullable().optional();

const backupProjectSchema = z
  .object({
    id: idString.optional(),
    name: z.string().trim().min(1, "项目名不能为空").max(100),
    color: nullableText(40),
    createdAt: isoDateString.optional(),
    updatedAt: isoDateString.optional()
  })
  .passthrough();

const backupTagSchema = z
  .object({
    id: idString.optional(),
    name: z.string().trim().min(1, "标签名不能为空").max(100),
    color: nullableText(40),
    createdAt: isoDateString.optional(),
    updatedAt: isoDateString.optional()
  })
  .passthrough();

const backupReminderSchema = z
  .object({
    id: idString.optional(),
    remindAt: isoDateString,
    reason: nullableText(200),
    kind: z.string().trim().min(1).max(40).optional(),
    createdAt: isoDateString.optional(),
    sentAt: isoDateString.nullable().optional(),
    dismissedAt: isoDateString.nullable().optional()
  })
  .passthrough();

const backupSubtaskSchema = z
  .object({
    id: idString.optional(),
    title: z.string().trim().min(1, "子任务标题不能为空").max(200),
    done: z.boolean().optional().default(false),
    position: z.number().int().min(0).optional(),
    createdAt: isoDateString.optional(),
    completedAt: isoDateString.nullable().optional()
  })
  .passthrough();

const backupAttachmentSchema = z
  .object({
    id: idString.optional(),
    type: z.enum(["image", "link", "file"]).optional().default("file"),
    name: z.string().trim().max(255).optional(),
    url: z.string().trim().max(2000).optional(),
    mimeType: z.string().trim().max(255).nullable().optional(),
    size: z.number().int().min(0).optional(),
    todoId: idString.nullable().optional(),
    createdAt: isoDateString.optional(),
    storageProvider: z.string().trim().max(40).optional(),
    storageKey: z.string().trim().max(2000).optional(),
    checksumSha256: z.string().trim().max(128).nullable().optional()
  })
  .passthrough();

const backupTodoSchema = z
  .object({
    id: idString.optional(),
    title: z.string().trim().min(1, "标题不能为空").max(200),
    status: z.enum(["todo", "doing", "done", "cancelled"]).optional().default("todo"),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
    projectId: idString.nullable().optional(),
    tagIds: z.array(idString).optional().default([]),
    dueAt: isoDateString.nullable().optional(),
    reminders: z.array(backupReminderSchema).optional().default([]),
    contentMarkdown: z.string().max(1024 * 1024).optional().default(""),
    originalInput: nullableText(5000),
    subtasks: z.array(backupSubtaskSchema).optional().default([]),
    attachments: z.array(backupAttachmentSchema).optional().default([]),
    aiMeta: z.unknown().optional(),
    assignee: nullableText(120),
    createdAt: isoDateString.optional(),
    updatedAt: isoDateString.optional(),
    completedAt: isoDateString.nullable().optional(),
    cancelledAt: isoDateString.nullable().optional()
  })
  .passthrough();

const backupUndoRecordSchema = z
  .object({
    id: idString.optional(),
    action: z.literal("ai_create_todo"),
    todoId: idString.optional(),
    originalInput: z.string().max(5000).optional(),
    payloadJson: z.unknown().optional(),
    createdAt: isoDateString.optional(),
    expiresAt: isoDateString.nullable().optional()
  })
  .passthrough();

export const workspaceBackupSchema = z
  .object({
    app: z.literal("SmartTodo"),
    exportedAt: isoDateString.optional(),
    settings: z.unknown().optional(),
    data: z
      .object({
        todos: z.array(backupTodoSchema).optional().default([]),
        projects: z.array(backupProjectSchema).optional().default([]),
        tags: z.array(backupTagSchema).optional().default([]),
        undoRecord: backupUndoRecordSchema.nullable().optional().default(null)
      })
      .passthrough()
  })
  .passthrough();

const workspaceImportEnvelopeSchema = z
  .object({
    mode: z.literal("replace").optional().default("replace"),
    backup: workspaceBackupSchema
  })
  .strict();

export const workspaceImportSchema = z.union([
  workspaceImportEnvelopeSchema,
  workspaceBackupSchema.transform((backup) => ({
    mode: "replace" as const,
    backup
  }))
]);

export type WorkspaceImportInput = z.infer<typeof workspaceImportSchema>;
export type WorkspaceBackupInput = z.infer<typeof workspaceBackupSchema>;
export type BackupTodoInput = z.infer<typeof backupTodoSchema>;
export type BackupAttachmentInput = z.infer<typeof backupAttachmentSchema>;
