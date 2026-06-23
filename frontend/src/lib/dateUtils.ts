// SmartTodo - Date Utilities
import {
  format,
  isToday,
  isTomorrow,
  isYesterday,
  isPast,
  isThisWeek,
  isFuture,
  parseISO,
  addWeeks,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import type { DueAtPrecision } from "./types";

// Format a due date honoring its precision. For "day"/"week" precision the
// time-of-day is hidden (it is only a sorting placeholder, e.g. 23:59).
export function formatDueDate(
  dateStr: string | null | undefined,
  precision: DueAtPrecision = "datetime"
): string {
  if (!dateStr || precision === "none") return "";
  const date = parseISO(dateStr);

  if (precision === "week") {
    if (isThisWeek(date, { weekStartsOn: 1 })) return "本周内";
    return `${format(date, "M月d日", { locale: zhCN })}当周`;
  }

  if (precision === "day") {
    if (isToday(date)) return "今天截止";
    if (isTomorrow(date)) return "明天截止";
    if (isYesterday(date)) return "昨天截止";
    return `${format(date, "M月d日", { locale: zhCN })}截止`;
  }

  // datetime — show the exact time
  if (isToday(date)) return `今天 ${format(date, "HH:mm")}`;
  if (isTomorrow(date)) return `明天 ${format(date, "HH:mm")}`;
  if (isYesterday(date)) return `昨天 ${format(date, "HH:mm")}`;
  return format(date, "M月d日 HH:mm", { locale: zhCN });
}

export function formatRelativeDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "今天";
  if (isTomorrow(date)) return "明天";
  if (isYesterday(date)) return "昨天";
  return format(date, "M月d日", { locale: zhCN });
}

export function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return isPast(parseISO(dateStr));
}

export function isTodayDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return isToday(parseISO(dateStr));
}

export type TimelineGroup =
  | "overdue"
  | "today"
  | "tomorrow"
  | "this_week"
  | "next_week"
  | "future"
  | "no_due";

export function getTimelineGroup(dueAt: string | null | undefined): TimelineGroup {
  if (!dueAt) return "no_due";
  const date = parseISO(dueAt);
  if (isPast(date) && !isToday(date)) return "overdue";
  if (isToday(date)) return "today";
  if (isTomorrow(date)) return "tomorrow";
  if (isThisWeek(date, { weekStartsOn: 1 })) return "this_week";
  const nextWeekStart = startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 });
  const nextWeekEnd = endOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 });
  if (date >= nextWeekStart && date <= nextWeekEnd) return "next_week";
  if (isFuture(date)) return "future";
  return "no_due";
}

export const timelineGroupLabels: Record<TimelineGroup, string> = {
  overdue: "已逾期",
  today: "今天",
  tomorrow: "明天",
  this_week: "本周",
  next_week: "下周",
  future: "未来",
  no_due: "无截止时间",
};

export function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), "yyyy年M月d日 HH:mm", { locale: zhCN });
}

export function formatShortDate(dateStr: string): string {
  return format(parseISO(dateStr), "M月d日", { locale: zhCN });
}

export function formatTime(dateStr: string): string {
  return format(parseISO(dateStr), "HH:mm");
}

// End of the given day (23:59) — used as the sort/expiry placeholder for
// "day"-precision due dates.
export function endOfDayIso(base: Date = new Date()): string {
  const d = new Date(base);
  d.setHours(23, 59, 0, 0);
  return d.toISOString();
}

// End of the current week (Sunday 23:59) — placeholder for "week" precision.
export function endOfWeekIso(base: Date = new Date()): string {
  const d = endOfWeek(base, { weekStartsOn: 1 });
  d.setHours(23, 59, 0, 0);
  return d.toISOString();
}
