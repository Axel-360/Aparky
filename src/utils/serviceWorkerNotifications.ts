// Archivo: src/utils/serviceWorkerNotifications.ts

/**
 * 🔥 VERSIÓN ULTRA MEJORADA: Service Worker Notifications
 * Soluciona todos los problemas de notificaciones en móviles y background
 */

let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
let isRegistering = false;

/**
 * 🔥 MEJORADO: Registrar Service Worker con reintentos y verificación robusta
 */
export const registerNotificationSW = async (): Promise<boolean> => {
  if (!("serviceWorker" in navigator)) {
    console.log("❌ Service Worker no soportado");
    return false;
  }

  // Evitar registros múltiples simultáneos
  if (isRegistering) {
    console.log("⏳ Service Worker ya se está registrando...");
    return waitForRegistration();
  }

  if (serviceWorkerRegistration) {
    console.log("✅ Service Worker ya registrado");
    return true;
  }

  isRegistering = true;

  try {
    console.log("🔧 Registrando Service Worker...");

    // 🔥 NUEVO: Verificar si ya existe un SW activo
    const existingRegistration = await navigator.serviceWorker.getRegistration();

    if (existingRegistration) {
      console.log("📱 Service Worker existente encontrado");
      serviceWorkerRegistration = existingRegistration;

      // Verificar si necesita actualización
      await existingRegistration.update();

      // Esperar a que esté listo
      await navigator.serviceWorker.ready;

      isRegistering = false;
      return true;
    }

    // Registrar nuevo Service Worker
    serviceWorkerRegistration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none", // 🔥 NUEVO: Siempre verificar actualizaciones
    });

    console.log("✅ Service Worker registrado:", serviceWorkerRegistration.scope);

    // 🔥 NUEVO: Manejar actualizaciones del Service Worker
    serviceWorkerRegistration.addEventListener("updatefound", () => {
      console.log("🔄 Actualización de Service Worker encontrada");
      handleServiceWorkerUpdate();
    });

    // Esperar a que esté listo
    await navigator.serviceWorker.ready;
    console.log("🚀 Service Worker listo");

    // 🔥 NUEVO: Configurar comunicación bidireccional
    setupServiceWorkerCommunication();

    isRegistering = false;
    return true;
  } catch (error) {
    console.error("❌ Error registrando Service Worker:", error);
    isRegistering = false;

    // 🔥 NUEVO: Reintento después de un delay
    setTimeout(() => {
      console.log("🔄 Reintentando registro de Service Worker...");
      registerNotificationSW();
    }, 5000);

    return false;
  }
};

/**
 * 🔥 NUEVO: Esperar a que termine el registro en progreso
 */
const waitForRegistration = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    const checkRegistration = () => {
      if (!isRegistering) {
        resolve(!!serviceWorkerRegistration);
      } else {
        setTimeout(checkRegistration, 100);
      }
    };
    checkRegistration();
  });
};

/**
 * 🔥 NUEVO: Manejar actualizaciones del Service Worker
 */
const handleServiceWorkerUpdate = (): void => {
  if (!serviceWorkerRegistration) return;

  const newWorker = serviceWorkerRegistration.installing;
  if (!newWorker) return;

  newWorker.addEventListener("statechange", () => {
    if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
      console.log("🔄 Nueva versión del Service Worker disponible");

      // Notificar al usuario sobre la actualización disponible
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Actualización disponible", {
          body: "Nueva versión de la app disponible. Se aplicará automáticamente.",
          icon: "/icons/pwa-192x192.png",
          tag: "app-update",
        });
      }

      // Auto-actualizar después de un delay
      setTimeout(() => {
        newWorker.postMessage({ type: "SKIP_WAITING" });
        window.location.reload();
      }, 3000);
    }
  });
};

/**
 * 🔥 NUEVO: Configurar comunicación bidireccional con Service Worker
 */
