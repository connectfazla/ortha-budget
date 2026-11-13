// Budget Ortha service worker: Web Push only. No fetch handler and no caching, so it never serves stale pages.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

/** Same-origin relative paths only ("/x", not "//host" or "https://..."); anything else opens the home page. */
const safePath = (url) => (typeof url === "string" && url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\") ? url : "/");

self.addEventListener("push", (event) => {
  let msg = {};
  try {
    msg = event.data ? event.data.json() : {};
  } catch {
    msg = { body: event.data ? event.data.text() : "" };
  }
  const shown = self.registration.showNotification(msg.title || "Budget Ortha", {
    body: msg.body || "",
    tag: msg.tag || undefined,
    data: { url: safePath(msg.url) },
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  });
  const badge = msg.badge > 0 && self.navigator.setAppBadge ? self.navigator.setAppBadge(msg.badge).catch(() => {}) : null;
  event.waitUntil(Promise.all([shown, badge]));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = safePath(event.notification.data && event.notification.data.url);
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const win = wins.find((c) => new URL(c.url).origin === self.location.origin);
      if (win) {
        await win.focus();
        // navigate() needs a controlled client; fall back to a new window if it is refused.
        if (await win.navigate(url).catch(() => null)) return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
