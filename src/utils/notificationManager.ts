// src/utils/notificationManager.ts - VERSIÓN COMPLETAMENTE CORREGIDA
import { registerNotificationSW, showPersistentNotification } from "./serviceWorkerNotifications";

/**
 * 🔥 SISTEMA DE NOTIFICACIONES CORREGIDO PARA MÓVIL
 */
class NotificationManager {
  private static instance: NotificationManager;
  private scheduledNotifications: Map<string, number> = new Map();
  private isServiceWorkerReady: boolean = false;

  // Control de estado para evitar duplicados
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

  // Control de visibilidad para evitar disparos prematuros
  private appVisible: boolean = !document.hidden;
  private lastVisibilityChange: number = Date.now();

  // Detección de dispositivo para estrategias específicas
  private deviceInfo = {
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
    isAndroid: /Android/.test(navigator.userAgent),
    isStandalone: window.matchMedia("(display-mode: standalone)").matches,
    isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  };

  // Persistencia en localStorage como backup
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
   * Inicializar Service Worker
   */
  private async initializeServiceWorker(): Promise<void> {
    try {
      this.isServiceWorkerReady = await registerNotificationSW();
      console.log(`🔔 NotificationManager: Service Worker inicializado: ${this.isServiceWorkerReady}`);
    } catch (error: any) {
      console.error("❌ Error inicializando Service Worker:", error);
      this.isServiceWorkerReady = false;
    }
  }

  /**
   * Configurar event listeners
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
   * Configurar handlers de visibilidad
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
   * Método principal para programar notificaciones
   */
  public async scheduleNotification(
    id: string,
    delay: number,
    title: string,
    body: string,
    options?: any
  ): Promise<boolean> {
    console.log(`📅 Programando notificación: ${id}`);
    console.log(`⏰ Delay: ${delay}ms (${Math.round(delay / 1000)}s)`);
    console.log(`📝 Título: ${title}`);

    // Validar parámetros
    if (!id || typeof delay !== "number" || isNaN(delay) || delay < 0) {
      console.error(`❌ Parámetros inválidos para notificación ${id}:`, { id, delay, title });
      return false;
    }

    // Verificar permisos
    if (Notification.permission !== "granted") {
      console.warn("❌ Sin permisos de notificación");
      return false;
    }

    // Cancelar notificación existente con el mismo ID
    this.cancelNotification(id);

    const scheduledTime = Date.now() + delay;

    // Crear estado de notificación
    this.notificationStates.set(id, {
      scheduled: true,
      executed: false,
      scheduledTime,
      createdAt: Date.now(),
    });

    try {
      // Si el delay es muy pequeño, mostrar inmediatamente
      if (delay <= 1000) {
        console.log(`⚡ Mostrando notificación inmediata: ${id}`);
        return await this.showImmediateNotification(title, body, options);
      }

      // Preferir Service Worker para delays largos
      if (this.isServiceWorkerReady && delay > 10000) {
        console.log(`📱 Enviando a Service Worker: ${id}`);
        return await this.scheduleWithServiceWorker(id, delay, title, body, options);
      } else {
        console.log(`⏰ Programando con timeout local: ${id}`);
        return this.scheduleWithTimeout(id, delay, title, body, options);
      }
    } catch (error: any) {
      console.error(`❌ Error programando notificación ${id}:`, error);
      this.notificationStates.delete(id);
      return false;
    }
  }

  /**
   * Programar con Service Worker usando formato correcto
   */
  private async scheduleWithServiceWorker(
    id: string,
    delay: number,
    title: string,
    body: string,
    options?: any
  ): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready;

      if (!registration.active) {
        console.warn("⚠️ Service Worker no activo");
        return this.scheduleWithTimeout(id, delay, title, body, options);
      }

      const scheduledTime = Date.now() + delay;

