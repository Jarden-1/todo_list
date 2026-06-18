import { formatDateTime, isOverdue, isTodayDate } from "./dateUtils";
import type { Todo } from "./types";

export function toDatetimeLocalValue(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}

export function getDueReminder(todo: Todo) {
  const inactive = todo.status === "done" || todo.status === "cancelled";

  if (!todo.dueAt) {
    return {
      tone: "muted" as const,
      title: "未设置截止时间",
    };
  }

  const dueText = formatDateTime(todo.dueAt);

  if (!inactive && isOverdue(todo.dueAt)) {
    return {
      tone: "danger" as const,
      title: `已逾期 · ${dueText}`,
      description: "可以在截止时间区域快速延期或重新选择时间。",
    };
  }

  if (!inactive && isTodayDate(todo.dueAt)) {
    return {
      tone: "warning" as const,
      title: `今天截止 · ${dueText}`,
    };
  }

  if (inactive) {
    return {
      tone: "muted" as const,
      title: `截止时间 · ${dueText}`,
    };
  }

  return {
    tone: "primary" as const,
    title: `截止时间提醒 · ${dueText}`,
  };
}

export function isStaleDueWarning(warning: string) {
  return /截止时间已默认解析|默认解析为|时间已默认解析/.test(warning);
}
