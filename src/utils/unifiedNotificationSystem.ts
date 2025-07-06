// src/utils/unifiedNotificationSystem.ts - VERSIÓN CONECTADA CON TU SW
/**
 * 🔥 SISTEMA UNIFICADO DE NOTIFICACIONES MÓVILES - CONECTADO CON SW EXISTENTE
 * Ahora se comunica con tu Service Worker para notificaciones programadas
 */

interface NotificationConfig {
  id: string;
  title: string;
  body: string;
  delay?: number;
  icon?: string;
  badge?: string;
  vibrate?: number[];
  tag?: string;
  requireInteraction?: boolean;
  data?: any;
}

interface DeviceCapabilities {
  hasNotificationAPI: boolean;
  hasServiceWorker: boolean;
  isPWA: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  canShowPersistent: boolean;
  canSchedule: boolean;
}

class UnifiedNotificationSystem {
  private capabilities: DeviceCapabilities;
  private isInitialized = false;
  private registration: ServiceWorkerRegistration | null = null;
  private pendingNotifications = new Map<string, NodeJS.Timeout>();

  constructor() {
    this.capabilities = this.detectCapabilities();
    this.setupEventListeners();
    console.log("🚀 Sistema de notificaciones inicializado");
    console.log("📱 Capacidades detectadas:", this.capabilities);
  }

  /**
   * Detectar capacidades del dispositivo
   */
  private detectCapabilities(): DeviceCapabilities {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      (window.navigator as any).standalone === true;

    return {
      hasNotificationAPI: "Notification" in window,
      hasServiceWorker: "serviceWorker" in navigator,
      isPWA,
      isIOS,
      isAndroid,
      canShowPersistent: this.checkPersistentSupport(),
      canSchedule: this.checkScheduleSupport(isIOS, isPWA),
    };
  }

  private checkPersistentSupport(): boolean {
    return "serviceWorker" in navigator && "showNotification" in ServiceWorkerRegistration.prototype;
  }

  private checkScheduleSupport(isIOS: boolean, isPWA: boolean): boolean {
    if (isIOS) return isPWA;
    return true;
  }