      // 🔥 FORMATO CORREGIDO: Datos planos que espera el SW
      const messageData = {
        type: "SCHEDULE_NOTIFICATION",
        id: id,
        title: title,
        body: body,
        scheduledTime: scheduledTime, // ✅ Timestamp absoluto válido
        icon: options?.icon || "/icons/pwa-192x192.png",
        badge: options?.badge || "/icons/pwa-64x64.png",
        vibrate: options?.vibrate || [300, 100, 300],
        tag: options?.tag || id,
        requireInteraction: options?.requireInteraction ?? true,
        data: options?.data || {},
      };

      console.log(`📨 Enviando a SW (notificationManager): ${id}`, messageData);

      registration.active.postMessage(messageData);

      // Marcar como transferido al SW
      const state = this.notificationStates.get(id);
      if (state) {
        state.transferredToSW = true;
      }

      console.log(`✅ Notificación enviada a SW para programación: ${id} en ${delay}ms`);
      return true;
    } catch (error: any) {
      console.error(`❌ Error enviando a Service Worker: ${error}`);
      return this.scheduleWithTimeout(id, delay, title, body, options);
    }
  }

  /**
   * Programar con timeout local
   */
  private scheduleWithTimeout(id: string, delay: number, title: string, body: string, options?: any): boolean {
    try {
      console.log(`⏰ Programando timeout local: ${id} en ${delay}ms`);

      const timeoutId = window.setTimeout(async () => {
        console.log(`🔔 Ejecutando notificación local: ${id}`);

        try {
          await this.showImmediateNotification(title, body, options);
          this.markNotificationAsExecuted(id);
        } catch (error: any) {
          console.error(`❌ Error mostrando notificación ${id}:`, error);
        }

        this.scheduledNotifications.delete(id);
      }, delay);

      this.scheduledNotifications.set(id, timeoutId);
      console.log(`✅ Timeout programado: ${id}`);
      return true;
    } catch (error: any) {
      console.error(`❌ Error programando timeout: ${error}`);
      return false;
    }
  }

  /**
   * Mostrar notificación inmediata
   */
  private async showImmediateNotification(title: string, body: string, options?: any): Promise<boolean> {
    try {
      if (this.isServiceWorkerReady) {
        // Usar notificación persistente si está disponible
        await showPersistentNotification(title, body, {
          icon: options?.icon || "/icons/pwa-192x192.png",
          badge: options?.badge || "/icons/pwa-64x64.png",
          tag: options?.tag,
          requireInteraction: options?.requireInteraction ?? false,
          vibrate: options?.vibrate || [200, 100, 200],
          data: options?.data,
        });
        console.log(`✅ Notificación persistente mostrada: ${title}`);
      } else {
        // Fallback a notificación básica
        const notification = new Notification(title, {
          body,
          icon: options?.icon || "/icons/pwa-192x192.png",
          badge: options?.badge || "/icons/pwa-64x64.png",
          tag: options?.tag,
          requireInteraction: options?.requireInteraction ?? false,
          vibrate: options?.vibrate || [200, 100, 200],
          data: options?.data,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Auto-cerrar si no requiere interacción
        if (!options?.requireInteraction) {
          setTimeout(() => notification.close(), 8000);
        }

        console.log(`✅ Notificación básica mostrada: ${title}`);
      }
      return true;
    } catch (error: any) {
      console.error(`❌ Error mostrando notificación inmediata: ${error}`);
      return false;
    }
  }

  /**
   * Cancelar notificación
   */
  public cancelNotification(id: string): void {
    console.log(`❌ Cancelando notificación: ${id}`);

    // Cancelar timeout si existe
    const timeoutId = this.scheduledNotifications.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.scheduledNotifications.delete(id);
      console.log(`✅ Timeout cancelado: ${id}`);
    }

    // Cancelar en Service Worker
    if (this.isServiceWorkerReady) {
      navigator.serviceWorker.ready
        .then((registration) => {
          if (registration.active) {
            registration.active.postMessage({
              type: "CANCEL_NOTIFICATION",
              id: id,
            });
            console.log(`📨 Cancelación enviada a SW: ${id}`);
          }
        })
        .catch((error: any) => {
          console.error(`❌ Error cancelando en SW: ${error}`);
        });
    }

    // Limpiar estado
    this.notificationStates.delete(id);
  }

  /**
   * Manejar cuando la app pasa a background
   */
  private onAppBackground(): void {
    console.log("📱 Transfiriendo notificaciones a sistemas background");

    // En móvil, transferir TODO al SW inmediatamente
    if (this.deviceInfo.isMobile) {
      this.transferAllNotificationsToSW();
    }

    // Guardar estado local
    this.saveToStorage();
  }

  /**
   * Manejar cuando la app vuelve a foreground
   */
  private onAppForeground(): void {
    console.log("📱 App en foreground - sincronizando estado");

    // Limpiar notificaciones ejecutadas
    this.cleanupExecutedNotifications();

    // Sincronizar estados
    this.syncNotificationStates();
  }

  /**
   * Transferir TODAS las notificaciones al SW
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

      for (const [notificationId, state] of this.notificationStates) {
        if (state.scheduled && !state.executed && !state.transferredToSW) {
          const delay = Math.max(0, state.scheduledTime - Date.now());

          console.log(`📱 Transfiriendo notificación ${notificationId} al SW (delay: ${delay}ms)`);

          // Enviar al SW
          registration.active.postMessage({
            type: "SCHEDULE_NOTIFICATION",
            id: notificationId,
            title: "⏰ ¡Tiempo agotado!",
            body: "Tu temporizador de aparcamiento ha finalizado.",
            scheduledTime: state.scheduledTime, // ✅ Usar timestamp absoluto
            icon: "/icons/pwa-192x192.png",
            badge: "/icons/pwa-64x64.png",
            vibrate: [500, 200, 500],
            tag: notificationId,
            requireInteraction: true,
            data: { id: notificationId },
          });

          // Cancelar timer local si existe
          if (this.scheduledNotifications.has(notificationId)) {
            const timerId = this.scheduledNotifications.get(notificationId)!;
            clearTimeout(timerId);
            this.scheduledNotifications.delete(notificationId);
          }

          // Marcar como transferido
          state.transferredToSW = true;
        }
      }
    } catch (error: any) {
      console.error("❌ Error transfiriendo notificaciones al SW:", error);
    }
  }

  /**
   * Limpiar notificaciones ejecutadas
   */
  private cleanupExecutedNotifications(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [notificationId, state] of this.notificationStates) {
      if (state.executed || state.scheduledTime < now - 60000) {
        this.notificationStates.delete(notificationId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Limpiadas ${cleaned} notificaciones antiguas`);
    }
  }

  /**
   * Sincronizar estados de notificaciones
   */
  private syncNotificationStates(): void {
    const now = Date.now();

    for (const [notificationId, state] of this.notificationStates) {
      if (state.scheduled && !state.executed && state.scheduledTime <= now) {
        console.log(`🔔 Notificación ${notificationId} debería haber sido ejecutada`);
        this.markNotificationAsExecuted(notificationId);
      }
    }
  }

  /**
   * Marcar notificación como ejecutada
   */
  private markNotificationAsExecuted(id: string): void {
    const state = this.notificationStates.get(id);
    if (state) {
      state.executed = true;
      console.log(`✅ Notificación marcada como ejecutada: ${id}`);
    }
  }

  /**
   * Manejar notificación in-app
   */
  private handleInAppNotification(detail: any): void {
    console.log("📱 Notificación in-app recibida:", detail);
    this.markNotificationAsExecuted(detail.id);
  }

  /**
   * Guardar estado en localStorage
   */
  private saveToStorage(): void {
    try {
      const stateData = {
        notifications: Array.from(this.notificationStates.entries()),
        lastSaved: Date.now(),
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stateData));
      console.log(`💾 Estado guardado: ${this.notificationStates.size} notificaciones`);
    } catch (error: any) {
      console.error("❌ Error guardando estado:", error);
    }
  }

  /**
   * Restaurar estado desde localStorage
   */
  private restoreFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const stateData = JSON.parse(stored);
        const now = Date.now();

        // Solo restaurar notificaciones de las últimas 24 horas
        const validEntries = stateData.notifications.filter(
          ([, state]: [string, any]) => state.scheduledTime > now - 86400000
        );

        this.notificationStates = new Map(validEntries);
        console.log(`📱 Restaurado estado desde: ${new Date(stateData.lastSaved).toLocaleTimeString()}`);
        console.log(`📱 ${this.notificationStates.size} notificaciones restauradas`);
      }
    } catch (error: any) {
      console.error("❌ Error restaurando estado:", error);
    }
  }

  /**
   * Inicializar sistema completo
   */
  public async initialize(): Promise<boolean> {
    console.log("🚀 Inicializando sistema de notificaciones...");

    try {
      // Verificar soporte básico
      if (!("Notification" in window)) {
        console.error("❌ Notificaciones no soportadas");
        return false;
      }

      // Verificar permisos
      if (Notification.permission !== "granted") {
        console.warn("⚠️ Permisos de notificación no concedidos");
        return false;
      }

      // Inicializar Service Worker
      await this.initializeServiceWorker();

      console.log("✅ Sistema de notificaciones inicializado");
      return true;
    } catch (error: any) {
      console.error("❌ Error inicializando sistema:", error);
      return false;
    }
  }

  /**
   * Test del sistema con mejor detección
   */
  public async testNotification(): Promise<boolean> {
    const testId = `test-${Date.now()}`;

    try {
      console.log("🧪 Iniciando test de notificación...");

      await this.scheduleNotification(
        testId,
        2000, // 2 segundos
        "🧪 Test de Notificación",
        `Prueba realizada a las ${new Date().toLocaleTimeString()}. ${
          this.isServiceWorkerReady ? "Usando SW" : "Modo básico"
        }. El sistema funciona correctamente.`,
        {
          vibrate: [300, 100, 300],
          requireInteraction: false,
        }
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

      return true;
    } catch (error: any) {
      console.error("❌ Error en test de notificación:", error);
      return false;
    }
  }

  /**
   * Obtener información del sistema
   */
  public getSystemInfo() {
    return {
      serviceWorkerReady: this.isServiceWorkerReady,
      deviceInfo: this.deviceInfo,
      permission: Notification.permission,
      scheduledCount: this.scheduledNotifications.size,
      stateCount: this.notificationStates.size,
      appVisible: this.appVisible,
      lastVisibilityChange: this.lastVisibilityChange,
    };
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

    if (Notification.permission !== "granted") {
      recommendations.push("Activa los permisos de notificación para el funcionamiento completo");
    }

    return recommendations;
  }

  public getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  /**
   * Mostrar notificación inmediata (método público)
   */
  public async showNotification(title: string, body: string, options?: any): Promise<boolean> {
    return this.showImmediateNotification(title, body, options);
  }

  /**
   * Obtener debug info del sistema
   */
  public getDebugInfo() {
    return this.getSystemInfo();
  }

  /**
   * Obtener lista de timers activos (simulado)
   */
  public getActiveTimers(): string[] {
    return Array.from(this.notificationStates.keys());
  }

  /**
   * Cancelar todas las notificaciones
   */
  public cancelAllNotifications(): void {
    console.log("🧹 Cancelando todas las notificaciones");

    // Cancelar todos los timeouts locales
    for (const [id, timeoutId] of this.scheduledNotifications) {
      clearTimeout(timeoutId);
      console.log(`✅ Timeout cancelado: ${id}`);
    }
    this.scheduledNotifications.clear();

    // Cancelar en Service Worker
    if (this.isServiceWorkerReady) {
      navigator.serviceWorker.ready
        .then((registration) => {
          if (registration.active) {
            registration.active.postMessage({
              type: "CLEAR_ALL_NOTIFICATIONS",
            });
            console.log("📨 Comando de limpieza enviado a SW");
          }
        })
        .catch((error: any) => {
          console.error(`❌ Error enviando comando de limpieza al SW: ${error}`);
        });
    }

    // Limpiar todos los estados
    this.notificationStates.clear();
    console.log("✅ Todas las notificaciones canceladas");
  }
}

export const notificationManager = NotificationManager.getInstance();

// Para debug global
(window as any).notificationManager = notificationManager;
