self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "Notificación de FiMe", body: "Tienes una nueva alerta" };
  
  const options = {
    body: data.body,
    icon: "/avatars/objetivo.png", // Usando un avatar del sistema como ícono
    badge: "/avatars/objetivo.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: "2",
      url: data.url || "/"
    },
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  const promiseChain = self.clients.matchAll({
    type: "window",
    includeUncontrolled: true
  }).then((windowClients) => {
    let matchingClient = null;

    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      if (windowClient.url === urlToOpen) {
        matchingClient = windowClient;
        break;
      }
    }

    if (matchingClient) {
      return matchingClient.focus();
    } else {
      return self.clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});
