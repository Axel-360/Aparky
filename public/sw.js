const CACHE_NAME = "aparky-v1";

// Instalar service worker
self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker instalado");
  self.skipWaiting();
});

// Activar service worker
self.addEventListener("activate", (event) => {
  console.log("✅ Service Worker activado");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("🗑️ Eliminando cache antiguo:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// CRÍTICO: Manejar clicks en notificaciones
self.addEventListener("notificationclick", (event) => {
  console.log("🔔 Notificación clickeada:", event.notification.tag);

  event.notification.close();

  // Abrir/enfocar la app cuando se clickea la notificación
  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Si ya hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && "focus" in client) {
            console.log("📱 Enfocando ventana existente");
            return client.focus();
          }
        }

        // Si no, abrir nueva ventana
        if (self.clients.openWindow) {
          console.log("🆕 Abriendo nueva ventana");
          return self.clients.openWindow("/");
        }
      })
  );
});

// Manejar mensajes del cliente
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Manejo básico de fetch (para PWA)
self.addEventListener("fetch", (event) => {
  // Solo cachear GET requests
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
