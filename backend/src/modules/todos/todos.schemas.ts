import { z } from "zod";

const isoDateString = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "必须是有效的 ISO 8601 时间字符串"
  });

const idString = z.string().trim().min(1).max(200);
const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();

export const todoStatusSchema = z.enum(["todo", "doing", "done", "cancelled"]);
export const todoPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export const dueAtPrecisionSchema = z.enum(["datetime", "day", "week", "none"]);

export const projectIdParamsSchema = z.object({
  projectId: idString
});

export const tagIdParamsSchema = z.object({
  tagId: idString
});

export const todoIdParamsSchema = z.object({
  todoId: idString
});

export const bulkDeleteTodosSchema = z
  .object({
    // When true, delete ALL completed todos (ignores ids).
    all: z.boolean().optional(),
    // Explicit ids to permanently delete (single / per-day / multi-day).
    ids: z.array(idString).max(2000).optional()
  })
  .strict()
  .refine((value) => value.all === true || (value.ids?.length ?? 0) > 0, {
    message: "必须提供 all=true 或非空的 ids"
  });

export const subtaskIdParamsSchema = todoIdParamsSchema.extend({
  subtaskId: idString
});

export const reminderIdParamsSchema = todoIdParamsSchema.extend({
  reminderId: idString
});

export const projectCreateSchema = z
  .object({
    name: z.string().trim().min(1, "项目名不能为空").max(100),
    color: nullableText(40)
  })
  .strict();

export const projectPatchSchema = z
  .object({
    name: z.string().trim().min(1, "项目名不能为空").max(100).optional(),
    color: nullableText(40)
  })
  .strict();

export const tagCreateSchema = z
  .object({
    name: z.string().trim().min(1, "标签名不能为空").max(100),
    color: nullableText(40)
  })
  .strict();

export const tagPatchSchema = z
  .object({
    name: z.string().trim().min(1, "标签名不能为空").max(100).optional(),
    color: nullableText(40)
  })
  .strict();

export const reminderInputSchema = z
  .object({
    remindAt: isoDateString,
    reason: nullableText(200),
    kind: z.string().trim().min(1).max(40).optional()
  })
  .strict();

export const subtaskInputSchema = z
  .object({
    title: z.string().trim().min(1, "子任务标题不能为空").max(200),
    done: z.boolean().optional()
  })
  .strict();

export const todoCreateSchema = z
  .object({
    title: z.string().trim().min(1, "标题不能为空").max(200),
    status: todoStatusSchema.optional(),
    priority: todoPrioritySchema.optional(),
    projectId: idString.nullable().optional(),
    dueAt: isoDateString.nullable().optional(),
    dueAtPrecision: dueAtPrecisionSchema.optional(),
    assignee: nullableText(120),
    contentMarkdown: z.string().max(1024 * 1024).optional(),
    originalInput: nullableText(5000),
    aiMeta: z.unknown().optional(),
    tagIds: z.array(idString).optional(),
    attachmentIds: z.array(idString).optional(),
    reminders: z.array(reminderInputSchema).optional(),
    subtasks: z.array(subtaskInputSchema).optional()
  })
  .strict();

export const todoPatchSchema = z
  .object({
    title: z.string().trim().min(1, "标题不能为空").max(200).optional(),
    status: todoStatusSchema.optional(),
    priority: todoPrioritySchema.optional(),
    projectId: idString.nullable().optional(),
    dueAt: isoDateString.nullable().optional(),
    dueAtPrecision: dueAtPrecisionSchema.optional(),
    assignee: nullableText(120),
    contentMarkdown: z.string().max(1024 * 1024).nullable().optional(),
    originalInput: nullableText(5000),
    aiMeta: z.unknown().optional(),
    tagIds: z.array(idString).optional(),
    attachmentIds: z.array(idString).optional(),
    reminders: z.array(reminderInputSchema).optional()
  })
  .strict();

export const todosQuerySchema = z
  .object({
    status: todoStatusSchema.optional(),
    projectId: idString.optional(),
    priority: todoPrioritySchema.optional(),
    dueFrom: isoDateString.optional(),
    dueTo: isoDateString.optional(),
    search: z.string().trim().max(200).optional(),
    includeDeleted: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true")
  })
  .strict();

export const todoRestoreSchema = z
  .object({
    status: todoStatusSchema.optional()
  })
  .strict();

export const subtaskCreateSchema = z
  .object({
    title: z.string().trim().min(1, "子任务标题不能为空").max(200)
  })
  .strict();

export const subtaskPatchSchema = z
  .object({
    title: z.string().trim().min(1, "子任务标题不能为空").max(200).optional(),
    done: z.boolean().optional()
  })
  .strict();

export const dueRemindersQuerySchema = z
  .object({
    before: isoDateString.optional()
  })
  .strict();

export const markReminderSentSchema = z
  .object({
    sentAt: isoDateString.optional()
  })
  .strict();

export const dismissReminderSchema = z
  .object({
    dismissedAt: isoDateString.optional()
  })
  .strict();

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectPatchInput = z.infer<typeof projectPatchSchema>;
export type TagCreateInput = z.infer<typeof tagCreateSchema>;
export type TagPatchInput = z.infer<typeof tagPatchSchema>;
export type TodoCreateInput = z.infer<typeof todoCreateSchema>;
export type TodoPatchInput = z.infer<typeof todoPatchSchema>;
export type TodosQueryInput = z.infer<typeof todosQuerySchema>;
export type TodoRestoreInput = z.infer<typeof todoRestoreSchema>;
export type SubtaskCreateInput = z.infer<typeof subtaskCreateSchema>;
export type SubtaskPatchInput = z.infer<typeof subtaskPatchSchema>;
export type SubtaskInput = z.infer<typeof subtaskInputSchema>;
export type ReminderInput = z.infer<typeof reminderInputSchema>;
