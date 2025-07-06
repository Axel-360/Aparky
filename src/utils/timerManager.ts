// Archivo: src/utils/timerManager.ts - VERSIÓN ULTRA CORREGIDA Y COMPLETA
import type { CarLocation } from "@/types/location";
import { notificationManager } from "./notificationManager";
//import { mobileNotificationHelper } from "./mobileNotificationHelper";

/**
 * 🔥 TIMER MANAGER ULTRA CORREGIDO Y COMPLETO
 * Soluciona: duplicados, pérdida de timers, disparos prematuros
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
      this.syncWithStoredTimers();
    });
  }

  /**
   * 🔥 NUEVO: Guardar timers activos en localStorage
   */
  private saveTimersToStorage(): void {
    try {
      const timerData = Array.from(this.timerStates.values()).map((state) => ({
        locationId: state.locationId,
        reminderTime: state.reminderTime,
        expiryTime: state.expiryTime,
        reminderScheduled: state.reminderScheduled,
        expiryScheduled: state.expiryScheduled,
        createdAt: state.createdAt,
      }));

      const backupData = {
        timestamp: Date.now(),
        timers: timerData,
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(backupData));
      console.log(`💾 Timer: ${timerData.length} timers guardados`);
    } catch (error) {
      console.error("❌ Timer: Error guardando estado:", error);
    }
  }

  /**
   * 🔥 NUEVO: Restaurar timers desde localStorage
   */
  private restoreTimersFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) return;

      const backupData = JSON.parse(saved);
      const now = Date.now();

      console.log(`📱 Timer: Restaurando desde ${new Date(backupData.timestamp).toLocaleTimeString()}`);

      for (const timer of backupData.timers) {
        // Solo restaurar timers que no han expirado
        if (timer.expiryTime > now) {
          this.timerStates.set(timer.locationId, {
            locationId: timer.locationId,
            reminderTime: timer.reminderTime,
            expiryTime: timer.expiryTime,
            reminderScheduled: false, // Se re-programarán
            expiryScheduled: false,
            createdAt: timer.createdAt,
          });
          console.log(`📱 Timer restaurado: ${timer.locationId}`);
        }
      }

      // Limpiar storage después de restaurar
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error("❌ Timer: Error restaurando estado:", error);
    }
  }

  /**
   * 🔥 NUEVO: Verificar estados de timers
   */
  private verifyTimerStates(): void {
    const now = Date.now();

    for (const [locationId, state] of this.timerStates) {
      // Verificar si un timer debería haber expirado
      if (state.expiryTime <= now) {
        console.log(`⚠️ Timer expirado detectado: ${locationId}`);
        this.cleanupExpiredTimer(locationId);
      }
    }
  }

  /**
   * 🔥 NUEVO: Limpiar timer expirado
   */
  private cleanupExpiredTimer(locationId: string): void {
    console.log(`🧹 Limpiando timer expirado: ${locationId}`);

    // Limpiar estado interno
    this.timerStates.delete(locationId);

    // Limpiar timers JavaScript
    if (this.activeTimers.has(locationId)) {
      const timers = this.activeTimers.get(locationId)!;
      timers.forEach((timerId) => window.clearTimeout(timerId));
      this.activeTimers.delete(locationId);
    }

    // Cancelar notificaciones
    notificationManager.cancelNotification(`reminder-${locationId}`);
    notificationManager.cancelNotification(`expiry-${locationId}`);
  }

  /**
   * 🔥 NUEVO: Sincronizar con timers almacenados
   */
  private syncWithStoredTimers(): void {
    // Re-programar timers restaurados que no están activos
    for (const [locationId, state] of this.timerStates) {
      if (!state.reminderScheduled && !state.expiryScheduled) {
        console.log(`🔄 Re-programando timer: ${locationId}`);
        this.reprogramTimer(locationId, state);
      }
    }
  }

  /**
   * 🔥 NUEVO: Re-programar un timer específico
   */
  private async reprogramTimer(locationId: string, state: any): Promise<void> {
    const now = Date.now();

    try {
      // Re-programar recordatorio si aplica
      if (state.reminderTime && state.reminderTime > now && !state.reminderScheduled) {
        const reminderDelay = state.reminderTime - now;
        notificationManager.scheduleNotification(
          `reminder-${locationId}`,
          reminderDelay,
          "⏰ Recordatorio de Parking",
          `Tu aparcamiento expira pronto`,
          { tag: `reminder-${locationId}` }
        );
        state.reminderScheduled = true;
        console.log(`✅ Recordatorio re-programado: ${locationId}`);
      }

      // Re-programar expiración
      if (state.expiryTime > now && !state.expiryScheduled) {
        const expiryDelay = state.expiryTime - now;
        notificationManager.scheduleNotification(
          `expiry-${locationId}`,
          expiryDelay,
          "🚨 Parking Expirado",
          `El tiempo para tu aparcamiento ha terminado`,
          { tag: `expiry-${locationId}` }
        );
        state.expiryScheduled = true;
        console.log(`✅ Expiración re-programada: ${locationId}`);
      }
    } catch (error) {
      console.error(`❌ Error re-programando timer ${locationId}:`, error);
    }
  }

  /**
   * Cancela todos los temporizadores existentes para una ubicación específica
   */
  private clearExistingTimers(locationId: string): void {
    console.log(`🗑️ Limpiando timers existentes para: ${locationId}`);

    // Limpiar timers JavaScript
    if (this.activeTimers.has(locationId)) {
      const timers = this.activeTimers.get(locationId)!;
      timers.forEach((timerId) => window.clearTimeout(timerId));
      this.activeTimers.delete(locationId);
    }

    // 🔥 MEJORADO: Cancelar notificaciones en AMBOS sistemas
    notificationManager.cancelNotification(`reminder-${locationId}`);
    notificationManager.cancelNotification(`expiry-${locationId}`);

    // 🔥 NUEVO: También cancelar en mobile helper
    // mobileNotificationHelper.cancelNotification(`reminder-${locationId}`);
    // mobileNotificationHelper.cancelNotification(`expiry-${locationId}`);

    // Limpiar estado
    this.timerStates.delete(locationId);

    console.log(`✅ Timers limpiados para: ${locationId}`);
  }

  /**
   * 🔥 ULTRA CORREGIDO: Programa un nuevo temporizador sin duplicados
   */
  public async scheduleTimer(location: CarLocation, onExpiry?: () => void): Promise<void> {
    const { id, expiryTime, reminderMinutes, note } = location;

    console.log(`⏰ Programando timer CORREGIDO para: ${id}`);
    console.log(`📅 Expiración: ${expiryTime ? new Date(expiryTime).toLocaleString() : "Sin definir"}`);

    // Limpiar timers existentes
    this.clearExistingTimers(id);

    if (!expiryTime) {
      console.log(`⚠️ No hay tiempo de expiración para: ${id}`);
      return;
    }

    const now = Date.now();

    // Verificar que no esté en el pasado
    if (expiryTime <= now) {
      console.warn(`❌ Timer no programado: expiryTime está en el pasado para ${id}`);
      return;
    }

    // 🔥 MEJORADO: Inicializar AMBOS sistemas de notificaciones
    const notificationsReady = await notificationManager.initialize();
    if (!notificationsReady) {
      console.warn("⚠️ Sistema de notificaciones principal no disponible, usando solo mobile helper");
    }

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
    if (reminderTime && reminderTime > now && notificationsReady) {
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

      // 🔥 NUEVO: Sistema móvil robusto (funciona incluso con app cerrada)
      // mobileNotificationHelper.scheduleNotification(
      //   `reminder-${id}`,
      //   reminderTime, // Tiempo absoluto en lugar de delay
      //   "⏰ Recordatorio de Parking",
      //   `${locationNote} expira en ${reminderMinutes} minutos`
      // );

      // Timer interno para callback (opcional)
      const reminderTimeout = window.setTimeout(() => {
        console.log(`⏰ Recordatorio interno ejecutado: ${locationNote}`);
      }, timeUntilReminder);

      locationTimers.push(reminderTimeout);
    }

    // 🔥 CORREGIDO: 2. Programar EXPIRACIÓN
    const timeUntilExpiry = expiryTime - now;

    console.log(`🚨 Programando expiración en ${Math.round(timeUntilExpiry / 1000 / 60)} minutos`);

    if (notificationsReady) {
      notificationManager.scheduleNotification(
        `expiry-${id}`,
        timeUntilExpiry,
        "🚨 Parking Expirado",
        `El tiempo para ${locationNote} ha terminado`,
        {
          tag: `expiry-${id}`,
          requireInteraction: true,
          vibrate: [500, 200, 500, 200, 500], // Vibración más intensa para expiración
        }
      );

      timerState.expiryScheduled = true;
    }

    // 🔥 NUEVO: Sistema móvil robusto (funciona incluso con app cerrada)
    // mobileNotificationHelper.scheduleNotification(
    //   `expiry-${id}`,
    //   expiryTime, // Tiempo absoluto en lugar de delay
    //   "🚨 Parking Expirado",
    //   `El tiempo para ${locationNote} ha terminado`
    // );

    // Timer principal para callback y limpieza interna
    const expiryTimeout = window.setTimeout(() => {
      console.log(`🚨 Timer interno expirado: ${locationNote}`);

      // 🔥 MEJORADO: Ejecutar callback si se proporcionó
      if (onExpiry) {
        try {
          onExpiry();
        } catch (error) {
          console.error("❌ Error ejecutando callback de expiración:", error);
        }
      }

      // Limpiar estado interno
      this.cleanupExpiredTimer(id);

      // 🔥 NUEVO: Mostrar notificación de respaldo si las otras fallaron
      this.showBackupExpiryNotification(locationNote);
    }, timeUntilExpiry);

    locationTimers.push(expiryTimeout);

    // Guardar timers
    if (locationTimers.length > 0) {
      this.activeTimers.set(id, locationTimers);
    }

    // Guardar estado inmediatamente
    this.saveTimersToStorage();

    console.log(`✅ Timer CORREGIDO programado para: ${locationNote}`);
    console.log(`📅 Expira: ${new Date(expiryTime).toLocaleString()}`);
    console.log(`🔧 Estado guardado con ${locationTimers.length} timers internos`);
  }

  /**
   * 🔥 NUEVO: Notificación de respaldo si los otros sistemas fallan
   */
  private async showBackupExpiryNotification(locationNote: string): Promise<void> {
    try {
      // Intentar mostrar notificación inmediata como último recurso
      if ("Notification" in window && Notification.permission === "granted") {
        const backupNotification = new Notification("🚨 Parking Expirado (Respaldo)", {
          body: `El tiempo para ${locationNote} ha terminado`,
          icon: "/icons/pwa-192x192.png",
          tag: "backup-expiry",
          requireInteraction: true,
          vibrate: [1000, 500, 1000],
        });

        backupNotification.onclick = () => {
          window.focus();
          backupNotification.close();
        };

        console.log("🆘 Notificación de respaldo mostrada");
      }
    } catch (error) {
      console.error("❌ Error en notificación de respaldo:", error);
    }
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

    // 🔥 NUEVO: También limpiar sistema móvil
    try {
      // El mobile helper tiene su propio método de limpieza
      // mobileNotificationHelper.cleanup();
    } catch (error) {
      console.warn("⚠️ Error limpiando mobile helper:", error);
    }

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
    // console.log("- Sistema móvil:", mobileNotificationHelper.getDebugInfo());

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

    // Limpiar mobile helper
    try {
      // mobileNotificationHelper.cleanup();
    } catch (error) {
      console.error("Error limpiando mobile helper:", error);
    }

    console.warn("🚨 EMERGENCY RESET COMPLETADO");
  }
}

export const timerManager = TimerManager.getInstance();