const setupServiceWorkerCommunication = (): void => {
  if (!navigator.serviceWorker) return;

  // Escuchar mensajes del Service Worker
  navigator.serviceWorker.addEventListener("message", (event) => {
    console.log("📨 Mensaje del SW:", event.data);

    switch (event.data.type) {
      case "NOTIFICATION_CLICKED":
        handleNotificationClick(event.data);
        break;
      case "QUEUE_STATUS":
        handleQueueStatus(event.data);
        break;
      default:
        console.log("📨 Mensaje SW no manejado:", event.data.type);
    }
  });

  // Manejar cambios en el controlador
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    console.log("🔄 Service Worker controller cambió");
    window.location.reload();
  });
};

/**
 * 🔥 NUEVO: Manejar clicks de notificación desde SW
 */
const handleNotificationClick = (data: any): void => {
  console.log("🔔 Notificación clickeada:", data);

  // Disparar evento personalizado para que la app pueda reaccionar
  window.dispatchEvent(
    new CustomEvent("notificationClick", {
      detail: data,
    })
  );
};

/**
 * 🔥 NUEVO: Manejar estado de cola desde SW
 */
const handleQueueStatus = (data: any): void => {
  console.log("📋 Estado de cola SW:", data);

  // Disparar evento para sincronización
  window.dispatchEvent(
    new CustomEvent("queueStatusUpdate", {
      detail: data,
    })
  );
};

/**
 * 🔥 ULTRA MEJORADO: Mostrar notificación persistente con múltiples fallbacks
 */