  /**
   * Configurar listeners de eventos
   */
  private setupEventListeners(): void {
    // Listener para mensajes del Service Worker
    if (this.capabilities.hasServiceWorker) {
      navigator.serviceWorker?.addEventListener("message", (event) => {
        this.handleServiceWorkerMessage(event);
      });
    }

    // Listener para cuando la app vuelve del background
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        this.handleAppResumed();
      }
    });
  }

  /**
   * Manejar mensajes del Service Worker
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data || {};

    console.log("📨 Mensaje del SW:", type, data);

    switch (type) {
      case "NOTIFICATION_EXECUTED":
        console.log("✅ Notificación ejecutada en SW:", data?.id);
        break;
      case "NOTIFICATION_FAILED":
        console.error("❌ Notificación falló en SW:", data?.id);
        break;
      case "QUEUE_STATUS":
        console.log("📋 Estado de cola SW:", data);
        break;
    }
  }

  /**
   * Manejar cuando la app vuelve del background
   */
  private handleAppResumed(): void {
    console.log("📱 App volvió del background - verificando estado");

    // Sincronizar con el SW
    if (this.registration?.active) {
      this.registration.active.postMessage({
        type: "GET_QUEUE_STATUS",
      });
    }
  }

  /**
   * Inicializar el sistema con Service Worker
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      console.log("✅ Sistema ya inicializado");
      return true;
    }

    console.log("🚀 Inicializando sistema de notificaciones...");

    try {
      // 1. Verificar soporte básico
      if (!this.capabilities.hasNotificationAPI) {
        console.warn("❌ API de notificaciones no disponible");
        return false;
      }

      // 2. Solicitar permisos
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn("❌ Permisos de notificación denegados");
        return false;
      }

      // 3. Inicializar Service Worker si está disponible
      if (this.capabilities.hasServiceWorker) {
        await this.initializeServiceWorker();
      }

      this.isInitialized = true;
      console.log("✅ Sistema de notificaciones inicializado");

      return true;
    } catch (error) {
      console.error("❌ Error inicializando notificaciones:", error);
      return false;
    }
  }

  /**
   * Inicializar Service Worker existente
   */
  private async initializeServiceWorker(): Promise<void> {
    try {
      // Buscar Service Worker existente
      const registration = await navigator.serviceWorker.getRegistration();
      this.registration = registration || null;

      if (this.registration) {
        console.log("✅ Service Worker encontrado:", this.registration.scope);

        // Esperar a que esté activo
        if (!this.registration.active) {
          await navigator.serviceWorker.ready;
          const updatedRegistration = await navigator.serviceWorker.getRegistration();
          this.registration = updatedRegistration || null;
        }

        // Enviar mensaje de inicialización al SW (formato simplificado)
        if (this.registration?.active) {
          this.registration.active.postMessage({
            type: "DEBUG_INFO", // Usar un mensaje que tu SW ya reconoce
          });
        }
      } else {
        console.log("ℹ️ No hay Service Worker registrado");
      }
    } catch (error) {
      console.error("❌ Error inicializando Service Worker:", error);
      this.registration = null;
    }
  }

  /**
   * Solicitar permisos de notificación
   */
  private async requestPermissions(): Promise<boolean> {
    if (Notification.permission === "granted") {
      console.log("✅ Permisos ya concedidos");
      return true;
    }

    if (Notification.permission === "denied") {
      console.log("❌ Permisos denegados");
      this.showPermissionInstructions();
      return false;
    }

    console.log("🔐 Solicitando permisos...");

    try {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        console.log("✅ Permisos concedidos");
        return true;
      } else {
        console.log("❌ Permisos denegados por el usuario");
        this.showPermissionInstructions();
        return false;
      }
    } catch (error) {
      console.error("Error solicitando permisos:", error);
      return false;
    }
  }

  /**
   * Programar notificación con SW o fallback
   */
  public async scheduleNotification(config: NotificationConfig): Promise<boolean> {
    if (!this.isInitialized) {
      console.log("⚠️ Sistema no inicializado, inicializando...");
      const success = await this.initialize();
      if (!success) return false;
    }

    if (Notification.permission !== "granted") {
      console.warn("❌ Sin permisos para mostrar notificaciones");
      return false;
    }

    console.log(`📅 Programando notificación: ${config.id}`);

    const delay = config.delay || 0;

    if (delay === 0) {
      // Mostrar inmediatamente
      return this.showNotification(config);
    } else {
      // Programar con Service Worker o fallback
      return this.scheduleWithServiceWorker(config) || this.scheduleWithTimeout(config);
    }
  }

  /**
   * Programar notificación con Service Worker
   */
  private async scheduleWithServiceWorker(config: NotificationConfig): Promise<boolean> {
    if (!this.registration?.active) {
      console.log("⚠️ SW no disponible, usando fallback");
      return false;
    }

    try {
      // 🔥 CORREGIDO: Formato compatible con tu SW existente
      this.registration.active.postMessage({
        type: "SCHEDULE_NOTIFICATION",
        // Usar el formato que espera tu SW
        id: config.id,
        title: config.title,
        body: config.body,
        scheduledTime: Date.now() + (config.delay || 0),
        icon: config.icon || "/icons/pwa-192x192.png",
        badge: config.badge || "/icons/pwa-64x64.png",
        vibrate: config.vibrate || [300, 100, 300],
        tag: config.tag || config.id,
        requireInteraction: config.requireInteraction ?? true,
        data: config.data,
        processed: false,
        retryCount: 0,
        createdAt: Date.now(),
      });

      console.log(`✅ Notificación enviada a SW para programación: ${config.id} en ${config.delay}ms`);
      return true;
    } catch (error) {
      console.error("❌ Error enviando al SW:", error);
      return false;
    }
  }

  /**
   * Programar notificación con setTimeout (fallback)
   */
  private scheduleWithTimeout(config: NotificationConfig): boolean {
    try {
      const delay = config.delay || 0;

      const timeoutId = setTimeout(() => {
        this.showNotification({ ...config, delay: 0 });
        this.pendingNotifications.delete(config.id);
      }, delay);

      this.pendingNotifications.set(config.id, timeoutId);
      console.log(`⏰ Notificación programada con timeout: ${config.id} (${delay}ms)`);
      return true;
    } catch (error) {
      console.error("❌ Error programando con timeout:", error);
      return false;
    }
  }

  /**
   * Mostrar notificación inmediatamente
   */
  private async showNotification(config: NotificationConfig): Promise<boolean> {
    try {
      // Decidir qué tipo de notificación usar
      if (this.registration && this.capabilities.canShowPersistent) {
        // Usar notificación persistente
        return this.showPersistentNotification(config);
      } else {
        // Usar notificación básica
        return this.showBasicNotification(config);
      }
    } catch (error) {
      console.error("Error mostrando notificación:", error);

      // Fallback: intentar el otro método
      try {
        if (this.registration) {
          return this.showPersistentNotification(config);
        } else {
          return this.showBasicNotification(config);
        }
      } catch (fallbackError) {
        console.error("Error en fallback:", fallbackError);
        return false;
      }
    }
  }

  /**
   * Mostrar notificación persistente (Service Worker)
   */
  private async showPersistentNotification(config: NotificationConfig): Promise<boolean> {
    if (!this.registration) {
      throw new Error("No hay Service Worker disponible");
    }

    try {
      await this.registration.showNotification(config.title, {
        body: config.body,
        icon: config.icon || "/icons/pwa-192x192.png",
        badge: config.badge || "/icons/pwa-64x64.png",
        tag: config.tag || config.id,
        requireInteraction: config.requireInteraction ?? true,
        vibrate: config.vibrate || [300, 100, 300],
        data: { id: config.id, ...config.data },
        timestamp: Date.now(),
        actions: [
          { action: "open", title: "📱 Abrir", icon: "/icons/pwa-64x64.png" },
          { action: "dismiss", title: "❌ Cerrar", icon: "/icons/pwa-64x64.png" },
        ],
      });

      console.log(`✅ Notificación persistente mostrada: ${config.id}`);
      return true;
    } catch (error) {
      console.error("Error con notificación persistente:", error);
      throw error;
    }
  }

  /**
   * Mostrar notificación básica (solo si no hay SW)
   */
  private showBasicNotification(config: NotificationConfig): boolean {
    try {
      // Verificar que realmente no hay SW activo
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        throw new Error("Service Worker activo - usar notificaciones persistentes");
      }

      const notification = new Notification(config.title, {
        body: config.body,
        icon: config.icon || "/icons/pwa-192x192.png",
        badge: config.badge || "/icons/pwa-64x64.png",
        tag: config.tag || config.id,
        requireInteraction: config.requireInteraction ?? false,
        vibrate: config.vibrate || [200, 100, 200],
        data: config.data,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      if (!config.requireInteraction) {
        setTimeout(() => notification.close(), 8000);
      }

      console.log(`✅ Notificación básica mostrada: ${config.id}`);
      return true;
    } catch (error) {
      console.error("Error con notificación básica:", error);
      throw error;
    }
  }

  /**
   * Cancelar notificación
   */
  public cancelNotification(id: string): void {
    console.log(`❌ Cancelando notificación: ${id}`);

    // Cancelar timeout si existe
    const timeoutId = this.pendingNotifications.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.pendingNotifications.delete(id);
      console.log(`✅ Timeout cancelado: ${id}`);
    }

    // Cancelar en Service Worker
    if (this.registration?.active) {
      this.registration.active.postMessage({
        type: "CANCEL_NOTIFICATION",
        id: id, // Formato directo que espera tu SW
      });
      console.log(`📨 Cancelación enviada a SW: ${id}`);
    }
  }

  /**
   * Test del sistema con mejor detección
   */
  public async testNotification(): Promise<boolean> {
    const testConfig: NotificationConfig = {
      id: `test-${Date.now()}`,
      title: "🧪 Test de Notificación",
      body: `Prueba realizada a las ${new Date().toLocaleTimeString()}. ${
        this.registration ? "Usando SW" : "Modo básico"
      }`,
      vibrate: [300, 100, 300],
      requireInteraction: false,
    };

    return this.scheduleNotification(testConfig);
  }

  /**
   * Mostrar instrucciones específicas del dispositivo
   */
  private showPermissionInstructions(): void {
    const { isIOS, isAndroid, isPWA } = this.capabilities;

    if (isIOS && !isPWA) {
      console.warn(`
🍎 INSTRUCCIONES PARA iOS:
1. Abre esta página en Safari (no Chrome)
2. Toca el botón de compartir
3. Selecciona "Añadir a pantalla de inicio"
4. Abre la app desde el icono instalado
5. Acepta los permisos de notificación
      `);
    } else if (isAndroid) {
      console.warn(`
🤖 INSTRUCCIONES PARA ANDROID:
1. Toca "Permitir" cuando aparezca el diálogo
2. Si ya fue denegado, ve a Configuración del navegador
3. Busca "Notificaciones" o "Permisos del sitio"
4. Permite las notificaciones para este sitio
      `);
    } else {
      console.warn(`
💻 INSTRUCCIONES PARA DESKTOP:
1. Toca "Permitir" en el diálogo de permisos
2. Si no aparece, revisa la barra de direcciones
3. Busca el icono de notificaciones y actívalo
      `);
    }
  }

  /**
   * Obtener estado actual del sistema
   */
  public getSystemStatus() {
    return {
      initialized: this.isInitialized,
      permission: Notification.permission,
      capabilities: this.capabilities,
      serviceWorkerReady: !!this.registration,
      serviceWorkerActive: !!navigator.serviceWorker?.controller,
      pendingCount: this.pendingNotifications.size,
      queuedCount: 0, // Se podría obtener del SW
      recommendations: this.getRecommendations(),
    };
  }

  /**
   * Obtener recomendaciones para el dispositivo actual
   */
  public getRecommendations(): string[] {
    const { isIOS, isAndroid, isPWA, canSchedule } = this.capabilities;
    const recommendations: string[] = [];

    if (isIOS && !isPWA) {
      recommendations.push("Instala la app en tu pantalla de inicio para notificaciones background");
      recommendations.push("Usa Safari (no Chrome) para la mejor experiencia");
    }

    if (isAndroid && !isPWA) {
      recommendations.push("Instala la app para notificaciones más fiables");
    }

    if (!canSchedule) {
      recommendations.push("Las notificaciones programadas funcionan mejor con la app instalada");
    }

    if (Notification.permission === "default") {
      recommendations.push("Acepta los permisos de notificación cuando se soliciten");
    }

    if (this.registration) {
      recommendations.push("✅ Service Worker conectado - notificaciones background disponibles");
    }

    return recommendations;
  }

  /**
   * Limpiar sistema
   */
  public cleanup(): void {
    console.log("🧹 Limpiando sistema de notificaciones...");

    // Cancelar todos los timeouts
    for (const timeoutId of this.pendingNotifications.values()) {
      clearTimeout(timeoutId);
    }
    this.pendingNotifications.clear();

    // Limpiar en Service Worker
    if (this.registration?.active) {
      this.registration.active.postMessage({
        type: "CLEAR_ALL_NOTIFICATIONS",
      });
    }

    this.isInitialized = false;
    this.registration = null;
    console.log("✅ Sistema limpiado");
  }
}

// Exportar instancia singleton
export const unifiedNotificationSystem = new UnifiedNotificationSystem();

// Hacer disponible globalmente en desarrollo
if (typeof window !== "undefined") {
  (window as any).unifiedNotificationSystem = unifiedNotificationSystem;
}
