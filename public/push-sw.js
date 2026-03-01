self.addEventListener("push", (event) => {
  let data = { title: "Us", body: "You have a new notification" };
  try {
    data = event.data.json();
  } catch (e) {
    data.body = event.data ? event.data.text() : data.body;
  }

  const isVibe = data.data?.type === "vibe";

  const tryForeground = isVibe
    ? self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        const focused = clients.find((c) => c.visibilityState === "visible");
        if (focused) {
          focused.postMessage({ type: "vibe", emoji: data.data.emoji, label: data.data.label });
          return true;
        }
        return false;
      })
    : Promise.resolve(false);

  event.waitUntil(
    tryForeground.then((handled) => {
      if (handled) return;
      const options = {
        body: data.body || "",
        icon: "/pwa-192.png",
        badge: "/pwa-192.png",
        data: data.data || {},
        vibrate: [200, 100, 200],
        tag: isVibe ? "us-vibe" : (data.tag || "us-notification"),
        renotify: true,
      };
      return self.registration.showNotification(data.title || "Us", options);
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const isVibe = notifData.type === "vibe";
  const route = isVibe
    ? `/?vibe=${encodeURIComponent(notifData.emoji || "")}&vibeLabel=${encodeURIComponent(notifData.label || "")}`
    : (notifData.route || "/");

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          if (isVibe) {
            client.postMessage({ type: "vibe", emoji: notifData.emoji, label: notifData.label });
          } else {
            client.navigate(route);
          }
          return;
        }
      }
      return self.clients.openWindow(route);
    })
  );
});
