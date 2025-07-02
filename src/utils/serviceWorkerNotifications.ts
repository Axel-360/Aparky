// Archivo: src/utils/serviceWorkerNotifications.ts
export const registerNotificationSW = async (): Promise<boolean> => {
  if (!("serviceWorker" in navigator)) {
    console.log("❌ Service Worker no soportado");
    return false;
  }

  try {
    // Registrar nuestro service worker personalizado
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    console.log("✅ Service Worker registrado:", registration.scope);

    // Esperar a que esté listo
    await navigator.serviceWorker.ready;
    console.log("🚀 Service Worker listo");

    return true;
  } catch (error) {
    console.error("❌ Error registrando Service Worker:", error);
    return false;
  }
};

// Función para mostrar notificación persistente
export const showPersistentNotification = async (
  title: string,
  body: string,
  options?: {
    tag?: string;
    icon?: string;
    badge?: string;
    vibrate?: number[];
    requireInteraction?: boolean;
  }
): Promise<void> => {
  if (!("serviceWorker" in navigator)) {
    console.warn("⚠️ Service Worker no disponible para notificaciones persistentes");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    const notificationOptions = {
      body,
      icon: options?.icon || "/icons/pwa-192x192.png",
      badge: options?.badge || "/icons/pwa-64x64.png",
      tag: options?.tag || "aparky-notification",
      requireInteraction: options?.requireInteraction ?? true,
      silent: false,
      vibrate: options?.vibrate || [200, 100, 200],
      data: {
        timestamp: Date.now(),
        url: "/",
      },
      actions: [
        {
          action: "open",
          title: "Abrir App",
          icon: "/icons/pwa-64x64.png",
        },
        {
          action: "dismiss",
          title: "Cerrar",
          icon: "/icons/pwa-64x64.png",
        },
      ],
    };

    await registration.showNotification(title, notificationOptions);
    console.log("✅ Notificación persistente mostrada:", title);
  } catch (error) {
    console.error("❌ Error mostrando notificación persistente:", error);
    throw error;
  }
};

// Verificar si las notificaciones persistentes están disponibles
export const isPersistentNotificationSupported = (): boolean => {
  return "serviceWorker" in navigator && "showNotification" in ServiceWorkerRegistration.prototype;
};
