import type { Todo, TodoPriority } from "./types";

const PRIORITY_WEIGHT: Record<TodoPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function getTime(value?: string | null) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

export function compareTodosByDueTime(a: Todo, b: Todo) {
  const aDue = getTime(a.dueAt);
  const bDue = getTime(b.dueAt);

  if (aDue !== null && bDue !== null && aDue !== bDue) return aDue - bDue;
  if (aDue !== null && bDue === null) return -1;
  if (aDue === null && bDue !== null) return 1;

  const priorityDelta =
    (PRIORITY_WEIGHT[a.priority] ?? PRIORITY_WEIGHT.medium) -
    (PRIORITY_WEIGHT[b.priority] ?? PRIORITY_WEIGHT.medium);
  if (priorityDelta !== 0) return priorityDelta;

  const aCreated = getTime(a.createdAt) ?? 0;
  const bCreated = getTime(b.createdAt) ?? 0;
  if (aCreated !== bCreated) return aCreated - bCreated;

  return a.title.localeCompare(b.title, "zh-CN");
}

export function sortTodosByDueTime(todos: Todo[]) {
  return [...todos].sort(compareTodosByDueTime);
}
