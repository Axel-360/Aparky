// Archivo: src/utils/notificationManager.ts
import { getUserPreferences } from "./preferences";
import {
  registerNotificationSW,
  showPersistentNotification,
  isPersistentNotificationSupported,
} from "./serviceWorkerNotifications";

/**
 * Clase para gestionar notificaciones del navegador de forma centralizada.
 * VERSIÓN MEJORADA con soporte para notificaciones persistentes
 */
class NotificationManager {
  private static instance: NotificationManager;
  private scheduledNotifications: Map<string, number> = new Map();
  private isServiceWorkerReady: boolean = false;

  private constructor() {
    this.initializeServiceWorker();
  }

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * Inicializar Service Worker para notificaciones persistentes
   */
  private async initializeServiceWorker(): Promise<void> {
    try {
      this.isServiceWorkerReady = await registerNotificationSW();
      console.log("🔔 NotificationManager: Service Worker inicializado:", this.isServiceWorkerReady);
    } catch (error) {
      console.error("❌ Error inicializando Service Worker:", error);
      this.isServiceWorkerReady = false;
    }
  }

  /**
   * Inicialización completa del sistema de notificaciones
   */
  public async initialize(): Promise<boolean> {
    try {
      console.log("🚀 Inicializando sistema de notificaciones...");

      // Verificar soporte del navegador
      if (!this.isSupported()) {
        console.warn("⚠️ Notificaciones no soportadas en este navegador");
        return false;
      }

      // Verificar preferencias del usuario
      const preferences = getUserPreferences();
      if (!preferences.notifications) {
        console.log("📵 Notificaciones desactivadas en preferencias");
        return false;
      }

      // Registrar Service Worker si no está listo
      if (!this.isServiceWorkerReady) {
        this.isServiceWorkerReady = await registerNotificationSW();
      }

      // Solicitar permisos si no están concedidos
      let permission = this.getPermissionStatus();
      if (permission === "default") {
        permission = await this.requestPermission();
      }

      const success = permission === "granted" && this.isServiceWorkerReady;
      console.log("✅ Sistema de notificaciones inicializado:", success);

      return success;
    } catch (error) {
      console.error("❌ Error inicializando notificaciones:", error);
      return false;
    }
  }

  /**
   * Muestra una notificación inmediatamente (VERSIÓN MEJORADA)
   */
  public async showNotification(title: string, body: string, options?: NotificationOptions): Promise<void> {
    console.log("🔔 Intentando mostrar notificación:", title);

    // Verificar soporte y preferencias
    if (!this.isSupported()) {
      console.warn("❌ Navegador no soporta notificaciones");
      return;
    }

    const preferences = getUserPreferences();
    if (!preferences.notifications) {
      console.log("📵 Notificaciones desactivadas en preferencias");
      return;
    }

    const permission = this.getPermissionStatus();
    console.log("📋 Estado de permisos:", permission);

    if (permission === "granted") {
      try {
        // Si la app está en primer plano, usar notificación normal
        if (!document.hidden) {
          const notification = new Notification(title, {
            body,
            icon: "/icons/pwa-192x192.png",
            badge: "/icons/pwa-64x64.png",
            requireInteraction: true,
            silent: false,
            vibrate: [200, 100, 200],
            ...options,
          });

          console.log("✅ Notificación normal creada");

          notification.onclick = () => {
            window.focus();
            notification.close();
          };

          // Auto-cerrar después de 10 segundos si no requiere interacción
          if (!options?.requireInteraction) {
            setTimeout(() => notification.close(), 10000);
          }
        } else {
          // Si la app está en segundo plano, usar notificación persistente
          console.log("📱 App en segundo plano, usando notificación persistente");
          await this.showPersistentNotification(title, body, options?.tag);
        }
      } catch (error) {
        console.error("❌ Error creando notificación:", error);
      }
    } else if (permission === "default") {
      console.log("🔄 Solicitando permisos automáticamente...");
      const newPermission = await this.requestPermission();
      if (newPermission === "granted") {
        await this.showNotification(title, body, options);
      }
    } else {
      console.warn("⚠️ Permisos de notificación denegados");
    }
  }

