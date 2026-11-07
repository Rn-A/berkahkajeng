// Service Worker for Berkah Kajeng (PWA iOS 16.4+, Android APK/Web Notifications)
const SW_VERSION = "berkah-kajeng-sw-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for messages from the frontend app to trigger native OS / Status Bar notifications
self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "SHOW_NOTIFICATION") return;

  const { title, body, tag, targetView } = event.data.payload || {};
  if (!title) return;

  const options = {
    body: body || "",
    icon: "/logo.png",
    badge: "/logo.png",
    tag: tag || `bk-notif-${Date.now()}`,
    renotify: false,
    vibrate: [150, 80, 150],
    data: {
      targetView: targetView || "dashboard",
      url: "/",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Support standard Web Push events
self.addEventListener("push", (event) => {
  let payload = {
    title: "Berkah Kajeng",
    body: "Ada pembaruan operasional baru di sistem.",
    tag: "bk-push",
    targetView: "dashboard",
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/logo.png",
      badge: "/logo.png",
      tag: payload.tag,
      vibrate: [150, 80, 150],
      data: {
        targetView: payload.targetView || "dashboard",
        url: "/",
      },
    })
  );
});

// Focus app window and navigate to the relevant view when user taps notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetView = event.notification.data?.targetView || "dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.postMessage({
              type: "NAVIGATE_VIEW",
              targetView,
            });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow("/");
        }
      })
  );
});

