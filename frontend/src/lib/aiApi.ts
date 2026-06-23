import { apiRequest } from "./apiClient";
import type { AiOrganizeResult, Todo, UndoRecord } from "./types";

export function organizeTodo(input: string, timezone = "Asia/Shanghai") {
  return apiRequest<{
    todo: Todo;
    todos?: Todo[];
    aiResult: AiOrganizeResult;
    aiResults?: AiOrganizeResult[];
    undoRecord: UndoRecord;
  }>("/ai/todo-organizations", {
    method: "POST",
    body: JSON.stringify({ input, timezone }),
  });
}

export function polishMarkdown(markdown: string, timezone = "Asia/Shanghai") {
  return apiRequest<{ markdown: string }>("/ai/markdown-polish", {
    method: "POST",
    body: JSON.stringify({ markdown, timezone }),
  });
}

export function getLatestUndo() {
  return apiRequest<{ undoRecord: UndoRecord | null }>("/undo/latest");
}

export function applyUndo(undoId: string) {
  return apiRequest<{
    originalInput: string;
    deletedTodoId: string;
    deletedTodoIds?: string[];
  }>(`/undo/${encodeURIComponent(undoId)}/apply`, { method: "POST" });
}
