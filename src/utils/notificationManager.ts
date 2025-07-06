// src/utils/notificationManager.ts - VERSIÓN CORREGIDA PARA MÓVIL
import { getUserPreferences } from "./preferences";
import {
  registerNotificationSW,
  showPersistentNotification,
  isPersistentNotificationSupported,
} from "./serviceWorkerNotifications";

/**
 * 🔥 SISTEMA DE NOTIFICACIONES CORREGIDO PARA MÓVIL
 */
class NotificationManager {
  private static instance: NotificationManager;
  private scheduledNotifications: Map<string, number> = new Map();
  private isServiceWorkerReady: boolean = false;

  // 🔥 NUEVO: Control de estado para evitar duplicados
  private notificationStates: Map<
    string,
    {
      scheduled: boolean;
      executed: boolean;
      scheduledTime: number;
      createdAt: number;
      transferredToSW?: boolean;
    }
  > = new Map();

  // 🔥 NUEVO: Control de visibilidad para evitar disparos prematuros
  private appVisible: boolean = !document.hidden;
  private lastVisibilityChange: number = Date.now();

  // 🔥 NUEVO: Detección de dispositivo para estrategias específicas
  private deviceInfo = {
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
    isAndroid: /Android/.test(navigator.userAgent),
    isStandalone: window.matchMedia("(display-mode: standalone)").matches,
    isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  };

  // 🔥 NUEVO: Persistencia en localStorage como backup
  private readonly STORAGE_KEY = "notification_timers_backup";

  private constructor() {
    this.initializeServiceWorker();
    this.setupVisibilityHandlers();
    this.setupEventListeners();
    this.restoreFromStorage();
  }

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * 🔥 NUEVO: Configurar event listeners
   */
  private setupEventListeners(): void {
    // Escuchar notificaciones desde el SW
    window.addEventListener("inAppNotification", (event: any) => {
      this.handleInAppNotification(event.detail);
    });

    // Escuchar cuando el SW procesa una notificación
    window.addEventListener("notificationProcessed", (event: any) => {
      this.markNotificationAsExecuted(event.detail.id);
    });
  }

  /**
   * 🔥 NUEVO: Configurar handlers de visibilidad
   */
  private setupVisibilityHandlers(): void {
    document.addEventListener("visibilitychange", () => {
      const wasVisible = this.appVisible;
      this.appVisible = !document.hidden;
      this.lastVisibilityChange = Date.now();

      console.log(
        `📱 App cambió visibilidad: ${wasVisible ? "visible" : "oculta"} → ${this.appVisible ? "visible" : "oculta"}`
      );

      if (this.appVisible && !wasVisible) {
        console.log("📱 App restaurada - verificando estado de notificaciones");
        this.onAppForeground();
      } else if (!this.appVisible && wasVisible) {
        console.log("📱 App a background - transfiriendo notificaciones");
        this.onAppBackground();
      }
    });

    // Handler para cuando la página se cierra
    window.addEventListener("beforeunload", () => {
      console.log("🚪 App cerrándose - guardando estado final");
      this.onAppBackground();
      this.saveToStorage();
    });

    // Handler para cuando la página se enfoca
    window.addEventListener("focus", () => {
      if (this.appVisible) {
        console.log("👁️ App enfocada - sincronizando estado");
        this.syncNotificationStates();
      }
    });
  }

  /**
   * 🔥 NUEVO: Manejar cuando la app pasa a background
   */
  private onAppBackground(): void {
    console.log("📱 Transfiriendo notificaciones a sistemas background");

    // 🔥 CRÍTICO: En móvil, transferir TODO al SW inmediatamente
    if (this.deviceInfo.isMobile) {
      this.transferAllNotificationsToSW();
    }

    // Guardar estado local
    this.saveToStorage();
  }

  /**
   * 🔥 NUEVO: Manejar cuando la app vuelve a foreground
   */
  private onAppForeground(): void {
    console.log("📱 App en foreground - sincronizando estado");

    // Limpiar notificaciones ejecutadas
    this.cleanupExecutedNotifications();

    // Sincronizar estados
    this.syncNotificationStates();
  }

