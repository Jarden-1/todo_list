import type { Reminder, Todo } from "./types";

export interface DueReminder {
  todo: Todo;
  reminder: Reminder;
}

function getTimestamp(value?: string) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function findDueReminders(todos: Todo[], now = Date.now()): DueReminder[] {
  return todos.flatMap((todo) => {
    if (todo.status === "done" || todo.status === "cancelled") return [];

    return todo.reminders
      .filter((reminder) => {
        if (reminder.sentAt || reminder.dismissedAt) return false;
        const remindAt = getTimestamp(reminder.remindAt);
        if (remindAt === null) return false;
        return remindAt <= now;
      })
      .map((reminder) => ({ todo, reminder }));
  });
}

export function canUseSystemNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function ensureNotificationPermission() {
  if (!canUseSystemNotifications()) return "unsupported" as const;
  if (Notification.permission === "granted") return "granted" as const;
  if (Notification.permission === "denied") return "denied" as const;
  return Notification.requestPermission();
}
