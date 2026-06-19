import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

// Listener para recibir notificaciones Push
(self as any).addEventListener("push", (event: any) => {
  let data: any = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || "Vencimiento próximo";
  const options = {
    body: data.body || "Tenés un vencimiento programado.",
    icon: data.icon || "/web-app-manifest-192x192.png",
    badge: "/favicon.ico",
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil(
    (self as any).registration.showNotification(title, options)
  );
});

// Listener para manejar el click en la notificación
(self as any).addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    (self as any).clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList: any[]) => {
      // Intentar enfocar una pestaña abierta que coincida con la URL
      for (const client of clientList) {
        if (client.url.endsWith(url) && "focus" in client) {
          return client.focus();
        }
      }
      // Si no hay pestaña abierta, abrir una nueva
      if ((self as any).clients.openWindow) {
        return (self as any).clients.openWindow(url);
      }
    })
  );
});

serwist.addEventListeners();