export const showPersistentNotification = async (
  title: string,
  body: string,
  options?: {
    tag?: string;
    icon?: string;
    badge?: string;
    vibrate?: number[];
    requireInteraction?: boolean;
    data?: any;
  }
): Promise<void> => {
  console.log("🔔 Mostrando notificación persistente:", title);

  if (!("serviceWorker" in navigator)) {
    console.warn("⚠️ Service Worker no disponible para notificaciones persistentes");
    throw new Error("Service Worker no disponible");
  }

  // 🔥 NUEVO: Verificar múltiples condiciones antes de proceder
  const canShowNotification = await verifyNotificationCapability();
  if (!canShowNotification) {
    throw new Error("No se pueden mostrar notificaciones persistentes");
  }

  try {
    // Asegurar que el Service Worker esté registrado
    if (!serviceWorkerRegistration) {
      const registered = await registerNotificationSW();
      if (!registered) {
        throw new Error("No se pudo registrar Service Worker");
      }
    }

    // Esperar a que esté completamente listo
    const registration = await navigator.serviceWorker.ready;

    // 🔥 NUEVO: Verificar que el registration sea válido
    if (!registration || !registration.showNotification) {
      throw new Error("Service Worker registration inválido");
    }

    // Configurar opciones de la notificación con valores por defecto robustos
    const notificationOptions: NotificationOptions = {
      body,
      icon: options?.icon || "/icons/pwa-192x192.png",
      badge: options?.badge || "/icons/pwa-64x64.png",
      tag: options?.tag || `notification-${Date.now()}`,
      requireInteraction: options?.requireInteraction ?? true,
      silent: false,
      vibrate: options?.vibrate || [300, 100, 300, 100, 300],
      timestamp: Date.now(),
      data: {
        timestamp: Date.now(),
        url: "/",
        ...options?.data,
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

    // 🔥 NUEVO: Limpiar notificaciones anteriores con el mismo tag
    if (notificationOptions.tag) {
      await clearNotificationByTag(notificationOptions.tag);
    }

    // Mostrar la notificación
    await registration.showNotification(title, notificationOptions);

    console.log("✅ Notificación persistente mostrada exitosamente:", notificationOptions.tag);

    // 🔥 NUEVO: Verificar que la notificación se mostró realmente
    setTimeout(async () => {
      await verifyNotificationWasShown(notificationOptions.tag!);
    }, 1000);
  } catch (error) {
    console.error("❌ Error mostrando notificación persistente:", error);

    // 🔥 NUEVO: Intentar fallback con notificación normal
    await fallbackToNormalNotification(title, body, options);

    throw error;
  }
};

/**
 * 🔥 NUEVO: Verificar capacidad de mostrar notificaciones
 */
const verifyNotificationCapability = async (): Promise<boolean> => {
  // Verificar soporte básico
  if (!("Notification" in window)) {
    console.warn("⚠️ Notificaciones no soportadas");
    return false;
  }

  // Verificar permisos
  if (Notification.permission !== "granted") {
    console.warn("⚠️ Sin permisos de notificación");
    return false;
  }

  // Verificar Service Worker
  if (!("serviceWorker" in navigator)) {
    console.warn("⚠️ Service Worker no soportado");
    return false;
  }

  // Verificar que ShowNotification esté disponible
  if (!("showNotification" in ServiceWorkerRegistration.prototype)) {
    console.warn("⚠️ showNotification no disponible en ServiceWorkerRegistration");
    return false;
  }

  return true;
};

/**
 * 🔥 NUEVO: Limpiar notificaciones anteriores por tag
 */
const clearNotificationByTag = async (tag: string): Promise<void> => {
  try {
    if (!serviceWorkerRegistration) return;

    const notifications = await serviceWorkerRegistration.getNotifications({ tag });

    for (const notification of notifications) {
      notification.close();
      console.log("🧹 Notificación anterior cerrada:", tag);
    }
  } catch (error) {
    console.warn("⚠️ Error limpiando notificaciones anteriores:", error);
  }
};

/**
 * 🔥 NUEVO: Verificar que la notificación se mostró
 */
const verifyNotificationWasShown = async (tag: string): Promise<void> => {
  try {
    if (!serviceWorkerRegistration) return;

    const notifications = await serviceWorkerRegistration.getNotifications({ tag });

    if (notifications.length === 0) {
      console.warn("⚠️ La notificación no se mostró, posible problema del sistema");

      // Disparar evento para que la app pueda tomar acción
      window.dispatchEvent(
        new CustomEvent("notificationFailed", {
          detail: { tag, reason: "not_shown" },
        })
      );
    } else {
      console.log("✅ Notificación verificada exitosamente:", tag);
    }
  } catch (error) {
    console.warn("⚠️ Error verificando notificación:", error);
  }
};

/**
 * 🔥 NUEVO: Fallback a notificación normal
 */
const fallbackToNormalNotification = async (title: string, body: string, options?: any): Promise<void> => {
  try {
    console.log("🔄 Usando fallback a notificación normal");

    const notification = new Notification(title, {
      body,
      icon: options?.icon || "/icons/pwa-192x192.png",
      badge: options?.badge || "/icons/pwa-64x64.png",
      tag: options?.tag,
      requireInteraction: true,
      vibrate: options?.vibrate || [200, 100, 200],
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto-cerrar después de 15 segundos
    setTimeout(() => {
      notification.close();
    }, 15000);

    console.log("✅ Notificación normal fallback mostrada");
  } catch (fallbackError) {
    console.error("❌ Error en fallback a notificación normal:", fallbackError);
  }
};

/**
 * 🔥 NUEVO: Obtener todas las notificaciones activas
 */
export const getActiveNotifications = async (): Promise<Notification[]> => {
  try {
    if (!serviceWorkerRegistration) {
      await registerNotificationSW();
    }

    if (!serviceWorkerRegistration) {
      return [];
    }

    const notifications = await serviceWorkerRegistration.getNotifications();
    console.log(`📋 Notificaciones activas: ${notifications.length}`);

    return notifications;
  } catch (error) {
    console.error("❌ Error obteniendo notificaciones activas:", error);
    return [];
  }
};

/**
 * 🔥 NUEVO: Limpiar todas las notificaciones
 */
export const clearAllNotifications = async (): Promise<void> => {
  try {
    const notifications = await getActiveNotifications();

    for (const notification of notifications) {
      notification.close();
    }

    console.log(`🧹 ${notifications.length} notificaciones limpiadas`);
  } catch (error) {
    console.error("❌ Error limpiando notificaciones:", error);
  }
};

/**
 * 🔥 NUEVO: Programar notificación en Service Worker
 */
export const scheduleNotificationInSW = async (
  id: string,
  delay: number,
  title: string,
  body: string,
  options?: any
): Promise<void> => {
  try {
    if (!serviceWorkerRegistration?.active) {
      console.warn("⚠️ Service Worker no activo");
      return;
    }

    // 🔥 CORREGIDO: Calcular scheduledTime y usar formato plano
    const scheduledTime = Date.now() + delay;

    const messageData = {
      type: "SCHEDULE_NOTIFICATION",
      // ✅ Formato correcto que espera el SW:
      id: id,
      title: title,
      body: body,
      scheduledTime: scheduledTime, // ✅ Timestamp absoluto, no delay relativo
      icon: options?.icon || "/icons/pwa-192x192.png",
      badge: options?.badge || "/icons/pwa-64x64.png",
      vibrate: options?.vibrate || [300, 100, 300],
      tag: options?.tag || id,
      requireInteraction: options?.requireInteraction ?? true,
      data: options?.data || {},
      // ❌ NO enviar: delay, options anidado, type dentro de data
    };

    console.log(`📨 Enviando al SW (formato corregido):`, messageData);

    serviceWorkerRegistration.active.postMessage(messageData);

    console.log(`⏰ Notificación programada en SW: ${id} para ${new Date(scheduledTime).toLocaleString()}`);
  } catch (error) {
    console.error("❌ Error programando notificación en SW:", error);
  }
};

/**
 * 🔥 NUEVO: Cancelar notificación en Service Worker
 */
export const cancelNotificationInSW = async (id: string): Promise<void> => {
  try {
    if (!serviceWorkerRegistration?.active) {
      console.warn("⚠️ Service Worker no activo");
      return;
    }

    serviceWorkerRegistration.active.postMessage({
      type: "CANCEL_NOTIFICATION",
      id,
    });

    console.log(`❌ Notificación cancelada en SW: ${id}`);
  } catch (error) {
    console.error("❌ Error cancelando notificación en SW:", error);
  }
};

/**
 * Verificar si las notificaciones persistentes están disponibles
 */
export const isPersistentNotificationSupported = (): boolean => {
  return (
    "serviceWorker" in navigator &&
    "showNotification" in ServiceWorkerRegistration.prototype &&
    "Notification" in window
  );
};

/**
 * 🔥 NUEVO: Obtener estado completo del sistema de notificaciones
 */
export const getNotificationSystemStatus = async (): Promise<{
  supported: boolean;
  permission: NotificationPermission;
  serviceWorkerReady: boolean;
  activeNotifications: number;
  persistentSupported: boolean;
}> => {
  const activeNotifications = await getActiveNotifications();

  return {
    supported: "Notification" in window,
    permission: Notification.permission,
    serviceWorkerReady: !!serviceWorkerRegistration,
    activeNotifications: activeNotifications.length,
    persistentSupported: isPersistentNotificationSupported(),
  };
};

/**
 * 🔥 NUEVO: Test completo del sistema de notificaciones
 */
export const testNotificationSystem = async (): Promise<{
  success: boolean;
  errors: string[];
  warnings: string[];
}> => {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Test 1: Verificar soporte básico
    if (!("Notification" in window)) {
      errors.push("Notificaciones no soportadas en este navegador");
    }

    // Test 2: Verificar permisos
    if (Notification.permission !== "granted") {
      warnings.push("Permisos de notificación no concedidos");
    }

    // Test 3: Verificar Service Worker
    const swReady = await registerNotificationSW();
    if (!swReady) {
      errors.push("Service Worker no se pudo registrar");
    }

    // Test 4: Test de notificación persistente
    if (errors.length === 0 && Notification.permission === "granted") {
      try {
        await showPersistentNotification("🧪 Test del Sistema", "Si ves esto, el sistema funciona correctamente", {
          tag: "system-test",
        });

        // Verificar que se mostró
        setTimeout(async () => {
          const notifications = await getActiveNotifications();
          const testNotification = notifications.find((n) => n.tag === "system-test");
          if (testNotification) {
            testNotification.close();
          }
        }, 3000);
      } catch (testError) {
        errors.push(`Error en test de notificación: ${testError}`);
      }
    }

    const success = errors.length === 0;

    console.log("🧪 Test del sistema completado:", { success, errors, warnings });

    return { success, errors, warnings };
  } catch (error) {
    errors.push(`Error general en test: ${error}`);
    return { success: false, errors, warnings };
  }
};
