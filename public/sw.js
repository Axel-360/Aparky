// public/sw.js
const CACHE_NAME = "parking-app-v1-clean";
const STATIC_CACHE = "parking-app-static-v1";
const urlsToCache = [
  "/",
  "/static/js/bundle.js",
  "/static/css/main.css",
  "/manifest.json",
  "/icons/pwa-192x192.png",
  "/icons/pwa-512x512.png",
  "/icons/pwa-64x64.png",
];

console.log("🚀 SW: Service Worker limpio cargando...");

self.addEventListener("install", (event) => {
  console.log("🔧 SW: Service Worker instalado");

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("📦 SW: Abriendo cache estático");
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log("✅ SW: Cache estático creado");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("❌ SW: Error en instalación:", error);
      })
  );
});

self.addEventListener("activate", (event) => {
  console.log("✅ SW: Service Worker activado");

  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
              console.log("🗑️ SW: Eliminando cache antigua:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim(),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  if (event.request.url.startsWith("chrome-extension://") || event.request.url.startsWith("moz-extension://")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log("📦 SW: Servido desde cache:", event.request.url);
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          const responseToCache = response.clone();

          const url = new URL(event.request.url);
          const shouldCache =
            url.origin === location.origin &&
            (event.request.url.includes("/static/") ||
              event.request.url.includes("/icons/") ||
              event.request.url.includes("/manifest.json") ||
              event.request.url === location.origin + "/");

          if (shouldCache) {
            caches.open(CACHE_NAME).then((cache) => {
              console.log("💾 SW: Cacheando:", event.request.url);
              cache.put(event.request, responseToCache);
            });
          }

          return response;
        })
        .catch((error) => {
          console.error("❌ SW: Error en fetch:", error);

          if (event.request.mode === "navigate") {
            return caches.match("/");
          }

          throw error;
        });
    })
  );
});

self.addEventListener("message", (event) => {
  console.log("📨 SW: Mensaje recibido:", event.data);

  const { type } = event.data;

  switch (type) {
    case "SKIP_WAITING":
      console.log("⏭️ SW: Saltando espera...");
      self.skipWaiting();
      break;

    case "GET_VERSION":
      event.ports[0].postMessage({
        type: "VERSION_INFO",
        version: CACHE_NAME,
        timestamp: Date.now(),
      });
      break;

    case "CLEAR_CACHE":
      console.log("🧹 SW: Limpiando cache...");
      Promise.all([caches.delete(CACHE_NAME), caches.delete(STATIC_CACHE)])
        .then(() => {
          event.ports[0].postMessage({
            type: "CACHE_CLEARED",
            success: true,
          });
        })
        .catch((error) => {
          console.error("❌ SW: Error limpiando cache:", error);
          event.ports[0].postMessage({
            type: "CACHE_CLEARED",
            success: false,
            error: error.message,
          });
        });
      break;

    case "GET_CACHE_STATUS":
      getCacheStatus().then((status) => {
        event.ports[0].postMessage({
          type: "CACHE_STATUS",
          status: status,
        });
      });
      break;

    default:
      console.log("❓ SW: Tipo de mensaje no reconocido:", type);
  }
});

async function getCacheStatus() {
  try {
    const cacheNames = await caches.keys();
    const cacheInfo = {};

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      cacheInfo[cacheName] = {
        size: keys.length,
        keys: keys.map((req) => req.url),
      };
    }

    return {
      caches: cacheInfo,
      totalCaches: cacheNames.length,
      currentVersion: CACHE_NAME,
    };
  } catch (error) {
    console.error("❌ SW: Error obteniendo estado del cache:", error);
    return {
      error: error.message,
    };
  }
}

self.addEventListener("error", (event) => {
  console.error("❌ SW: Error global:", event.error);
});

self.addEventListener("unhandledrejection", (event) => {
  console.error("❌ SW: Promesa rechazada no manejada:", event.reason);
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: "SW_ACTIVATED",
          version: CACHE_NAME,
          timestamp: Date.now(),
        });
      });
    })
  );
});

console.log("✅ SW: Service Worker limpio cargado (versión sin notificaciones)");
console.log("📦 SW: Cache configurado:", CACHE_NAME);
console.log("🎯 SW: Funcionalidades:");
console.log("  ✅ Cache de recursos estáticos");
console.log("  ✅ Navegación offline");
console.log("  ✅ Gestión de versiones");
console.log("  ✅ Limpieza automática de cache");
console.log("  ❌ Sistema de notificaciones (eliminado)");

// Funciones de utilidad para debugging (disponibles en DevTools)
self.getCacheInfo = getCacheStatus;
self.clearAllCaches = () => {
  return caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name))));
};
self.getCurrentVersion = () => CACHE_NAME;
