self.addEventListener("push", (event) => {
  const payload = event.data ? parsePushPayload(event.data) : {};
  const title = payload.title || "SmartTodo 提醒";
  const body = payload.body || "你有一条新的待办提醒";
  const url = buildNotificationUrl(payload);

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body,
        tag: payload.notificationId || payload.todoId || "smarttodo-reminder",
        renotify: true,
        icon: "/favicon.svg",
        badge: "/favicon.svg",
        data: {
          notificationId: payload.notificationId,
          todoId: payload.todoId,
          url,
          apiBase: payload.apiBase,
        },
      }),
      markNotificationDelivered(payload),
    ])
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = data.url || buildNotificationUrl(data);
  const message = {
    type: "SMARTTODO_NOTIFICATION_CLICK",
    notificationId: data.notificationId,
    todoId: data.todoId,
    url: targetUrl,
  };

  event.waitUntil(focusOrOpenClient(targetUrl, message));
});

function parsePushPayload(data) {
  try {
    return data.json();
  } catch {
    try {
      return JSON.parse(data.text());
    } catch {
      return {};
    }
  }
}

function buildNotificationUrl(payload) {
  const url = new URL(payload.url || "/", self.location.origin);
  if (payload.todoId) url.searchParams.set("todoId", payload.todoId);
  if (payload.notificationId) url.searchParams.set("notificationId", payload.notificationId);
  return url.href;
}

function buildApiUrl(payload, path) {
  const base = payload.apiBase || "/api/v1";
  return new URL(`${base.replace(/\/$/, "")}${path}`, self.location.origin).href;
}

async function markNotificationDelivered(payload) {
  if (!payload.notificationId) return;

  try {
    await fetch(buildApiUrl(payload, `/notifications/${encodeURIComponent(payload.notificationId)}/delivered`), {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  } catch {
    // Delivery bookkeeping should never block the system notification itself.
  }
}

async function focusOrOpenClient(targetUrl, message) {
  const allClients = await clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  const target = new URL(targetUrl);

  for (const client of allClients) {
    const clientUrl = new URL(client.url);
    if (clientUrl.origin === target.origin) {
      client.postMessage(message);
      return client.focus();
    }
  }

  return clients.openWindow(targetUrl);
}
