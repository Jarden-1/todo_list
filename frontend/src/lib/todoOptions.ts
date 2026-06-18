import type { TodoPriority, TodoStatus } from "./types";

export const PRIORITY_OPTIONS: { value: TodoPriority; label: string; color: string }[] = [
  { value: "urgent", label: "紧急", color: "text-red-500" },
  { value: "high", label: "高", color: "text-amber-500" },
  { value: "medium", label: "普通", color: "text-primary" },
  { value: "low", label: "低", color: "text-muted-foreground" },
];

export const STATUS_OPTIONS: { value: TodoStatus; label: string }[] = [
  { value: "todo", label: "待办" },
  { value: "doing", label: "进行中" },
  { value: "done", label: "已完成" },
  { value: "cancelled", label: "已取消" },
];
