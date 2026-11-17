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

type PushPayload = {
  title?: string;
  body?: string;
  icon?: string;
  url?: string;
};

type PushEventLike = Event & {
  data?: {
    json: () => PushPayload;
    text: () => string;
  } | null;
  waitUntil: (promise: Promise<unknown>) => void;
};

type WindowClientLike = {
  url: string;
  focus?: () => Promise<unknown>;
};

type NotificationEventLike = Event & {
  notification: {
    close: () => void;
    data?: { url?: string };
  };
  waitUntil: (promise: Promise<unknown>) => void;
};

type SwGlobalLike = WorkerGlobalScope & {
  addEventListener: (
    type: string,
    listener: (event: PushEventLike & NotificationEventLike) => void,
  ) => void;
  registration: {
    showNotification: (title: string, options: NotificationOptions) => Promise<void>;
  };
  clients: {
    matchAll: (options: { type: string; includeUncontrolled: boolean }) => Promise<WindowClientLike[]>;
    openWindow?: (url: string) => Promise<unknown>;
  };
};

const swSelf = self as unknown as SwGlobalLike;

// Listener para recibir notificaciones Push
swSelf.addEventListener("push", (event) => {
  let data: PushPayload = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || "Vencimiento próximo";
  const options: NotificationOptions = {
    body: data.body || "Tenés un vencimiento programado.",
    icon: data.icon || "/web-app-manifest-192x192.png",
    badge: "/favicon.ico",
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil(
    swSelf.registration.showNotification(title, options)
  );
});

// Listener para manejar el click en la notificación
swSelf.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    swSelf.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Intentar enfocar una pestaña abierta que coincida con la URL
      for (const client of clientList) {
        if (client.url.endsWith(url) && client.focus) {
          return client.focus();
        }
      }
      // Si no hay pestaña abierta, abrir una nueva
      if (swSelf.clients.openWindow) {
        return swSelf.clients.openWindow(url);
      }
    })
  );
});

serwist.addEventListeners();
