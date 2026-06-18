import { useCallback, useEffect, useRef, useState } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { useTodo } from "../contexts/TodoContext";
import { playNotificationSound } from "../lib/notificationSound";
import {
  fetchUnreadNotifications,
  getApiErrorMessage,
  markNotificationClicked,
  markNotificationDelivered,
  markNotificationRead,
  type SmartTodoNotification,
} from "../lib/pushNotifications";

const NOTIFICATION_POLL_INTERVAL_MS = 60_000;

interface UseNotificationsOptions {
  onOpenTodo: (todoId: string) => void;
}

export function useNotifications({ onOpenTodo }: UseNotificationsOptions) {
  const { settings } = useSettings();
  const { setSelectedTodoId } = useTodo();
  const [queue, setQueue] = useState<SmartTodoNotification[]>([]);
  const [activeNotification, setActiveNotification] = useState<SmartTodoNotification | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const seenNotificationIdsRef = useRef(new Set<string>());
  const deliveredNotificationIdsRef = useRef(new Set<string>());

  const enqueueNotifications = useCallback((notifications: SmartTodoNotification[]) => {
    setQueue((prev) => {
      const queuedIds = new Set(prev.map((notification) => notification.id));
      const next = [...prev];

      notifications.forEach((notification) => {
        if (notification.type !== "reminder") return;
        if (notification.readAt) return;
        if (seenNotificationIdsRef.current.has(notification.id)) return;
        if (queuedIds.has(notification.id)) return;

        seenNotificationIdsRef.current.add(notification.id);
        queuedIds.add(notification.id);
        next.push(notification);
      });

      return next;
    });
  }, []);

  const refreshUnreadNotifications = useCallback(
    async (signal?: AbortSignal) => {
      if (!settings.ringtone.enabled) return;

      try {
        const notifications = await fetchUnreadNotifications(signal);
        enqueueNotifications(notifications);
        setLastError(null);
      } catch (error) {
        if (signal?.aborted) return;
        setLastError(getApiErrorMessage(error));
      }
    },
    [enqueueNotifications, settings.ringtone.enabled]
  );

  useEffect(() => {
    if (!settings.ringtone.enabled) {
      setQueue([]);
      setActiveNotification(null);
      return undefined;
    }

    const controller = new AbortController();
    void refreshUnreadNotifications(controller.signal);
    const timer = window.setInterval(() => {
      void refreshUnreadNotifications();
    }, NOTIFICATION_POLL_INTERVAL_MS);

    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [refreshUnreadNotifications, settings.ringtone.enabled]);

  useEffect(() => {
    if (activeNotification || queue.length === 0) return;
    const [nextNotification, ...rest] = queue;
    setActiveNotification(nextNotification);
    setQueue(rest);
  }, [activeNotification, queue]);

  useEffect(() => {
    if (!activeNotification) return;
    if (!deliveredNotificationIdsRef.current.has(activeNotification.id)) {
      deliveredNotificationIdsRef.current.add(activeNotification.id);
      void markNotificationDelivered(activeNotification.id).catch(() => {});
    }

    if (settings.ringtone.enabled) {
      playNotificationSound(settings.ringtone);
    }
  }, [activeNotification, settings.ringtone]);

  const openTodoFromNotification = useCallback(
    async (notificationId?: string | null, todoId?: string | null) => {
      if (todoId) {
        setSelectedTodoId(todoId);
        onOpenTodo(todoId);
      }

      if (notificationId) {
        await markNotificationClicked(notificationId, true).catch(() => {});
      }
    },
    [onOpenTodo, setSelectedTodoId]
  );

  const dismissActiveNotification = useCallback(() => {
    setActiveNotification(null);
  }, []);

  const viewActiveNotificationTodo = useCallback(() => {
    const notification = activeNotification;
    if (!notification) return;

    setActiveNotification(null);
    void openTodoFromNotification(notification.id, notification.todoId).then(() =>
      markNotificationRead(notification.id).catch(() => {})
    );
  }, [activeNotification, openTodoFromNotification]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const notificationId = params.get("notificationId");
    const todoId = params.get("todoId");
    if (!notificationId && !todoId) return;

    void openTodoFromNotification(notificationId, todoId);
    params.delete("notificationId");
    params.delete("todoId");
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }, [openTodoFromNotification]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return undefined;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.type !== "SMARTTODO_NOTIFICATION_CLICK") return;
      void openTodoFromNotification(data.notificationId, data.todoId);
    };

    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, [openTodoFromNotification]);

  return {
    activeNotification,
    hasActiveNotification: Boolean(activeNotification),
    dismissActiveNotification,
    viewActiveNotificationTodo,
    refreshUnreadNotifications,
    lastError,
  };
}