  /**
   * 🔥 CRÍTICO: Transferir TODAS las notificaciones al SW
   */
  private async transferAllNotificationsToSW(): Promise<void> {
    if (!this.isServiceWorkerReady) {
      console.warn("⚠️ SW no listo para transferir notificaciones");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      if (!registration.active) {
        console.warn("⚠️ SW no activo");
        return;
      }

      console.log(`📱 Transfiriendo ${this.notificationStates.size} notificaciones al SW`);

      for (const [id, state] of this.notificationStates) {
        if (state.scheduled && !state.executed && !state.transferredToSW) {
          const delay = Math.max(0, state.scheduledTime - Date.now());

          console.log(`📱 Transfiriendo notificación ${id} al SW (delay: ${delay}ms)`);

          // Enviar al SW
          registration.active.postMessage({
            type: "SCHEDULE_NOTIFICATION",
            id,
            delay,
            title: "⏰ ¡Tiempo agotado!",
            body: "Tu temporizador de aparcamiento ha finalizado.",
            options: {},
          });

          // Cancelar timer local si existe
          if (this.scheduledNotifications.has(id)) {
            const timerId = this.scheduledNotifications.get(id)!;
            window.clearTimeout(timerId);
            this.scheduledNotifications.delete(id);
          }

          // Marcar como transferida
          state.transferredToSW = true;
        }
      }
    } catch (error) {
      console.error("❌ Error transfiriendo notificaciones al SW:", error);
    }
  }

  /**
   * 🔥 NUEVO: Manejar notificaciones dentro de la app
   */
  private handleInAppNotification(notification: any): void {
    console.log("📱 Mostrando notificación en la app:", notification);

    // Marcar como ejecutada
    this.markNotificationAsExecuted(notification.id);

    // Crear evento personalizado para la UI
    window.dispatchEvent(
      new CustomEvent("showInAppAlert", {
        detail: {
          title: notification.title,
          message: notification.body,
          type: "notification",
        },
      })
    );
  }

  /**
   * 🔥 NUEVO: Marcar notificación como ejecutada
   */
  private markNotificationAsExecuted(id: string): void {
    const state = this.notificationStates.get(id);
    if (state) {
      state.executed = true;
      console.log(`✅ Notificación ${id} marcada como ejecutada`);
    }
  }

  /**
   * 🔥 NUEVO: Guardar estado en localStorage
   */
  private saveToStorage(): void {
    try {
      const backupData = {
        timestamp: Date.now(),
        deviceInfo: this.deviceInfo,
        notifications: Array.from(this.notificationStates.entries()).map(([id, state]) => ({
          id,
          scheduled: state.scheduled,
          executed: state.executed,
          scheduledTime: state.scheduledTime,
          createdAt: state.createdAt,
          transferredToSW: state.transferredToSW,
          remainingTime: state.scheduledTime - Date.now(),
        })),
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(backupData));
      console.log(`💾 Estado guardado: ${backupData.notifications.length} notificaciones`);
    } catch (error) {
      console.error("❌ Error guardando estado:", error);
    }
  }

