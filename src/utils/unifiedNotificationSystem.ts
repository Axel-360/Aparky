// src/utils/unifiedNotificationSystem.ts - VERSIÓN CORREGIDA PARA TU SW

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

  private setupEventListeners(): void {
    if (this.capabilities.hasServiceWorker) {
      navigator.serviceWorker?.addEventListener("message", (event) => {
        this.handleServiceWorkerMessage(event);
      });
    }

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        this.handleAppResumed();
      }
    });
  }

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

  private handleAppResumed(): void {
    console.log("📱 App volvió del background - verificando estado");

    if (this.registration?.active) {
      this.registration.active.postMessage({
        type: "GET_QUEUE_STATUS",
      });
    }
  }

  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      console.log("✅ Sistema ya inicializado");
      return true;
    }

    console.log("🚀 Inicializando sistema de notificaciones...");

    try {
      if (!this.capabilities.hasNotificationAPI) {
        console.warn("❌ API de notificaciones no disponible");
        return false;
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn("❌ Permisos de notificación denegados");
        return false;
      }

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

  private async initializeServiceWorker(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      this.registration = registration || null;

      if (this.registration) {
        console.log("✅ Service Worker encontrado:", this.registration.scope);

        if (!this.registration.active) {
          await navigator.serviceWorker.ready;
          const updatedRegistration = await navigator.serviceWorker.getRegistration();
          this.registration = updatedRegistration || null;
        }

        if (this.registration?.active) {
          this.registration.active.postMessage({
            type: "DEBUG_INFO",
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
      return this.showNotification(config);
    } else {
      const swSuccess = await this.scheduleWithServiceWorker(config);
      if (!swSuccess) {
        return this.scheduleWithTimeout(config);
      }
      return swSuccess;
    }
  }

  // 🔥 CORREGIDO: Formato compatible con tu SW
  private async scheduleWithServiceWorker(config: NotificationConfig): Promise<boolean> {
    if (!this.registration?.active) {
      console.log("⚠️ SW no disponible, usando fallback");
      return false;
    }

    try {
      const scheduledTime = Date.now() + (config.delay || 0);

      // 🔥 FORMATO CORREGIDO: Enviar datos en el formato que espera el SW
      const messageData = {
        type: "SCHEDULE_NOTIFICATION",
        // Datos directos, no anidados
        id: config.id,
        title: config.title,
        body: config.body,
        scheduledTime: scheduledTime,
        icon: config.icon || "/icons/pwa-192x192.png",
        badge: config.badge || "/icons/pwa-64x64.png",
        vibrate: config.vibrate || [300, 100, 300],
        tag: config.tag || config.id,
        requireInteraction: config.requireInteraction ?? true,
        data: config.data || {},
      };

      console.log(`📨 Enviando mensaje al SW:`, messageData);

      this.registration.active.postMessage(messageData);

      console.log(`✅ Notificación enviada a SW para programación: ${config.id} en ${config.delay}ms`);
      return true;
    } catch (error) {
      console.error("❌ Error enviando al SW:", error);
      return false;
    }
  }

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

  private async showNotification(config: NotificationConfig): Promise<boolean> {
    try {
      if (this.registration && this.capabilities.canShowPersistent) {
        return this.showPersistentNotification(config);
      } else {
        return this.showBasicNotification(config);
      }
    } catch (error) {
      console.error("Error mostrando notificación:", error);

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
        vibrate: config.vibrate || [200, 100, 200],
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

  private showBasicNotification(config: NotificationConfig): boolean {
    try {
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

  public cancelNotification(id: string): void {
    console.log(`❌ Cancelando notificación: ${id}`);

    const timeoutId = this.pendingNotifications.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.pendingNotifications.delete(id);
      console.log(`✅ Timeout cancelado: ${id}`);
    }

    if (this.registration?.active) {
      this.registration.active.postMessage({
        type: "CANCEL_NOTIFICATION",
        id: id, // Formato que espera tu SW
      });
      console.log(`📨 Cancelación enviada a SW: ${id}`);
    }
  }

  public async testNotification(): Promise<boolean> {
    const testConfig: NotificationConfig = {
      id: `test-${Date.now()}`,
      title: "🧪 Test de Notificación",
      body: `Prueba realizada a las ${new Date().toLocaleTimeString()}. ${
        this.registration ? "Usando SW" : "Modo básico"
      }`,
      delay: 0,
      vibrate: [300, 100, 300],
      requireInteraction: false,
    };

    try {
      const success = await this.scheduleNotification(testConfig);
      if (success) {
        console.log("✅ Test de notificación exitoso");
        return true;
      } else {
        console.error("❌ Test de notificación falló");
        return false;
      }
    } catch (error) {
      console.error("❌ Error en test de notificación:", error);
      return false;
    }
  }

  private showPermissionInstructions(): void {
    const { isIOS, isAndroid } = this.capabilities;

    if (isIOS) {
      console.warn(`
📱 INSTRUCCIONES PARA iOS:
1. Ve a Configuración > Safari > Sitios web > Notificaciones
2. Encuentra esta app y cambia a "Permitir"
3. Si es PWA: Configuración > Notificaciones > [Nombre de la app]
      `);
    } else if (isAndroid) {
      console.warn(`
📱 INSTRUCCIONES PARA ANDROID:
1. Toca el ícono de candado/información en la barra de direcciones
2. Activa "Notificaciones"
3. O ve a Configuración > Sitios > Notificaciones > 
   Permite las notificaciones para este sitio
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

  public cleanup(): void {
    console.log("🧹 Limpiando sistema de notificaciones...");

    for (const timeoutId of this.pendingNotifications.values()) {
      clearTimeout(timeoutId);
    }
    this.pendingNotifications.clear();

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

export const unifiedNotificationSystem = new UnifiedNotificationSystem();

if (typeof window !== "undefined") {
  (window as any).unifiedNotificationSystem = unifiedNotificationSystem;
}