  /**
   * Muestra una notificación persistente (funciona en background)
   */
  public async showPersistentNotification(title: string, body: string, tag?: string): Promise<void> {
    if (!isPersistentNotificationSupported()) {
      console.warn("⚠️ Notificaciones persistentes no soportadas, usando fallback");
      this.showNotification(title, body, { tag });
      return;
    }

    if (this.getPermissionStatus() !== "granted") {
      console.warn("⚠️ Sin permisos para notificaciones persistentes");
      return;
    }

    try {
      await showPersistentNotification(title, body, {
        tag,
        vibrate: [300, 100, 300],
        requireInteraction: true,
      });
    } catch (error) {
      console.error("❌ Error con notificación persistente, usando fallback:", error);
      this.showNotification(title, body, { tag });
    }
  }

  /**
   * Programa una notificación para que se muestre después de un cierto retraso
   */
  public scheduleNotification(
    id: string,
    delay: number,
    title: string,
    body: string,
    options?: NotificationOptions
  ): void {
    console.log(`⏰ Programando notificación "${id}" en ${Math.round(delay / 1000)}s`);

    // Cancelar notificación existente con el mismo ID
    if (this.scheduledNotifications.has(id)) {
      this.cancelNotification(id);
    }

    const timerId = window.setTimeout(async () => {
      console.log(`🔔 Ejecutando notificación programada: ${id}`);
      await this.showPersistentNotification(title, body, options?.tag || id);
      this.scheduledNotifications.delete(id);
    }, delay);

    this.scheduledNotifications.set(id, timerId);
    console.log(`✅ Notificación "${id}" programada exitosamente`);
  }

  /**
   * Cancela una notificación que fue programada previamente
   */
  public cancelNotification(id: string): void {
    if (this.scheduledNotifications.has(id)) {
      const timerId = this.scheduledNotifications.get(id)!;
      window.clearTimeout(timerId);
      this.scheduledNotifications.delete(id);
      console.log(`❌ Notificación cancelada: ${id}`);
    }
  }

  /**
   * Solicita permisos de notificación si no están concedidos
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error("Este navegador no soporta notificaciones.");
    }

    if (Notification.permission === "granted") {
      return "granted";
    }

    if (Notification.permission === "denied") {
      return "denied";
    }

    console.log("🔐 Solicitando permisos de notificación...");
    const permission = await Notification.requestPermission();
    console.log("📋 Permisos obtenidos:", permission);

    return permission;
  }

  /**
   * Verifica si las notificaciones están disponibles
   */
  public isSupported(): boolean {
    return "Notification" in window;
  }

  /**
   * Obtiene el estado actual de los permisos
   */
  public getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) {
      return "denied";
    }
    return Notification.permission;
  }

  /**
   * Obtiene todos los IDs de los timers activos
   */
  public getActiveTimers(): string[] {
    return Array.from(this.scheduledNotifications.keys());
  }

  /**
   * Obtiene información de debug del sistema de notificaciones
   */
  public getDebugInfo(): object {
    return {
      supported: this.isSupported(),
      permission: this.getPermissionStatus(),
      serviceWorkerReady: this.isServiceWorkerReady,
      activeTimers: this.getActiveTimers(),
      persistentSupported: isPersistentNotificationSupported(),
      preferences: getUserPreferences().notifications,
    };
  }

  /**
   * Método de debug para probar notificaciones
   */
  public async testNotification(): Promise<void> {
    console.log("🧪 Probando notificación...");
    await this.showPersistentNotification(
      "🧪 Prueba de Notificación",
      "Si ves esto, las notificaciones están funcionando correctamente",
      "test-notification"
    );
  }
}

export const notificationManager = NotificationManager.getInstance();