  /**
   * 🔥 NUEVO: Restaurar estado desde localStorage
   */
  private restoreFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) return;

      const backupData = JSON.parse(saved);
      const now = Date.now();

      console.log(`📱 Restaurando estado desde: ${new Date(backupData.timestamp).toLocaleTimeString()}`);

      for (const notif of backupData.notifications) {
        // Solo restaurar notificaciones que no han sido ejecutadas y no han expirado
        if (!notif.executed && notif.scheduledTime > now) {
          this.notificationStates.set(notif.id, {
            scheduled: false, // Se re-programará
            executed: false,
            scheduledTime: notif.scheduledTime,
            createdAt: notif.createdAt,
            transferredToSW: notif.transferredToSW || false,
          });
          console.log(
            `📱 Notificación restaurada: ${notif.id} (en ${Math.round((notif.scheduledTime - now) / 1000)}s)`
          );
        }
      }

      // Limpiar storage después de restaurar
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error("❌ Error restaurando estado:", error);
    }
  }

  /**
   * 🔥 NUEVO: Sincronizar estados de notificaciones
   */
  private syncNotificationStates(): void {
    const now = Date.now();

    for (const [id, state] of this.notificationStates) {
      // Si una notificación debería haber sido ejecutada pero no se marcó como tal
      if (state.scheduledTime <= now && !state.executed) {
        console.log(`⚠️ Notificación perdida detectada: ${id}`);
        // Marcar como ejecutada para evitar duplicados
        state.executed = true;
      }
    }
  }

  /**
   * 🔥 NUEVO: Limpiar notificaciones ejecutadas
   */
  private cleanupExecutedNotifications(): void {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    for (const [id, state] of this.notificationStates) {
      if (state.executed || state.scheduledTime < oneHourAgo) {
        this.notificationStates.delete(id);
        this.scheduledNotifications.delete(id);
        console.log(`🧹 Notificación limpiada: ${id}`);
      }
    }
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
   * 🔥 MEJORADO: Inicialización completa del sistema de notificaciones
   */
  public async initialize(): Promise<boolean> {
    try {
      console.log("🚀 Inicializando sistema de notificaciones...");

      if (!this.isSupported()) {
        console.warn("⚠️ Notificaciones no soportadas en este navegador");
        return false;
      }

      const preferences = getUserPreferences();
      if (!preferences.notifications) {
        console.log("📵 Notificaciones desactivadas en preferencias");
        return false;
      }

      if (!this.isServiceWorkerReady) {
        this.isServiceWorkerReady = await registerNotificationSW();
      }

      let permission = this.getPermissionStatus();
      if (permission === "default") {
        permission = await this.requestPermission();
      }

      const success = permission === "granted";

      // Información específica del dispositivo
      if (this.deviceInfo.isIOS && !this.deviceInfo.isStandalone) {
        console.warn("⚠️ iOS: Para notificaciones background, instala la app en pantalla de inicio");
      }

      console.log("✅ Sistema de notificaciones inicializado:", success);
      console.log("📱 Dispositivo:", this.deviceInfo);

      return success;
    } catch (error) {
      console.error("❌ Error inicializando notificaciones:", error);
      return false;
    }
  }

  /**
   * 🔥 ULTRA CORREGIDO: Programar notificación sin duplicados con soporte background MÓVIL
   */
  public async scheduleNotification(
    id: string,
    delay: number,
    title: string,
    body: string,
    options?: NotificationOptions
  ): Promise<void> {
    const scheduledTime = Date.now() + delay;

    console.log(`⏰ Programando notificación "${id}" para: ${new Date(scheduledTime).toLocaleTimeString()}`);

    // 🔥 VERIFICACIÓN: Evitar duplicados
    const existingState = this.notificationStates.get(id);
    if (existingState && existingState.scheduled && !existingState.executed) {
      console.log(`⚠️ Notificación "${id}" ya está programada, cancelando anterior`);
      this.cancelNotification(id);
    }

    // 🔥 VERIFICACIÓN: No programar en el pasado
    if (scheduledTime <= Date.now()) {
      console.warn(`❌ No se puede programar notificación en el pasado: ${id}`);
      return;
    }

    // Crear estado de tracking
    this.notificationStates.set(id, {
      scheduled: true,
      executed: false,
      scheduledTime,
      createdAt: Date.now(),
      transferredToSW: false,
    });

    // 🔥 CRÍTICO PARA MÓVIL: Enviar SIEMPRE al SW en dispositivos móviles
    if (this.deviceInfo.isMobile && this.isServiceWorkerReady) {
      console.log(`📱 Dispositivo móvil detectado - enviando directamente al SW: ${id}`);

      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration.active) {
          registration.active.postMessage({
            type: "SCHEDULE_NOTIFICATION",
            id,
            delay,
            title,
            body,
            options: options || {},
          });

          // Marcar como transferida
          const state = this.notificationStates.get(id);
          if (state) state.transferredToSW = true;

          console.log(`✅ Notificación ${id} enviada al SW para móvil`);
        }
      } catch (error) {
        console.warn("⚠️ Error enviando al SW, usando fallback local:", error);
        this.scheduleLocalNotification(id, delay, title, body, options);
      }
    } else {
      // Desktop: programar localmente
      this.scheduleLocalNotification(id, delay, title, body, options);
    }

    // Guardar estado inmediatamente
    this.saveToStorage();

    console.log(`✅ Notificación "${id}" programada exitosamente`);
  }

  /**
   * 🔥 NUEVO: Programar notificación local
   */
  private scheduleLocalNotification(
    id: string,
    delay: number,
    title: string,
    body: string,
    options?: NotificationOptions
  ): void {
    // Programar la notificación local
    const timerId = window.setTimeout(async () => {
      const state = this.notificationStates.get(id);

      // 🔥 VERIFICACIÓN: Solo ejecutar si no se ha ejecutado ya
      if (!state || state.executed) {
        console.log(`⚠️ Notificación "${id}" ya fue ejecutada o cancelada`);
        return;
      }

      console.log(`🔔 Ejecutando notificación programada: ${id}`);

      try {
        // Verificar si la app está visible
        if (this.appVisible && this.deviceInfo.isMobile) {
          // Mostrar en la app
          this.handleInAppNotification({ id, title, body });
        } else {
          // Mostrar notificación del sistema
          await this.showPersistentNotification(title, body, options?.tag || id);
        }

        // Marcar como ejecutada
        if (state) {
          state.executed = true;
        }
      } catch (error) {
        console.error(`❌ Error ejecutando notificación ${id}:`, error);
      }

      // Limpiar timer
      this.scheduledNotifications.delete(id);
    }, delay);

    this.scheduledNotifications.set(id, timerId);
  }

  /**
   * 🔥 CORREGIDO: Cancelar notificación con limpieza completa
   */
  public cancelNotification(id: string): void {
    console.log(`❌ Cancelando notificación: ${id}`);

    // Cancelar timer local si existe
    if (this.scheduledNotifications.has(id)) {
      const timerId = this.scheduledNotifications.get(id)!;
      window.clearTimeout(timerId);
      this.scheduledNotifications.delete(id);
    }

    // Cancelar en SW también
    if (this.isServiceWorkerReady) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.active) {
          registration.active.postMessage({
            type: "CANCEL_NOTIFICATION",
            id,
          });
        }
      });
    }

    // Limpiar estado
    this.notificationStates.delete(id);

    // Actualizar storage
    this.saveToStorage();

    console.log(`✅ Notificación "${id}" cancelada completamente`);
  }

  // ... resto de métodos sin cambios

  public async showNotification(title: string, body: string, options?: NotificationOptions): Promise<void> {
    const notificationId = options?.tag || `notification-${Date.now()}`;

    console.log("🔔 Solicitando mostrar notificación:", title, "ID:", notificationId);

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

    if (permission !== "granted") {
      console.warn("⚠️ Sin permisos para mostrar notificaciones");
      return;
    }

    try {
      // 🔥 MEJORADO: Estrategia según el dispositivo
      if (this.deviceInfo.isMobile && this.appVisible) {
        // Dispositivo móvil con app visible - mostrar en la app
        this.handleInAppNotification({ id: notificationId, title, body });
      } else {
        // App en background o desktop - usar notificación del sistema
        await this.showPersistentNotification(title, body, notificationId);
      }
    } catch (error) {
      console.error("❌ Error creando notificación:", error);
    }
  }

  public async showPersistentNotification(title: string, body: string, tag?: string): Promise<void> {
    if (!isPersistentNotificationSupported()) {
      console.warn("⚠️ Notificaciones persistentes no soportadas, usando fallback");

      // Fallback a notificación normal
      if (this.getPermissionStatus() === "granted") {
        const notification = new Notification(title, {
          body,
          icon: "/icons/pwa-192x192.png",
          badge: "/icons/pwa-64x64.png",
          tag: tag || `fallback-${Date.now()}`,
          requireInteraction: false,
          vibrate: [200, 100, 200],
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        setTimeout(() => notification.close(), 8000);
      }
      return;
    }

    if (this.getPermissionStatus() !== "granted") {
      console.warn("⚠️ Sin permisos para notificaciones persistentes");
      return;
    }

    try {
      await showPersistentNotification(title, body, {
        tag: tag || `persistent-${Date.now()}`,
        vibrate: [300, 100, 300, 100, 300],
        requireInteraction: true,
        icon: "/icons/pwa-192x192.png",
        badge: "/icons/pwa-64x64.png",
      });

      console.log("✅ Notificación persistente mostrada:", tag);
    } catch (error) {
      console.error("❌ Error con notificación persistente:", error);
      throw error;
    }
  }

  public cancelAllNotifications(): void {
    console.log("🧹 Cancelando TODAS las notificaciones");

    // Cancelar todos los timers locales
    for (const [id] of this.scheduledNotifications) {
      const timerId = this.scheduledNotifications.get(id)!;
      window.clearTimeout(timerId);
    }

    // Cancelar en SW
    if (this.isServiceWorkerReady) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.active) {
          // Enviar comando para limpiar cola del SW
          registration.active.postMessage({
            type: "CLEAR_ALL_NOTIFICATIONS",
          });
        }
      });
    }

    // Limpiar todo
    this.scheduledNotifications.clear();
    this.notificationStates.clear();

    // Limpiar storage
    localStorage.removeItem(this.STORAGE_KEY);

    console.log("✅ Todas las notificaciones canceladas");
  }

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

  public isSupported(): boolean {
    return "Notification" in window;
  }

  public getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) {
      return "denied";
    }
    return Notification.permission;
  }

  public getActiveTimers(): string[] {
    return Array.from(this.scheduledNotifications.keys());
  }

  public getDebugInfo(): object {
    return {
      supported: this.isSupported(),
      permission: this.getPermissionStatus(),
      serviceWorkerReady: this.isServiceWorkerReady,
      deviceInfo: this.deviceInfo,
      activeTimers: this.getActiveTimers(),
      notificationStates: Object.fromEntries(
        Array.from(this.notificationStates.entries()).map(([id, state]) => [
          id,
          {
            ...state,
            scheduledFor: new Date(state.scheduledTime).toLocaleTimeString(),
            remainingMs: state.scheduledTime - Date.now(),
          },
        ])
      ),
      persistentSupported: isPersistentNotificationSupported(),
      preferences: getUserPreferences().notifications,
      appVisible: this.appVisible,
      lastVisibilityChange: new Date(this.lastVisibilityChange).toLocaleTimeString(),
    };
  }

  public async testNotification(): Promise<void> {
    const testId = `test-${Date.now()}`;
    console.log("🧪 Probando notificación con ID:", testId);

    try {
      await this.showPersistentNotification(
        "🧪 Prueba de Notificación",
        `Test realizado a las ${new Date().toLocaleTimeString()}. El sistema funciona correctamente.`,
        testId
      );

      // Programar una notificación de prueba para 5 segundos
      setTimeout(async () => {
        await this.scheduleNotification(
          `test-scheduled-${Date.now()}`,
          5000,
          "⏰ Test de Programación",
          "Esta notificación se programó hace 5 segundos. ¡El sistema funciona!"
        );
      }, 1000);
    } catch (error) {
      console.error("❌ Error en test de notificación:", error);
      throw error;
    }
  }

  public isBackgroundNotificationAvailable(): boolean {
    if (this.deviceInfo.isAndroid) {
      return this.deviceInfo.isStandalone && this.isServiceWorkerReady;
    } else if (this.deviceInfo.isIOS) {
      return this.deviceInfo.isStandalone && this.isServiceWorkerReady;
    } else {
      // Desktop
      return this.isServiceWorkerReady;
    }
  }

  public getDeviceRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.deviceInfo.isIOS) {
      if (!this.deviceInfo.isStandalone) {
        recommendations.push("Instala la app en tu pantalla de inicio desde Safari para notificaciones background");
      }
      recommendations.push("Las notificaciones funcionan por tiempo limitado en background en iOS");
    } else if (this.deviceInfo.isAndroid) {
      if (!this.deviceInfo.isStandalone) {
        recommendations.push("Instala la app desde Chrome para mejor soporte de notificaciones");
      }
      recommendations.push("Android ofrece el mejor soporte para notificaciones background");
    } else {
      recommendations.push("En desktop, las notificaciones funcionan con la app minimizada");
    }

    if (this.getPermissionStatus() !== "granted") {
      recommendations.push("Activa los permisos de notificación para el funcionamiento completo");
    }

    return recommendations;
  }
}

export const notificationManager = NotificationManager.getInstance();

// Para debug global
(window as any).notificationManager = notificationManager;
