// src/utils/timerManager.ts
import type { CarLocation } from "@/types/location";

class TimerManager {
  private static instance: TimerManager;
  private activeTimers: Map<string, number[]> = new Map();

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

  private onTimerExpirationCallbacks: Array<(locationId: string, locationNote: string) => void> = [];
  private onTimerReminderCallbacks: Array<(locationId: string, locationNote: string, minutesLeft: number) => void> = [];

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

  public onTimerExpiration(callback: (locationId: string, locationNote: string) => void): void {
    this.onTimerExpirationCallbacks.push(callback);
  }

  public onTimerReminder(callback: (locationId: string, locationNote: string, minutesLeft: number) => void): void {
    this.onTimerReminderCallbacks.push(callback);
  }

  private executeExpirationCallbacks(locationId: string, locationNote: string): void {
    this.onTimerExpirationCallbacks.forEach((callback) => {
      try {
        callback(locationId, locationNote);
      } catch (error) {
        console.error("Error en callback de expiración:", error);
      }
    });
  }

  private executeReminderCallbacks(locationId: string, locationNote: string, minutesLeft: number): void {
    this.onTimerReminderCallbacks.forEach((callback) => {
      try {
        callback(locationId, locationNote, minutesLeft);
      } catch (error) {
        console.error("Error en callback de recordatorio:", error);
      }
    });
  }

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

    window.addEventListener("beforeunload", () => {
      console.log("🚪 Timer: App cerrándose - guardando estado");
      this.saveTimersToStorage();
    });

