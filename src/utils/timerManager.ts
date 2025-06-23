// src/utils/timerManager.ts
import type { CarLocation } from "../types/location";

interface ActiveTimer {
  locationId: string;
  expiryTime: number;
  reminderMinutes?: number;
  timeoutId: NodeJS.Timeout;
  reminderTimeoutId?: NodeJS.Timeout;
}

class TimerManager {
  private activeTimers = new Map<string, ActiveTimer>();

  // Programar un nuevo temporizador
  scheduleTimer(location: CarLocation, onExpired?: () => void, onReminder?: () => void) {
    if (!location.expiryTime) return;

    // Cancelar temporizador existente si existe
    this.cancelTimer(location.id);

    const now = Date.now();
    const timeUntilExpiry = location.expiryTime - now;

    if (timeUntilExpiry <= 0) {
      console.log(`Temporizador para ${location.id} ya expiró`);
      return;
    }

    // Programar notificación de expiración
    const timeoutId = setTimeout(() => {
      this.showNotification("🚨 Parking Expirado", "Tu tiempo de parking ha expirado", location);

      if (onExpired) onExpired();
      this.activeTimers.delete(location.id);
    }, timeUntilExpiry);

    const timer: ActiveTimer = {
      locationId: location.id,
      expiryTime: location.expiryTime,
      reminderMinutes: location.reminderMinutes,
      timeoutId,
    };

    // Programar recordatorio si está configurado
    if (location.reminderMinutes) {
      const reminderTime = location.expiryTime - location.reminderMinutes * 60 * 1000;
      const timeUntilReminder = reminderTime - now;

      if (timeUntilReminder > 0) {
        timer.reminderTimeoutId = setTimeout(() => {
          this.showNotification(
            "⏰ Recordatorio de Parking",
            `Tu parking expira en ${location.reminderMinutes} minutos`,
            location
          );

          if (onReminder) onReminder();
        }, timeUntilReminder);
      }
    }

    this.activeTimers.set(location.id, timer);
    console.log(`Temporizador programado para ${location.id}`);
  }

  // Cancelar temporizador específico
  cancelTimer(locationId: string): boolean {
    const timer = this.activeTimers.get(locationId);

    if (!timer) {
      console.log(`No hay temporizador activo para ${locationId}`);
      return false;
    }

    // Cancelar timeout principal
    clearTimeout(timer.timeoutId);

    // Cancelar timeout de recordatorio si existe
    if (timer.reminderTimeoutId) {
      clearTimeout(timer.reminderTimeoutId);
    }

    this.activeTimers.delete(locationId);
    console.log(`Temporizador cancelado para ${locationId}`);
    return true;
  }

  // Extender temporizador
  extendTimer(locationId: string, additionalMinutes: number): boolean {
    const timer = this.activeTimers.get(locationId);

    if (!timer) {
      console.log(`No se puede extender: no hay temporizador para ${locationId}`);
      return false;
    }

    // Cancelar temporizador actual
    this.cancelTimer(locationId);

    // Crear nueva ubicación con tiempo extendido
    const newExpiryTime = timer.expiryTime + additionalMinutes * 60 * 1000;
    const extendedLocation: CarLocation = {
      id: locationId,
      latitude: 0, // Estos valores no se usan para el temporizador
      longitude: 0,
      timestamp: Date.now(),
      expiryTime: newExpiryTime,
      reminderMinutes: timer.reminderMinutes,
    };

    // Programar nuevo temporizador
    this.scheduleTimer(extendedLocation);

    console.log(`Temporizador extendido ${additionalMinutes} minutos para ${locationId}`);
    return true;
  }

  // Obtener información de temporizador activo
  getTimerInfo(locationId: string): { timeLeft: number; isActive: boolean } | null {
    const timer = this.activeTimers.get(locationId);

    if (!timer) {
      return null;
    }

    const now = Date.now();
    const timeLeft = timer.expiryTime - now;

    return {
      timeLeft: Math.max(0, timeLeft),
      isActive: timeLeft > 0,
    };
  }

  // Obtener todos los temporizadores activos
  getActiveTimers(): { locationId: string; expiryTime: number; timeLeft: number }[] {
    const now = Date.now();
    const activeTimers: { locationId: string; expiryTime: number; timeLeft: number }[] = [];

    this.activeTimers.forEach((timer, locationId) => {
      const timeLeft = timer.expiryTime - now;
      if (timeLeft > 0) {
        activeTimers.push({
          locationId,
          expiryTime: timer.expiryTime,
          timeLeft,
        });
      }
    });

    return activeTimers.sort((a, b) => a.timeLeft - b.timeLeft);
  }

  // Cancelar todos los temporizadores
  cancelAllTimers(): number {
    const count = this.activeTimers.size;

    this.activeTimers.forEach((timer) => {
      clearTimeout(timer.timeoutId);
      if (timer.reminderTimeoutId) {
        clearTimeout(timer.reminderTimeoutId);
      }
    });

    this.activeTimers.clear();
    console.log(`${count} temporizadores cancelados`);
    return count;
  }

  // Método privado para mostrar notificaciones
  private showNotification(title: string, body: string, location: CarLocation) {
    if (Notification.permission === "granted") {
      const locationName = location.note || location.address || "tu ubicación";

      new Notification(title, {
        body: `${body}\nUbicación: ${locationName}`,
        icon: title.includes("Expirado") ? "🚨" : "⚠️",
        requireInteraction: true,
        tag: `parking-${location.id}`,
      });
    }
  }

  // Limpiar al destruir la instancia
  destroy() {
    this.cancelAllTimers();
  }
}

// Exportar instancia singleton
export const timerManager = new TimerManager();

// Exportar también la clase para casos especiales
export { TimerManager };
