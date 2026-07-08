import { apiRequest } from "./apiClient";
import type {
  DueAtPrecision,
  Project,
  Reminder,
  Tag,
  Todo,
  TodoPriority,
  TodoStatus,
} from "./types";

export interface TodoCreateInput {
  title: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  projectId?: string | null;
  dueAt?: string | null;
  dueAtPrecision?: DueAtPrecision;
  assignee?: string | null;
  contentMarkdown?: string;
  originalInput?: string | null;
  aiMeta?: unknown;
  tagIds?: string[];
  attachmentIds?: string[];
  reminders?: Array<Pick<Reminder, "remindAt" | "reason">>;
  subtasks?: Array<{ title: string; done?: boolean }>;
}

export type TodoPatchInput = Partial<
  Pick<Todo, "title" | "status" | "priority" | "aiMeta" | "tagIds">
> & {
  projectId?: string | null;
  dueAt?: string | null;
  dueAtPrecision?: DueAtPrecision;
  assignee?: string | null;
  contentMarkdown?: string | null;
  originalInput?: string | null;
  attachmentIds?: string[];
  reminders?: Array<Pick<Reminder, "remindAt" | "reason">>;
};

function encodeId(id: string) {
  return encodeURIComponent(id);
}

function normalizeTodoPatch(patch: TodoPatchInput): TodoPatchInput {
  const normalized = { ...patch };
  if ("projectId" in normalized && normalized.projectId === undefined) {
    normalized.projectId = null;
  }
  if ("dueAt" in normalized && normalized.dueAt === undefined) {
    normalized.dueAt = null;
  }
  // Keep dueAt and dueAtPrecision consistent: clearing the date means there is
  // no precision either, so the backend never ends up with a null date paired
  // with a stale "day"/"week" precision.
  if ("dueAt" in normalized && normalized.dueAt === null) {
    normalized.dueAtPrecision = "none";
  }
  if ("assignee" in normalized && normalized.assignee === undefined) {
    normalized.assignee = null;
  }
  if ("contentMarkdown" in normalized && normalized.contentMarkdown === undefined) {
    normalized.contentMarkdown = null;
  }
  if ("originalInput" in normalized && normalized.originalInput === undefined) {
    normalized.originalInput = null;
  }
  return normalized;
}

export function createTodo(input: TodoCreateInput) {
  return apiRequest<{ todo: Todo }>("/todos", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTodo(id: string, patch: TodoPatchInput) {
  return apiRequest<{ todo: Todo }>(`/todos/${encodeId(id)}`, {
    method: "PATCH",
    body: JSON.stringify(normalizeTodoPatch(patch)),
  });
}

export function deleteTodo(id: string) {
  return apiRequest<{ todo: Todo }>(`/todos/${encodeId(id)}`, {
    method: "DELETE",
  });
}

// Permanently (hard) delete multiple todos. Pass { all: true } to clear ALL
// completed todos, or { ids } for a specific set (single day / multiple days).
export function bulkDeleteTodos(scope: { all?: boolean; ids?: string[] }) {
  return apiRequest<{ deletedIds: string[] }>("/todos/bulk-delete", {
    method: "POST",
    body: JSON.stringify(scope),
  });
}

export function bulkMoveTodos(ids: string[], projectId: string | null) {
  return apiRequest<{ todos: Todo[] }>("/todos/bulk-move", {
    method: "POST",
    body: JSON.stringify({ ids, projectId }),
  });
}

export function duplicateTodo(id: string) {
  return apiRequest<{ todo: Todo }>(`/todos/${encodeId(id)}/duplicate`, {
    method: "POST",
  });
}

export function completeTodo(id: string) {
  return apiRequest<{ todo: Todo }>(`/todos/${encodeId(id)}/complete`, {
    method: "POST",
  });
}

export function uncompleteTodo(id: string) {
  return apiRequest<{ todo: Todo }>(`/todos/${encodeId(id)}/uncomplete`, {
    method: "POST",
  });
}

export function cancelTodo(id: string) {
  return apiRequest<{ todo: Todo }>(`/todos/${encodeId(id)}/cancel`, {
    method: "POST",
  });
}

export function restoreTodo(id: string, status?: TodoStatus) {
  return apiRequest<{ todo: Todo }>(`/todos/${encodeId(id)}/restore`, {
    method: "POST",
    body: JSON.stringify(status ? { status } : {}),
  });
}

export function createSubtask(todoId: string, title: string) {
  return apiRequest<{ todo: Todo }>(`/todos/${encodeId(todoId)}/subtasks`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export function updateSubtask(
  todoId: string,
  subtaskId: string,
  patch: { title?: string; done?: boolean }
) {
  return apiRequest<{ todo: Todo }>(
    `/todos/${encodeId(todoId)}/subtasks/${encodeId(subtaskId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    }
  );
}

export function deleteSubtask(todoId: string, subtaskId: string) {
  return apiRequest<{ todo: Todo }>(
    `/todos/${encodeId(todoId)}/subtasks/${encodeId(subtaskId)}`,
    {
      method: "DELETE",
    }
  );
}

export function markReminderSent(todoId: string, reminderId: string, sentAt?: string) {
  return apiRequest<{ reminder: Reminder }>(
    `/todos/${encodeId(todoId)}/reminders/${encodeId(reminderId)}/mark-sent`,
    {
      method: "POST",
      body: JSON.stringify(sentAt ? { sentAt } : {}),
    }
  );
}

export function createProject(name: string, color?: string) {
  return apiRequest<{ project: Project }>("/projects", {
    method: "POST",
    body: JSON.stringify({ name, color }),
  });
}

export function updateProject(id: string, data: { name?: string; color?: string | null }) {
  return apiRequest<{ project: Project }>(`/projects/${encodeId(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteProject(id: string, mode: "move" | "delete" = "move") {
  return apiRequest<{ project: Project }>(`/projects/${encodeId(id)}?mode=${mode}`, {
    method: "DELETE",
  });
}

export function createTag(name: string, color?: string) {
  return apiRequest<{ tag: Tag }>("/tags", {
    method: "POST",
    body: JSON.stringify({ name, color }),
  });
}
