import type { TodoStatus } from "./types";

// A todo is "active" when it hasn't been finished (done) or abandoned
// (cancelled). This check is used in 9+ places across views, sidebar, and
// cards to filter out completed/cancelled items from active lists.
export function isActiveStatus(status: TodoStatus): boolean {
  return status !== "done" && status !== "cancelled";
}
