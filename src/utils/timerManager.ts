// src/utils/timerManager.ts - VERSIÓN FINAL LIMPIA

import type { CarLocation } from "@/types/location";
import { notificationManager } from "./notificationManager";

/**
 * Clase TimerManager para gestionar de forma centralizada todos los temporizadores de parking.
 * Se implementa como un Singleton para asegurar que solo haya una instancia en toda la app.
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
   * Cancela todos los temporizadores existentes para una ubicación específica.
   * Es importante hacerlo antes de programar uno nuevo para evitar duplicados.
   * @param locationId - El ID de la ubicación.
   */
  private clearExistingTimers(locationId: string): void {
    if (this.activeTimers.has(locationId)) {
      const timers = this.activeTimers.get(locationId)!;
      timers.forEach((timerId) => window.clearTimeout(timerId));
      this.activeTimers.delete(locationId);
    }
  }

  /**
   * Programa un nuevo temporizador (de recordatorio y de expiración) para una ubicación.
   * Cancela cualquier temporizador previo para esa misma ubicación.
   * @param location - El objeto completo de la ubicación del coche.
   * @param onExpiry - (Opcional) Una función callback que se ejecuta cuando el timer expira.
   */
  public scheduleTimer(location: CarLocation, onExpiry?: () => void): void {
    const { id, expiryTime, reminderMinutes, note } = location;

    // Primero, cancelamos cualquier temporizador que ya exista para esta ubicación
    this.clearExistingTimers(id);

    if (!expiryTime) {
      return; // No hay nada que programar si no hay fecha de expiración
    }

    const now = Date.now();

    // Verificar que el tiempo de expiración no esté en el pasado
    if (expiryTime <= now) {
      console.warn(`Timer no programado: expiryTime está en el pasado para ubicación ${id}`);
      return;
    }

    const locationTimers: number[] = [];
    const locationNote = note ? `"${note}"` : "Tu aparcamiento";

    // 1. Programar el RECORDATORIO (si aplica)
    if (reminderMinutes && reminderMinutes > 0) {
      const reminderTime = expiryTime - reminderMinutes * 60 * 1000;

      if (reminderTime > now) {
        const timeUntilReminder = reminderTime - now;

        const reminderTimeout = window.setTimeout(() => {
          notificationManager.showNotification(
            "⏰ Recordatorio de Parking",
            `El parking para ${locationNote} expira en ${reminderMinutes} minutos.`,
            {
              icon: "/favicon.ico",
              tag: `reminder-${id}`,
              requireInteraction: true,
            }
          );
        }, timeUntilReminder);

        locationTimers.push(reminderTimeout);
      }
    }

    // 2. Programar la notificación de EXPIRACIÓN
    const timeUntilExpiry = expiryTime - now;

    const expiryTimeout = window.setTimeout(() => {
      notificationManager.showNotification("🚨 Parking Expirado", `El tiempo para ${locationNote} ha terminado.`, {
        icon: "/favicon.ico",
        tag: `expiry-${id}`,
        requireInteraction: true,
      });

      // Ejecutar el callback si se proporcionó
      if (onExpiry) {
        onExpiry();
      }

      // Limpiar los timers de esta ubicación una vez han expirado
      this.activeTimers.delete(id);
    }, timeUntilExpiry);

    locationTimers.push(expiryTimeout);

    // Guardar los nuevos IDs de los timers en el mapa
    if (locationTimers.length > 0) {
      this.activeTimers.set(id, locationTimers);
    }
  }

  /**
   * Cancela manualmente todos los temporizadores para una ubicación.
   * @param locationId - El ID de la ubicación cuyos timers se quieren cancelar.
   */
  public cancelTimer(locationId: string): void {
    this.clearExistingTimers(locationId);
  }

  /**
   * Obtiene todos los IDs de los timers activos. Útil para depuración.
   * @returns Un array con los IDs de las ubicaciones que tienen timers activos.
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
    for (const locationId of this.activeTimers.keys()) {
      this.clearExistingTimers(locationId);
    }
  }
}

// Exportamos la instancia única (Singleton) para ser usada en toda la aplicación.
export const timerManager = TimerManager.getInstance();
