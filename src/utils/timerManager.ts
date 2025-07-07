// src/utils/timerManager.ts
import type { CarLocation } from "@/types/location";
import { notificationManager } from "./notificationManager";

/**
 * 🔥 TIMER MANAGER COMPLETO CON TODAS LAS FUNCIONES ORIGINALES + CORRECCIONES
 * Mantiene toda la funcionalidad original pero corrige el problema de notificaciones
 */
class TimerManager {
  private static instance: TimerManager;
  private activeTimers: Map<string, number[]> = new Map();

  // 🔥 NUEVO: Control de estado de timers para evitar duplicados
  private timerStates: Map<
    string,
    {
      locationId: string;
      reminderTime?: number;
      expiryTime: number;
      reminderScheduled: boolean;
      expiryScheduled: boolean;
      createdAt: number;
    }
  > = new Map();

  // 🔥 NUEVO: Persistencia para recuperación después de cierre
  private readonly STORAGE_KEY = "active_timers_backup";

  private constructor() {
    this.setupAppLifecycleHandlers();
    this.restoreTimersFromStorage();
  }

  public static getInstance(): TimerManager {
    if (!TimerManager.instance) {
      TimerManager.instance = new TimerManager();
    }
    return TimerManager.instance;
  }

  /**
   * 🔥 NUEVO: Configurar handlers del ciclo de vida de la app
   */
  private setupAppLifecycleHandlers(): void {
    // Guardar estado cuando la app se oculta
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        console.log("📱 Timer: App a background - guardando estado");
        this.saveTimersToStorage();
      } else {
        console.log("📱 Timer: App restaurada - verificando timers");
        this.verifyTimerStates();
      }
    });

    // Guardar estado antes de cerrar
    window.addEventListener("beforeunload", () => {
      console.log("🚪 Timer: App cerrándose - guardando estado");
      this.saveTimersToStorage();
    });

    // Restaurar estado cuando la app vuelve
    window.addEventListener("focus", () => {
      console.log("👁️ Timer: App enfocada - sincronizando");
      this.verifyTimerStates();
    });
  }

  /**
   * 🔥 NUEVO: Guardar estado de timers en localStorage
   */
  private saveTimersToStorage(): void {
    try {
      const data = {
        states: Array.from(this.timerStates.entries()),
        timestamp: Date.now(),
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      console.log(`💾 Estado de timers guardado: ${this.timerStates.size} items`);
    } catch (error) {
      console.error("❌ Error guardando estado de timers:", error);
    }
  }

  /**
   * 🔥 NUEVO: Restaurar estado de timers desde localStorage
   */
  private restoreTimersFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;

      const data = JSON.parse(stored);
      const restoredStates = new Map(data.states);

      console.log(`🔄 Restaurando ${restoredStates.size} timers desde storage`);

      // 🔥 CORREGIDO: Verificar y limpiar timers expirados con tipado correcto
      const now = Date.now();
      for (const [locationId, state] of restoredStates) {
        // 🔥 CORREGIDO: Verificar que state tiene la estructura correcta
        if (state && typeof state === "object" && "expiryTime" in state) {
          const timerState = state as {
            locationId: string;
            reminderTime?: number;
            expiryTime: number;
            reminderScheduled: boolean;
            expiryScheduled: boolean;
            createdAt: number;
          };

          // Verificar que el timer no haya expirado
          if (timerState.expiryTime > now) {
            this.timerStates.set(locationId as string, timerState); // 🔥 CORREGIDO: Cast explícito
            console.log(`✅ Timer restaurado: ${locationId}`);
          } else {
            console.log(`🗑️ Timer expirado descartado: ${locationId}`);
          }
        } else {
          console.warn(`⚠️ Estado de timer inválido para ${locationId}:`, state);
        }
      }
    } catch (error) {
      console.error("❌ Error restaurando timers:", error);
      // Limpiar storage corrupto
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * 🔥 NUEVO: Verificar estado de timers después de pausas
   */
  private verifyTimerStates(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [locationId, state] of this.timerStates) {
      if (state.expiryTime <= now) {
        console.log(`⏰ Timer expirado detectado: ${locationId}`);
        this.timerStates.delete(locationId);
        expiredCount++;

        // Mostrar notificación de expiración tardía
        this.showBackupNotification(`Timer expirado: ${locationId}`);
      }
    }

    if (expiredCount > 0) {
      console.log(`🧹 Limpiados ${expiredCount} timers expirados`);
      this.saveTimersToStorage();
    }
  }

  /**
   * 🔥 NUEVO: Sincronizar con timers guardados (método auxiliar)
   */
  private syncWithStoredTimers(): void {
    // Esta función es llamada por otros métodos de sincronización
    console.log("🔄 Sincronizando con timers almacenados...");
    this.verifyTimerStates();
  }

  /**
   * 🔥 NUEVO: Limpiar timer expirado específico
   */
  private cleanupExpiredTimer(locationId: string): void {
    console.log(`🧹 Limpiando timer expirado: ${locationId}`);
    this.clearExistingTimers(locationId);
  }

  /**
   * 🔥 PRINCIPAL: Programar timer para una ubicación CORREGIDO
   */
  public async scheduleTimer(location: CarLocation): Promise<void> {
    const { id, expiryTime, reminderMinutes, note } = location;

    if (!expiryTime) {
      console.warn(`⚠️ No hay expiryTime para ubicación ${id}`);
      return;
    }

    const now = Date.now();

    // 🔥 CORREGIDO: Verificar que no haya expirado
    if (expiryTime <= now) {
      console.warn(`⚠️ Timer ya expirado para ${id} (${(now - expiryTime) / 1000}s ago)`);
      return;
    }

    // 🔥 CORREGIDO: Limpiar timers existentes antes de crear nuevos
    this.clearExistingTimers(id);

    console.log(`⏰ Programando timer CORREGIDO para: ${note || id}`);
    console.log(`   - Expira en: ${Math.round((expiryTime - now) / 1000 / 60)} minutos`);

    const locationTimers: number[] = [];
    const locationNote = note ? `"${note}"` : "Tu aparcamiento";

    // Calcular tiempos
    const reminderTime = reminderMinutes ? expiryTime - reminderMinutes * 60000 : undefined;

    // Crear estado del timer
    const timerState = {
      locationId: id,
      reminderTime,
      expiryTime,
      reminderScheduled: false,
      expiryScheduled: false,
      createdAt: now,
    };

    this.timerStates.set(id, timerState);

    // 🔥 CORREGIDO: 1. Programar RECORDATORIO (si aplica)
    if (reminderTime && reminderTime > now) {
      const timeUntilReminder = reminderTime - now;

      console.log(`⏰ Programando recordatorio en ${Math.round(timeUntilReminder / 1000 / 60)} minutos`);

      // Sistema principal de notificaciones
      notificationManager.scheduleNotification(
        `reminder-${id}`,
        timeUntilReminder,
        "⏰ Recordatorio de Parking",
        `${locationNote} expira en ${reminderMinutes} minutos`,
        {
          tag: `reminder-${id}`,
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200],
        }
      );

      timerState.reminderScheduled = true;

      // Timer interno para callback (opcional)
      const reminderTimeout = window.setTimeout(() => {
        console.log(`⏰ Recordatorio interno ejecutado: ${locationNote}`);
      }, timeUntilReminder);

      locationTimers.push(reminderTimeout);
    }

    // 🔥 CORREGIDO: 2. Programar EXPIRACIÓN
    const timeUntilExpiry = expiryTime - now;
    console.log(`🚨 Programando expiración en ${Math.round(timeUntilExpiry / 1000 / 60)} minutos`);

    // Sistema principal de notificaciones
    notificationManager.scheduleNotification(
      `expiry-${id}`,
      timeUntilExpiry,
      "🚨 Parking Expirado",
      `El tiempo para ${locationNote} ha terminado`,
      {
        tag: `expiry-${id}`,
        requireInteraction: true,
        vibrate: [500, 200, 500, 200, 500],
      }
    );

    timerState.expiryScheduled = true;

    // Timer interno para mostrar notificación de respaldo
    const expiryTimeout = window.setTimeout(async () => {
      console.log(`🚨 Timer expirado - ejecutando respaldo: ${locationNote}`);
      await this.showBackupNotification(locationNote);
      this.timerStates.delete(id);
      this.saveTimersToStorage();
    }, timeUntilExpiry);

    locationTimers.push(expiryTimeout);

    // Guardar timers
    this.activeTimers.set(id, locationTimers);
    this.saveTimersToStorage();

    console.log(`✅ Timer programado exitosamente para: ${locationNote}`);
  }

  /**
   * 🔥 CORREGIDO: Mostrar notificación de respaldo SIN usar new Notification()
   */
  private async showBackupNotification(locationNote: string): Promise<void> {
    console.log("🆘 Mostrando notificación de respaldo para:", locationNote);

    try {
      // 🔥 CORREGIDO: Usar SOLO ServiceWorker, no new Notification()
      const registration = await navigator.serviceWorker.ready;

      if (registration && registration.active) {
        // Usar showNotification del Service Worker
        await registration.showNotification("🚨 Parking Expirado", {
          body: `El tiempo para ${locationNote} ha terminado`,
          icon: "/icons/pwa-192x192.png",
          badge: "/icons/pwa-64x64.png",
          tag: "parking-expired-backup",
          requireInteraction: true,
          vibrate: [1000, 500, 1000, 500, 1000],
          data: {
            type: "parking-expired",
            locationNote,
            timestamp: Date.now(),
          },
          actions: [
            { action: "open", title: "📱 Abrir App", icon: "/icons/pwa-64x64.png" },
            { action: "dismiss", title: "❌ Cerrar", icon: "/icons/pwa-64x64.png" },
          ],
        });

        console.log("✅ Notificación de respaldo SW mostrada correctamente");
      } else {
        throw new Error("Service Worker no disponible");
      }
    } catch (error) {
      console.error("❌ Error en notificación de respaldo SW:", error);

      // 🔥 ÚLTIMO RECURSO: Evento personalizado para la UI
      try {
        window.dispatchEvent(
          new CustomEvent("parkingExpiredFallback", {
            detail: {
              locationNote,
              message: "⏰ El tiempo de parking ha expirado",
              timestamp: Date.now(),
              type: "error",
            },
          })
        );

        console.log("🆘 Evento de respaldo disparado para la UI");

        // También mostrar toast si está disponible
        if (typeof window !== "undefined" && (window as any).toast) {
          (window as any).toast.error(`⏰ Parking expirado: ${locationNote}`);
        }
      } catch (eventError) {
        console.error("❌ Error disparando evento de respaldo:", eventError);
      }
    }
  }

  /**
   * 🔥 CORREGIDO: Limpiar timers existentes para evitar duplicados
   */
  private clearExistingTimers(locationId: string): void {
    console.log(`🧹 Limpiando timers existentes para: ${locationId}`);

    // Limpiar timeouts internos
    const existingTimers = this.activeTimers.get(locationId);
    if (existingTimers) {
      existingTimers.forEach((timerId) => {
        clearTimeout(timerId);
      });
      this.activeTimers.delete(locationId);
      console.log(`✅ Limpiados ${existingTimers.length} timeouts internos`);
    }

    // Cancelar notificaciones programadas
    notificationManager.cancelNotification(`reminder-${locationId}`);
    notificationManager.cancelNotification(`expiry-${locationId}`);

    // Limpiar estado
    this.timerStates.delete(locationId);

    console.log(`✅ Timers limpiados completamente para: ${locationId}`);
  }

  /**
   * 🔥 MEJORADO: Cancela manualmente todos los temporizadores para una ubicación
   */
  public cancelTimer(locationId: string): void {
    console.log(`❌ Cancelando timer CORREGIDO para: ${locationId}`);
    this.clearExistingTimers(locationId);
    this.saveTimersToStorage();
  }

  /**
   * 🔥 NUEVO: Extender timer existente (útil para extensiones desde la UI)
   */
  public async extendTimer(locationId: string, additionalMinutes: number, location: CarLocation): Promise<void> {
    console.log(`⏰ Extendiendo timer para ${locationId} por ${additionalMinutes} minutos`);

    // Cancelar timer actual
    this.cancelTimer(locationId);

    // Calcular nuevo tiempo de expiración
    const currentExpiry = location.expiryTime || Date.now();
    const newExpiryTime = currentExpiry + additionalMinutes * 60000;

    // Crear ubicación actualizada
    const updatedLocation: CarLocation = {
      ...location,
      expiryTime: newExpiryTime,
      extensionCount: (location.extensionCount || 0) + 1,
    };

    // Re-programar con nuevo tiempo
    await this.scheduleTimer(updatedLocation);

    console.log(`✅ Timer extendido exitosamente hasta: ${new Date(newExpiryTime).toLocaleTimeString()}`);
  }

  /**
   * 🔥 NUEVO: Re-programar timer (útil para sincronización después de fallos)
   */
  public async rescheduleTimer(location: CarLocation): Promise<void> {
    console.log(`🔄 Re-programando timer para ubicación: ${location.id}`);

    // Verificar que el timer no haya expirado
    if (location.expiryTime && location.expiryTime > Date.now()) {
      await this.scheduleTimer(location);
    } else {
      console.log(`⚠️ No se puede re-programar timer expirado para: ${location.id}`);
    }
  }

  /**
   * Obtiene todos los IDs de los timers activos
   */
  public getActiveTimers(): string[] {
    return Array.from(this.activeTimers.keys());
  }

  /**
   * 🔥 MEJORADO: Obtiene información detallada de los timers activos
   */
  public getTimerInfo(): Array<{
    locationId: string;
    timerCount: number;
    hasNotifications: boolean;
    hasMobileNotifications: boolean;
    state: any;
    expiresAt: string;
    remainingMinutes: number;
  }> {
    return Array.from(this.timerStates.entries()).map(([locationId, state]) => ({
      locationId,
      timerCount: this.activeTimers.get(locationId)?.length || 0,
      hasNotifications: notificationManager.getActiveTimers().some((id) => id.includes(locationId)),
      hasMobileNotifications: true, // Mobile helper siempre está activo
      state: {
        reminderScheduled: state.reminderScheduled,
        expiryScheduled: state.expiryScheduled,
      },
      expiresAt: new Date(state.expiryTime).toLocaleString(),
      remainingMinutes: Math.round((state.expiryTime - Date.now()) / 1000 / 60),
    }));
  }

  /**
   * 🔥 MEJORADO: Cancela todos los timers de todas las ubicaciones
   */
  public cancelAllTimers(): void {
    console.log("🗑️ Cancelando TODOS los timers (sistema mejorado)");

    // Cancelar todos los timers individuales
    for (const locationId of this.activeTimers.keys()) {
      this.clearExistingTimers(locationId);
    }

    // Limpiar todo
    this.activeTimers.clear();
    this.timerStates.clear();

    // Cancelar todas las notificaciones
    notificationManager.cancelAllNotifications();

    // Limpiar storage
    localStorage.removeItem(this.STORAGE_KEY);

    console.log("✅ Todos los timers cancelados");
  }

  /**
   * 🔥 NUEVO: Sincronizar timers con ubicaciones guardadas (útil después de reinicios)
   */
  public async syncWithSavedLocations(locations: CarLocation[]): Promise<void> {
    console.log("🔄 Sincronizando timers con ubicaciones guardadas");

    // Cancelar todos los timers actuales
    this.cancelAllTimers();

    // Re-programar timers para ubicaciones activas
    const activeLocations = locations.filter((location) => location.expiryTime && location.expiryTime > Date.now());

    console.log(`🔄 Sincronizando ${activeLocations.length} timers activos`);

    for (const location of activeLocations) {
      try {
        await this.scheduleTimer(location);
        console.log(`✅ Timer sincronizado: ${location.note || location.id}`);
      } catch (error) {
        console.error(`❌ Error sincronizando timer para ${location.id}:`, error);
      }
    }

    console.log("✅ Sincronización de timers completada");
  }

  /**
   * 🔥 MEJORADO: Método de debug para verificar estado completo
   */
  public debugStatus(): void {
    console.log("🔍 DEBUG - Estado COMPLETO de TimerManager:");
    console.log("- Timers JS activos:", this.getActiveTimers());
    console.log("- Estados de timers:", Object.fromEntries(this.timerStates));
    console.log("- Info detallada:", this.getTimerInfo());
    console.log("- Sistema principal:", notificationManager.getDebugInfo());

    // 🔥 NUEVO: Verificación de consistencia
    const principalNotifications = notificationManager.getActiveTimers();
    const timerIds = this.getActiveTimers();

    console.log("🔍 Verificación de consistencia:");
    console.log(
      "  - Timers sin notificaciones:",
      timerIds.filter((id) => !principalNotifications.some((notifId) => notifId.includes(id)))
    );
    console.log(
      "  - Notificaciones sin timers:",
      principalNotifications.filter((notifId) => !timerIds.some((id) => notifId.includes(id)))
    );

    // Estado de storage
    const saved = localStorage.getItem(this.STORAGE_KEY);
    console.log("💾 Storage backup:", saved ? "Presente" : "Vacío");
  }

  /**
   * 🔥 NUEVO: Test completo del sistema de timers
   */
  public async testTimerSystem(): Promise<void> {
    console.log("🧪 Iniciando test COMPLETO del sistema de timers");

    // Crear ubicación de prueba
    const testLocation: CarLocation = {
      id: "test-timer-ultra-" + Date.now(),
      latitude: 40.7128,
      longitude: -74.006,
      timestamp: Date.now(),
      note: "Test Ultra Corregido",
      expiryTime: Date.now() + 90 * 1000, // 90 segundos
      reminderMinutes: 1, // 1 minuto de recordatorio
    };

    try {
      console.log("🧪 Programando timer de prueba...");
      await this.scheduleTimer(testLocation);

      console.log("✅ Timer de prueba programado exitosamente");
      console.log("🔔 Deberías recibir notificaciones en 1 minuto y 1.5 minutos");
      console.log("📱 Puedes cerrar/minimizar la app para probar persistencia");

      // Auto-limpiar después de 3 minutos
      setTimeout(() => {
        this.cancelTimer(testLocation.id);
        console.log("🧹 Timer de prueba limpiado automáticamente");
      }, 3 * 60000);
    } catch (error) {
      console.error("❌ Error en test del sistema:", error);
    }
  }

  /**
   * 🔥 NUEVO: Verificar si un timer específico está activo
   */
  public isTimerActive(locationId: string): boolean {
    const state = this.timerStates.get(locationId);
    return state ? state.expiryTime > Date.now() : false;
  }

  /**
   * 🔥 NUEVO: Obtener tiempo restante para un timer
   */
  public getRemainingTime(locationId: string): number | null {
    const state = this.timerStates.get(locationId);
    if (!state) return null;

    const remaining = state.expiryTime - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * 🔥 NUEVO: Forzar sincronización manual
   */
  public forceSyncronization(): void {
    console.log("🔄 Forzando sincronización manual");
    this.verifyTimerStates();
    this.syncWithStoredTimers();
    this.saveTimersToStorage();
    console.log("✅ Sincronización manual completada");
  }

  /**
   * 🔥 NUEVO: Obtener estadísticas del sistema
   */
  public getSystemStats(): {
    activeTimers: number;
    totalStates: number;
    nextExpiration: string | null;
    systemHealth: "good" | "warning" | "error";
  } {
    const activeCount = this.getActiveTimers().length;
    const stateCount = this.timerStates.size;

    // Encontrar próxima expiración
    let nextExpiration: number | null = null;
    for (const state of this.timerStates.values()) {
      if (state.expiryTime > Date.now()) {
        if (!nextExpiration || state.expiryTime < nextExpiration) {
          nextExpiration = state.expiryTime;
        }
      }
    }

    // Determinar salud del sistema
    let systemHealth: "good" | "warning" | "error" = "good";
    if (Math.abs(activeCount - stateCount) > 2) {
      systemHealth = "warning";
    }
    if (activeCount === 0 && stateCount > 0) {
      systemHealth = "error";
    }

    return {
      activeTimers: activeCount,
      totalStates: stateCount,
      nextExpiration: nextExpiration ? new Date(nextExpiration).toLocaleString() : null,
      systemHealth,
    };
  }

  /**
   * 🔥 NUEVO: Reparar inconsistencias del sistema
   */
  public async repairSystem(): Promise<void> {
    console.log("🔧 Iniciando reparación del sistema");

    try {
      // 1. Verificar y limpiar estados inconsistentes
      this.verifyTimerStates();

      // 2. Cancelar todos los timers actuales
      this.cancelAllTimers();

      // 3. Restaurar desde storage si existe
      this.restoreTimersFromStorage();

      // 4. Re-sincronizar todo
      this.syncWithStoredTimers();

      console.log("✅ Reparación del sistema completada");
    } catch (error) {
      console.error("❌ Error durante la reparación:", error);
    }
  }

  /**
   * 🔥 NUEVO: Obtener información para UI
   */
  public getUIInfo(): {
    hasActiveTimers: boolean;
    nextExpirationText: string;
    systemStatus: string;
    totalActiveTimers: number;
  } {
    const stats = this.getSystemStats();

    return {
      hasActiveTimers: stats.activeTimers > 0,
      nextExpirationText: stats.nextExpiration || "Sin timers activos",
      systemStatus:
        stats.systemHealth === "good"
          ? "✅ Sistema OK"
          : stats.systemHealth === "warning"
          ? "⚠️ Advertencia"
          : "❌ Error",
      totalActiveTimers: stats.activeTimers,
    };
  }

  /**
   * 🔥 NUEVO: Limpiar timers expirados manualmente
   */
  public cleanupExpiredTimers(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [locationId, state] of this.timerStates) {
      if (state.expiryTime <= now) {
        this.cleanupExpiredTimer(locationId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Limpiados ${cleanedCount} timers expirados manualmente`);
      this.saveTimersToStorage();
    }

    return cleanedCount;
  }

  /**
   * 🔥 NUEVO: Exportar estado para debugging
   */
  public exportDebugState(): string {
    const debugData = {
      timestamp: new Date().toISOString(),
      activeTimers: Object.fromEntries(this.activeTimers),
      timerStates: Object.fromEntries(this.timerStates),
      systemStats: this.getSystemStats(),
      notificationManagerState: notificationManager.getDebugInfo(),
    };

    return JSON.stringify(debugData, null, 2);
  }

  /**
   * 🔥 NUEVO: Método de emergencia para resetear todo
   */
  public emergencyReset(): void {
    console.warn("🚨 EMERGENCY RESET - Limpiando todo el sistema");

    // Cancelar todos los timers JavaScript
    for (const [, timers] of this.activeTimers) {
      timers.forEach((timerId) => window.clearTimeout(timerId));
    }

    // Limpiar todas las estructuras
    this.activeTimers.clear();
    this.timerStates.clear();

    // Limpiar storage
    localStorage.removeItem(this.STORAGE_KEY);

    // Cancelar todas las notificaciones
    notificationManager.cancelAllNotifications();

    console.warn("🚨 EMERGENCY RESET COMPLETADO");
  }

  /**
   * 🔥 NUEVO: Limpiar todo el sistema
   */
  public cleanup(): void {
    console.log("🧹 Limpiando sistema completo de timers");

    // Cancelar todos los timers activos
    for (const locationId of this.activeTimers.keys()) {
      this.clearExistingTimers(locationId);
    }

    // Limpiar storage
    localStorage.removeItem(this.STORAGE_KEY);

    console.log("✅ Sistema de timers limpiado completamente");
  }
}

export const timerManager = TimerManager.getInstance();
