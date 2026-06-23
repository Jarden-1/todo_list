import { z } from "zod";

export const todoPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export const confidenceValueSchema = z.enum(["low", "medium", "high"]);

export const todoOrganizationRequestSchema = z
  .object({
    input: z.string().trim().min(1).max(20000),
    timezone: z.string().trim().min(1).max(100).default("Asia/Shanghai")
  })
  .strict();

export const markdownPolishRequestSchema = z
  .object({
    markdown: z.string().trim().min(1).max(1024 * 1024),
    timezone: z.string().trim().min(1).max(100).default("Asia/Shanghai")
  })
  .strict();

export const aiReminderResultSchema = z
  .object({
    remindAt: z.string().trim().min(1),
    reason: z.string().trim().max(300).optional()
  })
  .strict();

export const aiConfidenceSchema = z
  .object({
    dueAt: confidenceValueSchema.optional(),
    priority: confidenceValueSchema.optional(),
    projectName: confidenceValueSchema.optional()
  })
  .strict();

export const aiTodoResultSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    projectName: z.string().trim().min(1).max(120).optional(),
    priority: todoPrioritySchema,
    dueAt: z.string().trim().min(1).optional(),
    reminders: z.array(aiReminderResultSchema).max(20).optional(),
    tags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
    subtasks: z.array(z.string().trim().min(1).max(200)).max(100).optional(),
    contentMarkdown: z.string().max(1024 * 1024).optional(),
    confidence: aiConfidenceSchema.optional(),
    warnings: z.array(z.string().trim().min(1).max(500)).max(20).optional()
  })
  .strict();

// The model is asked to return { todos: [...] }. We accept 1..N todos.
export const aiTodoResultListSchema = z
  .object({
    todos: z.array(aiTodoResultSchema).min(1).max(20)
  })
  .strict();

export const undoParamsSchema = z
  .object({
    undoId: z.string().trim().min(1).max(200)
  })
  .strict();

export type TodoOrganizationRequest = z.infer<
  typeof todoOrganizationRequestSchema
>;
export type MarkdownPolishRequest = z.infer<typeof markdownPolishRequestSchema>;
export type AiTodoResult = z.infer<typeof aiTodoResultSchema>;
export type AiTodoResultList = z.infer<typeof aiTodoResultListSchema>;
export type UndoParams = z.infer<typeof undoParamsSchema>;
