// Service Worker for Berkah Kajeng
// Supports:
// 1. 100% Offline Cold-Start for PWA on iOS & Android (Network-First with Cache Fallback)
// 2. Native OS / Status Bar Notifications (Android APK & PWA iOS 16.4+)
const CACHE_NAME = "berkah-kajeng-app-shell-v2";
const PRECACHE_URLS = ["/", "/index.html", "/manifest.json", "/logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Network-First with Cache Fallback for App Shell & Static Assets (JS/CSS/Images/HTML)
// This guarantees:
// - When ONLINE: Always fetches the newest version from Vercel (100% Auto-Update!)
// - When 100% OFFLINE (0% signal): Loads the cached app shell & JS chunks so the app opens normally!
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Do not intercept /api/* requests here; src/lib/offline.ts handles API caching & offline transaction queues
  if (url.pathname.startsWith("/api/")) return;

  // Handle navigation (HTML) and same-origin static assets (JS, CSS, images, manifest) or Google Fonts
  const isSameOrigin = url.origin === self.location.origin;
  const isFont =
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com");

  if (!isSameOrigin && !isFont) return;

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (networkResponse.type === "basic" || networkResponse.type === "cors")
        ) {
          const responseToCache = networkResponse.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, responseToCache))
            .catch(() => {});
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;

        // If it's a page navigation request while offline, return cached index.html (SPA fallback)
        if (request.mode === "navigate") {
          const fallbackHtml =
            (await caches.match("/index.html")) || (await caches.match("/"));
          if (fallbackHtml) return fallbackHtml;
        }

        throw new Error("Offline and not in cache");
      })
  );
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
