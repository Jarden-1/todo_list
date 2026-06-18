import type { Attachment } from "@prisma/client";

export interface FileDto {
  id: string;
  type: "image" | "file";
  name: string;
  url: string;
  mimeType: string | null;
  size: number;
  todoId: string | null;
  createdAt: string;
}

export function toFileDto(attachment: Attachment): FileDto {
  return {
    id: attachment.id,
    type: attachment.type === "image" ? "image" : "file",
    name: attachment.originalName,
    url: attachment.contentUrl,
    mimeType: attachment.mimeType,
    size: Number(attachment.sizeBytes),
    todoId: attachment.todoId,
    createdAt: attachment.createdAt.toISOString()
  };
}
