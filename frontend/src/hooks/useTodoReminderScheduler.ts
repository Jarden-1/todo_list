import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useSettings } from "../contexts/SettingsContext";
import { useTodo } from "../contexts/TodoContext";
import { formatDueDate } from "../lib/dateUtils";
import { playNotificationSound } from "../lib/notificationSound";
import {
  canUseSystemNotifications,
  findDueReminders,
} from "../lib/reminderScheduler";

const CHECK_INTERVAL_MS = 30_000;

function showSystemNotification(title: string, body: string) {
  if (!canUseSystemNotifications() || Notification.permission !== "granted") return;

  try {
    new Notification(title, {
      body,
      tag: `smarttodo:${title}:${body}`,
      silent: true,
    });
  } catch {
    // Browser notification support varies across local/dev contexts.
  }
}

export function useTodoReminderScheduler() {
  const { todos, markReminderSent, setSelectedTodoId } = useTodo();
  const { settings } = useSettings();
  const triggeredRef = useRef(new Set<string>());

  useEffect(() => {
    if (!settings.ringtone.enabled) return undefined;

    const check = () => {
      const dueReminders = findDueReminders(todos);
      if (dueReminders.length === 0) return;

      dueReminders.forEach(({ todo, reminder }) => {
        const key = `${todo.id}:${reminder.id}`;
        if (triggeredRef.current.has(key)) return;
        triggeredRef.current.add(key);

        markReminderSent(todo.id, reminder.id);

        const dueText = todo.dueAt ? formatDueDate(todo.dueAt) : "未设置截止时间";
        const description = reminder.reason ? `${reminder.reason} · ${dueText}` : dueText;

        playNotificationSound(settings.ringtone);
        showSystemNotification(`SmartTodo 提醒：${todo.title}`, description);

        toast(`提醒：${todo.title}`, {
          description,
          duration: 10000,
          action: {
            label: "查看",
            onClick: () => setSelectedTodoId(todo.id),
          },
        });
      });
    };

    check();
    const timer = window.setInterval(check, CHECK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [
    markReminderSent,
    setSelectedTodoId,
    settings.ringtone,
    settings.ringtone.enabled,
    todos,
  ]);
}
