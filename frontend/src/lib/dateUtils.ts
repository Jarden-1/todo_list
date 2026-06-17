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

export function formatDueDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const date = parseISO(dateStr);
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

export function isOverdue(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  return isPast(parseISO(dateStr));
}

export function isTodayDate(dateStr: string | undefined): boolean {
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

export function getTimelineGroup(dueAt: string | undefined): TimelineGroup {
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

export function getDefaultDueTime(input: string): string | undefined {
  const now = new Date();
  const lower = input.toLowerCase();

  // Today patterns
  if (lower.includes("今天") || lower.includes("今日")) {
    const d = new Date(now);
    d.setHours(18, 0, 0, 0);
    return d.toISOString();
  }
  if (lower.includes("明天") || lower.includes("明日")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0);
    return d.toISOString();
  }
  // This week
  if (lower.includes("本周") || lower.includes("这周") || lower.includes("周五前")) {
    const d = new Date(now);
    const day = d.getDay();
    const daysUntilFriday = (5 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntilFriday);
    d.setHours(18, 0, 0, 0);
    return d.toISOString();
  }
  return undefined;
}
