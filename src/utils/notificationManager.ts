class NotificationManager {
  private timeouts: Map<string, NodeJS.Timeout> = new Map();

  // Programar notificación con ID único
  scheduleNotification(timerId: string, delay: number, title: string, body: string, icon?: string) {
    // Cancelar notificación existente si existe
    this.cancelNotification(timerId);

    const timeoutId = setTimeout(() => {
      if (Notification.permission === "granted") {
        new Notification(title, { body, icon });
      }
      // Limpiar del Map después de mostrar
      this.timeouts.delete(timerId);
    }, delay);

    this.timeouts.set(timerId, timeoutId);
    console.log(`Notification scheduled for timer ${timerId} in ${delay}ms`);
  }

  // Cancelar notificación específica
  cancelNotification(timerId: string) {
    const timeoutId = this.timeouts.get(timerId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(timerId);
      console.log(`Notification canceled for timer ${timerId}`);
    }
  }

  // Cancelar todas las notificaciones
  cancelAllNotifications() {
    this.timeouts.forEach((timeoutId, timerId) => {
      clearTimeout(timeoutId);
      console.log(`Notification canceled for timer ${timerId}`);
    });
    this.timeouts.clear();
  }

  // Obtener notificaciones activas
  getActiveNotifications(): string[] {
    return Array.from(this.timeouts.keys());
  }
}

// Singleton
export const notificationManager = new NotificationManager();
