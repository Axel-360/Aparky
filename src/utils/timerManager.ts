// Archivo: src/utils/timerManager.ts
import type { CarLocation } from "@/types/location";
import { notificationManager } from "./notificationManager";

/**
 * Clase TimerManager para gestionar de forma centralizada todos los temporizadores de parking.
 * VERSIÓN MEJORADA con notificaciones persistentes
 */
class TimerManager {
  private static instance: TimerManager;
  private activeTimers: Map<string, number[]> = new Map();

  private constructor() {}

  public static getInstance(): TimerManager {
    if (!TimerManager.instance) {
      TimerManager.instance = new TimerManager();
    }
    return TimerManager.instance;
  }

  /**
   * Cancela todos los temporizadores existentes para una ubicación específica
   */
  private clearExistingTimers(locationId: string): void {
    if (this.activeTimers.has(locationId)) {
      const timers = this.activeTimers.get(locationId)!;
      timers.forEach((timerId) => window.clearTimeout(timerId));
      this.activeTimers.delete(locationId);

      // También cancelar notificaciones programadas
      notificationManager.cancelNotification(`reminder-${locationId}`);
      notificationManager.cancelNotification(`expiry-${locationId}`);

      console.log(`🗑️ Timers limpiados para ubicación: ${locationId}`);
    }
  }

  /**
   * Programa un nuevo temporizador (VERSIÓN MEJORADA con notificaciones persistentes)
   */
  public async scheduleTimer(location: CarLocation, onExpiry?: () => void): Promise<void> {
    const { id, expiryTime, reminderMinutes, note } = location;

    console.log(`⏰ Programando timer para ubicación: ${id}`);

    // Cancelar timers existentes
    this.clearExistingTimers(id);

    if (!expiryTime) {
      console.log(`⚠️ No hay tiempo de expiración para ubicación: ${id}`);
      return;
    }

    const now = Date.now();

    // Verificar que no esté en el pasado
    if (expiryTime <= now) {
      console.warn(`❌ Timer no programado: expiryTime está en el pasado para ubicación ${id}`);
      return;
    }

    // Inicializar sistema de notificaciones
    const notificationsReady = await notificationManager.initialize();
    if (!notificationsReady) {
      console.warn("⚠️ Sistema de notificaciones no disponible, timer funcionará sin notificaciones");
    }

    const locationTimers: number[] = [];
    const locationNote = note ? `"${note}"` : "Tu aparcamiento";

    // 1. Programar RECORDATORIO (si aplica)
    if (reminderMinutes && reminderMinutes > 0) {
      const reminderTime = expiryTime - reminderMinutes * 60 * 1000;

      if (reminderTime > now) {
        const timeUntilReminder = reminderTime - now;

        // Usar notificación persistente programada
        if (notificationsReady) {
          notificationManager.scheduleNotification(
            `reminder-${id}`,
            timeUntilReminder,
            "⏰ Recordatorio de Parking",
            `El parking para ${locationNote} expira en ${reminderMinutes} minutos.`,
            {
              tag: `reminder-${id}`,
              requireInteraction: true,
            }
          );
        }

        // Timer de respaldo para callback
        const reminderTimeout = window.setTimeout(() => {
          console.log(`⏰ Recordatorio ejecutado para: ${locationNote}`);
        }, timeUntilReminder);

        locationTimers.push(reminderTimeout);
      }
    }

    // 2. Programar notificación de EXPIRACIÓN
    const timeUntilExpiry = expiryTime - now;

    // Usar notificación persistente programada
    if (notificationsReady) {
      notificationManager.scheduleNotification(
        `expiry-${id}`,
        timeUntilExpiry,
        "🚨 Parking Expirado",
        `El tiempo para ${locationNote} ha terminado.`,
        {
          tag: `expiry-${id}`,
          requireInteraction: true,
        }
      );
    }

    // Timer principal para callback y limpieza
    const expiryTimeout = window.setTimeout(() => {
      console.log(`🚨 Timer expirado para: ${locationNote}`);

      // Ejecutar callback si se proporcionó
      if (onExpiry) {
        onExpiry();
      }

      // Limpiar timers
      this.activeTimers.delete(id);
    }, timeUntilExpiry);

    locationTimers.push(expiryTimeout);

    // Guardar timers
    if (locationTimers.length > 0) {
      this.activeTimers.set(id, locationTimers);
      console.log(`✅ Timer programado exitosamente para: ${locationNote}`);
      console.log(`📅 Expira en: ${Math.round(timeUntilExpiry / 1000 / 60)} minutos`);
    }
  }

  /**
   * Cancela manualmente todos los temporizadores para una ubicación
   */
  public cancelTimer(locationId: string): void {
    console.log(`❌ Cancelando timer para ubicación: ${locationId}`);
    this.clearExistingTimers(locationId);
  }

  /**
   * Obtiene todos los IDs de los timers activos
   */
  public getActiveTimers(): string[] {
    return Array.from(this.activeTimers.keys());
  }

  /**
   * Obtiene información detallada de los timers activos
   */
  public getTimerInfo(): Array<{ locationId: string; timerCount: number }> {
    return Array.from(this.activeTimers.entries()).map(([locationId, timers]) => ({
      locationId,
      timerCount: timers.length,
    }));
  }

  /**
   * Cancela todos los timers de todas las ubicaciones
   */
  public cancelAllTimers(): void {
    console.log("🗑️ Cancelando todos los timers");
    for (const locationId of this.activeTimers.keys()) {
      this.clearExistingTimers(locationId);
    }
  }

  /**
   * Método de debug para verificar estado
   */
  public debugStatus(): void {
    console.log("🔍 DEBUG - Estado de TimerManager:");
    console.log("- Timers activos:", this.getActiveTimers());
    console.log("- Info detallada:", this.getTimerInfo());
    console.log("- Notificaciones:", notificationManager.getDebugInfo());
  }
}

export const timerManager = TimerManager.getInstance();
