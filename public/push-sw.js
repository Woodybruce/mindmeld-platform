self.addEventListener("push", (event) => {
  let data = { title: "Us", body: "You have a new notification" };
  try {
    data = event.data.json();
  } catch (e) {
    data.body = event.data ? event.data.text() : data.body;
  }

  const options = {
    body: data.body || "",
    icon: "/pwa-192.png",
    badge: "/pwa-192.png",
    data: data.data || {},
    vibrate: [200, 100, 200],
    tag: data.tag || "us-notification",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title || "Us", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const route = event.notification.data?.route || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(route);
          return;
        }
      }
      return self.clients.openWindow(route);
    })
  );
});
