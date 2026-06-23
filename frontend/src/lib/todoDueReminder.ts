import { formatDueDate, isOverdue, isTodayDate } from "./dateUtils";
import type { Todo } from "./types";

export function toDatetimeLocalValue(value?: string | null) {
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

  // Respect dueAtPrecision so day/week todos don't leak the 23:59 placeholder.
  const precision = todo.dueAtPrecision ?? "datetime";
  const dueText = formatDueDate(todo.dueAt, precision);
  // For day/week precision dueText already reads as a phrase ("今天截止" /
  // "本周内"), so don't prefix it again; only the exact-time variant needs a
  // descriptive prefix.
  const exact = precision === "datetime";

  if (!inactive && isOverdue(todo.dueAt)) {
    return {
      tone: "danger" as const,
      title: exact ? `已逾期 · ${dueText}` : `已逾期（${dueText}）`,
      description: "可以在截止时间区域快速延期或重新选择时间。",
    };
  }

  if (!inactive && isTodayDate(todo.dueAt)) {
    return {
      tone: "warning" as const,
      title: exact ? `今天截止 · ${dueText}` : dueText,
    };
  }

  if (inactive) {
    return {
      tone: "muted" as const,
      title: exact ? `截止时间 · ${dueText}` : dueText,
    };
  }

  return {
    tone: "primary" as const,
    title: exact ? `截止时间提醒 · ${dueText}` : `截止 · ${dueText}`,
  };
}

// AI may attach due-time related warnings at creation time (e.g. "无明确截止时间",
// "部分时间信息模糊", "截止时间已默认解析为…"). These describe the state at
// creation. Once the user has set/edited a due date they are no longer true, so
// callers pass `hasDueAt` to drop ALL time-related warnings instead of matching a
// fixed list of phrasings.
export function isStaleDueWarning(warning: string, hasDueAt = false) {
  if (/截止时间已默认解析|默认解析为|时间已默认解析/.test(warning)) return true;
  if (hasDueAt && /(截止|时间|due)/i.test(warning)) return true;
  return false;
}
