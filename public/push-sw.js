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
    tag: data.data?.type === "vibe" ? "us-vibe" : (data.tag || "us-notification"),
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Us", options).then(function() {
      var count = data.badge || 1;
      if (self.registration.setAppBadge) {
        self.registration.setAppBadge(count).catch(function() {});
      } else if (navigator.setAppBadge) {
        navigator.setAppBadge(count).catch(function() {});
      }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (self.registration.clearAppBadge) {
    self.registration.clearAppBadge().catch(function() {});
  } else if (navigator.clearAppBadge) {
    navigator.clearAppBadge().catch(function() {});
  }

  const notifData = event.notification.data || {};
  const isVibe = notifData.type === "vibe";
  const route = isVibe
    ? "/?vibe=" + encodeURIComponent(notifData.emoji || "") + "&vibeLabel=" + encodeURIComponent(notifData.label || "")
    : (notifData.route || "/");

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clients) {
      for (var i = 0; i < clients.length; i++) {
        var client = clients[i];
        if (client.url.indexOf(self.location.origin) !== -1) {
          client.focus();
          if (isVibe) {
            client.postMessage({ type: "vibe", emoji: notifData.emoji, label: notifData.label });
          }
          client.navigate(route);
          return;
        }
      }
      return self.clients.openWindow(route);
    })
  );
});
