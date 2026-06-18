import { apiRequest } from "./apiClient";
import type { Attachment } from "./types";

export function uploadFile(
  file: File,
  options: { todoId?: string; type?: "image" | "file" } = {}
) {
  const formData = new FormData();
  formData.append("file", file);
  if (options.todoId) formData.append("todoId", options.todoId);
  if (options.type) formData.append("type", options.type);

  return apiRequest<{ file: Attachment }>("/files", {
    method: "POST",
    body: formData,
  });
}
