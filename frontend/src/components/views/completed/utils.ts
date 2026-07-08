// Shared types, constants, and pure utility functions for the Completed view.
// Extracted from CompletedView.tsx to keep the main component focused on
// state management and composition.
import {
  endOfMonth,
  endOfWeek,
  isToday as isDateToday,
  isWithinInterval,
  isYesterday as isDateYesterday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { Todo } from "../../../lib/types";

export type DateFilter = "all" | "today" | "yesterday" | "week" | "month" | "custom";

export type PendingDelete =
  | { kind: "all"; count: number }
  | { kind: "day"; dateKey: string; label: string; ids: string[] }
  | { kind: "selectedDays"; ids: string[]; dayCount: number };

export const COLLAPSED_KEY = "smarttodo.completed.collapsedDays";

export const DATE_FILTER_CHIPS: { value: DateFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "today", label: "今天" },
  { value: "yesterday", label: "昨天" },
  { value: "week", label: "本周" },
  { value: "month", label: "本月" },
];

export function loadCollapsedDays(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(COLLAPSED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(
      Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []
    );
  } catch {
    return new Set();
  }
}

export function persistCollapsedDays(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...set]));
  } catch {
    // ignore quota / serialization errors
  }
}

// Strip common markdown syntax so search can match the readable text. Good
// enough for search — doesn't need to be a perfect renderer.
export function stripMarkdownSyntax(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^[#>\-*+]\s+/gm, "")
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[*_~`#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildSearchHaystack(todo: Todo): string {
  const title = todo.title.toLowerCase();
  const content = stripMarkdownSyntax(todo.contentMarkdown ?? "").toLowerCase();
  return `${title} ${content}`;
}

export function dateKeyForTodo(todo: Todo): string {
  return (todo.completedAt ?? todo.updatedAt).slice(0, 10);
}

export function isTodoInDateRange(
  todo: Todo,
  filter: DateFilter,
  customStart: string | null,
  customEnd: string | null
): boolean {
  if (filter === "all") return true;
  const completed = parseISO(todo.completedAt ?? todo.updatedAt);
  if (filter === "today") return isDateToday(completed);
  if (filter === "yesterday") return isDateYesterday(completed);
  if (filter === "week") {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    return isWithinInterval(completed, { start, end });
  }
  if (filter === "month") {
    return isWithinInterval(completed, {
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date()),
    });
  }
  // custom — datetime-local is a precise instant, so no end-of-day padding.
  if (!customStart && !customEnd) return true;
  const start = customStart ? parseISO(customStart) : null;
  const end = customEnd ? parseISO(customEnd) : null;
  if (start && end) {
    return isWithinInterval(completed, { start, end });
  }
  if (start) return completed >= start;
  if (end) return completed <= end;
  return true;
}
