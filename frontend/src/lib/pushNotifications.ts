import { apiRequest, getApiErrorMessage } from "./apiClient";

export type SmartTodoNotificationType = "reminder" | string;

export interface SmartTodoNotification {
  id: string;
  type: SmartTodoNotificationType;
  title: string;
  body: string;
  todoId?: string | null;
  reminderId?: string | null;
  createdAt: string;
  readAt?: string | null;
  deliveredAt?: string | null;
  pushSentAt?: string | null;
  pushFailedAt?: string | null;
}

export interface PushSubscriptionServerRecord {
  id: string;
  enabled: boolean;
  createdAt: string;
}

export interface SavedPushSubscription {
  endpoint: string;
  subscription: PushSubscriptionServerRecord;
}

export { getApiErrorMessage };

export function fetchUnreadNotifications(signal?: AbortSignal) {
  const params = new URLSearchParams({ unread: "true", type: "reminder" });
  return apiRequest<SmartTodoNotification[]>(`/notifications?${params.toString()}`, { signal });
}

export function markNotificationDelivered(notificationId: string) {
  return apiRequest<void>(`/notifications/${encodeURIComponent(notificationId)}/delivered`, {
    method: "POST",
  });
}

export function markNotificationRead(notificationId: string) {
  return apiRequest<void>(`/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "POST",
  });
}

export function markAllNotificationsRead() {
  return apiRequest<void>("/notifications/read-all", { method: "POST" });
}

export function markNotificationClicked(notificationId: string, markAsRead = true) {
  return apiRequest<void>(`/notifications/${encodeURIComponent(notificationId)}/clicked`, {
    method: "POST",
    body: JSON.stringify({ markAsRead }),
  });
}

export function canUseBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function canUsePushNotifications() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    canUseBrowserNotifications()
  );
}

export function getBrowserNotificationPermission(): NotificationPermission | "unsupported" {
  if (!canUseBrowserNotifications()) return "unsupported";
  return Notification.permission;
}

export function getPushUnavailableReason() {
  if (typeof window === "undefined") return "当前环境不支持浏览器通知";
  if (!window.isSecureContext) return "Web Push 需要 HTTPS，localhost/127.0.0.1 调试环境除外。";
  if (!("serviceWorker" in navigator)) return "当前浏览器不支持 Service Worker。";
  if (!("PushManager" in window)) return "当前浏览器不支持 Web Push。";
  if (!canUseBrowserNotifications()) return "当前浏览器不支持系统通知。";
  return null;
}

export async function requestBrowserNotificationPermission() {
  if (!canUseBrowserNotifications()) return "unsupported" as const;
  if (Notification.permission === "granted") return "granted" as const;
  if (Notification.permission === "denied") return "denied" as const;
  return Notification.requestPermission();
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function getDeviceName() {
  const userAgent = navigator.userAgent;
  const browser =
    userAgent.includes("Edg/")
      ? "Edge"
      : userAgent.includes("Chrome/")
        ? "Chrome"
        : userAgent.includes("Safari/")
          ? "Safari"
          : userAgent.includes("Firefox/")
            ? "Firefox"
            : "Browser";
  const platform = navigator.platform || "Unknown OS";
  return `${browser} on ${platform}`;
}

export async function fetchPushPublicKey() {
  const response = await apiRequest<{ publicKey: string }>("/push/public-key");
  return response.publicKey.trim();
}

async function getPushPublicKey() {
  const publicKey = await fetchPushPublicKey();
  if (!publicKey) {
    throw new Error("后端没有返回 Web Push public key");
  }
  return publicKey;
}

export async function registerSmartTodoServiceWorker() {
  const reason = getPushUnavailableReason();
  if (reason) throw new Error(reason);

  const registration = await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready.then(() => registration);
}

async function savePushSubscription(subscription: PushSubscription): Promise<SavedPushSubscription> {
  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const keys = json.keys;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new Error("浏览器没有返回完整的 PushSubscription。");
  }

  const response = await apiRequest<{ subscription: PushSubscriptionServerRecord }>("/push/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      endpoint,
      keys: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      userAgent: navigator.userAgent,
      deviceName: getDeviceName(),
    }),
  });

  return { endpoint, subscription: response.subscription };
}

export async function subscribeCurrentBrowserToPush() {
  const permission = await requestBrowserNotificationPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "浏览器已拒绝系统通知。页面内提醒仍可使用，如需系统通知请在浏览器设置里重新允许。"
        : "没有获得系统通知权限。"
    );
  }

  const [publicKey, registration] = await Promise.all([
    getPushPublicKey(),
    registerSmartTodoServiceWorker(),
  ]);

  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  return savePushSubscription(subscription);
}

export async function deletePushSubscriptionById(subscriptionId: string) {
  return apiRequest<void>(`/push/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "DELETE",
  });
}

export async function deleteCurrentPushSubscription(endpoint: string) {
  return apiRequest<void>("/push/subscriptions/current", {
    method: "DELETE",
    body: JSON.stringify({ endpoint }),
  });
}

export async function unsubscribeCurrentBrowserPush(endpointHint?: string, subscriptionId?: string) {
  let endpoint = endpointHint;

  if (canUsePushNotifications()) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        endpoint = subscription.endpoint;
        await subscription.unsubscribe();
      }
    } catch {
      // Keep going so the backend subscription can still be disabled by endpoint.
    }
  }

  if (endpoint) {
    await deleteCurrentPushSubscription(endpoint);
    return;
  }

  if (subscriptionId) {
    await deletePushSubscriptionById(subscriptionId);
  }
}
