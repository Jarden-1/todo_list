import { z } from "zod";

export const fileIdParamsSchema = z.object({
  fileId: z.string().trim().min(1, "文件 ID 不能为空")
});

export const todoAttachmentParamsSchema = z.object({
  todoId: z.string().trim().min(1, "待办 ID 不能为空"),
  fileId: z.string().trim().min(1, "文件 ID 不能为空")
});

export const todoIdParamsSchema = z.object({
  todoId: z.string().trim().min(1, "待办 ID 不能为空")
});

export const uploadFieldsSchema = z.object({
  todoId: z.string().trim().min(1).optional(),
  type: z.enum(["image", "file"]).optional()
});

export const attachFilesBodySchema = z.object({
  attachmentIds: z
    .array(z.string().trim().min(1, "附件 ID 不能为空"))
    .min(1, "至少选择一个附件")
    .max(50, "一次最多绑定 50 个附件")
});

export type UploadFields = z.infer<typeof uploadFieldsSchema>;
