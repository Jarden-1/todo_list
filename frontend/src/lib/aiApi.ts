import { apiRequest } from "./apiClient";
import type { AiOrganizeResult, Todo, UndoRecord } from "./types";

// Use the browser's actual timezone rather than hardcoding "Asia/Shanghai" —
// users in other regions would otherwise get wrong due-date inference.
const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export function organizeTodo(input: string, timezone = DEFAULT_TIMEZONE) {
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

export function polishMarkdown(markdown: string, timezone = DEFAULT_TIMEZONE) {
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