    window.addEventListener("focus", () => {
      console.log("👁️ Timer: App enfocada - sincronizando");
      this.verifyTimerStates();
    });
  }

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

  private restoreTimersFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;

      const data = JSON.parse(stored);
      const restoredStates = new Map(data.states);

      console.log(`🔄 Restaurando ${restoredStates.size} timers desde storage`);

      const now = Date.now();
      for (const [locationId, state] of restoredStates) {
        if (
          state &&
          typeof state === "object" &&
          typeof locationId === "string" &&
          "expiryTime" in state &&
          typeof state.expiryTime === "number"
        ) {
          const timerState = state as {
            locationId: string;
            reminderTime?: number;
            expiryTime: number;
            reminderScheduled: boolean;
            expiryScheduled: boolean;
            createdAt: number;
          };

          if (timerState.expiryTime > now) {
            this.timerStates.set(locationId, timerState);
            console.log(`🔄 Timer restaurado: ${locationId}`);
          } else {
            console.log(`🗑️ Timer expirado eliminado del storage: ${locationId}`);
          }
        }
      }

      console.log(`✅ Restauración completada: ${this.timerStates.size} timers activos`);
    } catch (error) {
      console.error("❌ Error restaurando timers:", error);
    }
  }

  private verifyTimerStates(): void {
    const now = Date.now();
    const expiredTimers: string[] = [];

    for (const [locationId, state] of this.timerStates) {
      if (state.expiryTime <= now) {
        expiredTimers.push(locationId);
      }
    }

    if (expiredTimers.length > 0) {
      console.log(`🧹 Limpiando ${expiredTimers.length} timers expirados`);
      expiredTimers.forEach((id) => this.cleanupExpiredTimer(id));
      this.saveTimersToStorage();
    }
  }

  private cleanupExpiredTimer(locationId: string): void {
    this.clearExistingTimers(locationId);
    this.timerStates.delete(locationId);
    console.log(`🗑️ Timer expirado limpiado: ${locationId}`);
  }

  public cancelTimer(locationId: string): void {
    console.log(`🗑️ Cancelando timer para: ${locationId}`);
    this.clearExistingTimers(locationId);
    this.timerStates.delete(locationId);
    this.saveTimersToStorage();
  }

  private clearExistingTimers(locationId: string): void {
    const existingTimers = this.activeTimers.get(locationId);
    if (existingTimers?.length) {
      existingTimers.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      console.log(`🗑️ ${existingTimers.length} timers JS cancelados para: ${locationId}`);
    }
    this.activeTimers.delete(locationId);
  }

  public async scheduleTimer(location: CarLocation): Promise<void> {
    if (!location.expiryTime) {
      console.warn("⚠️ No se puede programar timer sin tiempo de expiración");
      return;
    }

    const now = Date.now();
    const { id, note: locationNote = "Ubicación sin nombre", expiryTime, reminderMinutes } = location;

    if (expiryTime <= now) {
      console.warn(`⚠️ No se puede programar timer para el pasado: ${locationNote}`);
      return;
    }

    this.clearExistingTimers(id);

    console.log(`⏱️ Programando timer para: ${locationNote}`);
    console.log(`⏱️ Expira en: ${Math.round((expiryTime - now) / 1000 / 60)} minutos`);

    const locationTimers: number[] = [];
    const reminderTime = reminderMinutes ? expiryTime - reminderMinutes * 60000 : undefined;

    const timerState = {
      locationId: id,
      reminderTime,
      expiryTime,
      reminderScheduled: false,
      expiryScheduled: false,
      createdAt: now,
    };

    this.timerStates.set(id, timerState);

    if (reminderTime && reminderTime > now) {
      const timeUntilReminder = reminderTime - now;
      console.log(`⏰ Programando recordatorio en ${Math.round(timeUntilReminder / 1000 / 60)} minutos`);

      const reminderTimeout = window.setTimeout(() => {
        console.log(`⏰ Recordatorio activado para: ${locationNote}`);
        const minutesLeft = Math.round((expiryTime - Date.now()) / 1000 / 60);

        this.executeReminderCallbacks(id, locationNote, minutesLeft);
      }, timeUntilReminder);

      locationTimers.push(reminderTimeout);
      timerState.reminderScheduled = true;
    }

    const timeUntilExpiry = expiryTime - now;
    console.log(`🚨 Programando expiración en ${Math.round(timeUntilExpiry / 1000 / 60)} minutos`);

    const expiryTimeout = window.setTimeout(() => {
      console.log(`🚨 Timer expirado para: ${locationNote}`);

      this.executeExpirationCallbacks(id, locationNote);

      this.timerStates.delete(id);
      this.saveTimersToStorage();
    }, timeUntilExpiry);

    locationTimers.push(expiryTimeout);
    timerState.expiryScheduled = true;

    this.activeTimers.set(id, locationTimers);
    this.saveTimersToStorage();

    console.log(`✅ Timer programado exitosamente para: ${locationNote}`);
  }

  public getActiveTimers(): string[] {
    return Array.from(this.activeTimers.keys());
  }

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
      hasNotifications: false,
      hasMobileNotifications: false,
      state: {
        reminderScheduled: state.reminderScheduled,
        expiryScheduled: state.expiryScheduled,
      },
      expiresAt: new Date(state.expiryTime).toLocaleString(),
      remainingMinutes: Math.round((state.expiryTime - Date.now()) / 1000 / 60),
    }));
  }

  public cancelAllTimers(): void {
    console.log("🗑️ Cancelando TODOS los timers");

    for (const locationId of this.activeTimers.keys()) {
      this.clearExistingTimers(locationId);
    }

    this.activeTimers.clear();
    this.timerStates.clear();

    localStorage.removeItem(this.STORAGE_KEY);

    console.log("✅ Todos los timers cancelados");
  }

  public async syncWithSavedLocations(locations: CarLocation[]): Promise<void> {
    console.log("🔄 Sincronizando timers con ubicaciones guardadas");

    this.cancelAllTimers();

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

  public debugStatus(): void {
    console.log("🔍 DEBUG - Estado COMPLETO de TimerManager:");
    console.log("- Timers JS activos:", this.getActiveTimers());
    console.log("- Estados de timers:", Object.fromEntries(this.timerStates));
    console.log("- Info detallada:", this.getTimerInfo());

    console.log("- Callbacks registrados:", {
      expiration: this.onTimerExpirationCallbacks.length,
      reminder: this.onTimerReminderCallbacks.length,
    });

    const saved = localStorage.getItem(this.STORAGE_KEY);
    console.log("💾 Storage backup:", saved ? JSON.parse(saved) : "Vacío");
  }

  public getSystemStats(): {
    activeTimers: number;
    totalStates: number;
    nextExpiration: string | null;
    systemHealth: "good" | "warning" | "error";
  } {
    const activeCount = this.getActiveTimers().length;
    const stateCount = this.timerStates.size;

    let nextExpiration: number | null = null;
    for (const state of this.timerStates.values()) {
      if (state.expiryTime > Date.now()) {
        if (!nextExpiration || state.expiryTime < nextExpiration) {
          nextExpiration = state.expiryTime;
        }
      }
    }

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

  public async testTimerSystem(): Promise<void> {
    console.log("🧪 Iniciando test del sistema de timers (SIN notificaciones push)");

    const testLocation: CarLocation = {
      id: "test-timer-" + Date.now(),
      latitude: 40.7128,
      longitude: -74.006,
      timestamp: Date.now(),
      note: "Test Timer Sistema",
      expiryTime: Date.now() + 90 * 1000,
      reminderMinutes: 1,
    };

    try {
      console.log("🧪 Programando timer de prueba...");
      await this.scheduleTimer(testLocation);

      console.log("✅ Timer de prueba programado exitosamente");
      console.log("⏱️ Los callbacks se ejecutarán en 1 minuto y 1.5 minutos");

      setTimeout(() => {
        this.cancelTimer(testLocation.id);
        console.log("🧹 Timer de prueba limpiado automáticamente");
      }, 3 * 60000);
    } catch (error) {
      console.error("❌ Error en test del sistema:", error);
    }
  }

  public isTimerActive(locationId: string): boolean {
    const state = this.timerStates.get(locationId);
    return state ? state.expiryTime > Date.now() : false;
  }

  public getRemainingTime(locationId: string): number | null {
    const state = this.timerStates.get(locationId);
    if (!state) return null;

    const remaining = state.expiryTime - Date.now();
    return remaining > 0 ? remaining : 0;
  }

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

  public cleanup(): void {
    console.log("🧹 Limpiando sistema completo de timers");

    for (const locationId of this.activeTimers.keys()) {
      this.clearExistingTimers(locationId);
    }

    localStorage.removeItem(this.STORAGE_KEY);

    console.log("✅ Sistema de timers limpiado completamente");
  }
}

export const timerManager = TimerManager.getInstance();

if (typeof window !== "undefined") {
  (window as any).timerManager = timerManager;
}
