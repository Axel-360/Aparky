// src/utils/notificationManager.ts

/**
 * Clase para gestionar notificaciones del navegador de forma centralizada.
 * Se implementa como un Singleton.
 */
class NotificationManager {
  private static instance: NotificationManager;
  private scheduledNotifications: Map<string, number> = new Map();

  private constructor() {}

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * Muestra una notificación inmediatamente.
   * @param title - El título de la notificación.
   * @param body - El cuerpo o mensaje de la notificación.
   * @param options - Opciones adicionales para la notificación (ej. icono, vibración).
   */
  public showNotification(title: string, body: string, options?: NotificationOptions): void {
    if (!("Notification" in window)) {
      console.warn("Este navegador no soporta notificaciones de escritorio.");
      return;
    }

    if (Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        ...options,
      });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          new Notification(title, {
            body,
            icon: "/favicon.ico",
            ...options,
          });
        }
      });
    }
  }

  /**
   * Programa una notificación para que se muestre después de un cierto retraso.
   * @param id - Un ID único para poder cancelarla después.
   * @param delay - El tiempo en milisegundos que hay que esperar antes de mostrarla.
   * @param title - El título de la notificación.
   * @param body - El cuerpo del mensaje.
   * @param options - Opciones adicionales.
   */
  public scheduleNotification(
    id: string,
    delay: number,
    title: string,
    body: string,
    options?: NotificationOptions
  ): void {
    // Si ya existe una notificación con este ID, la cancelamos antes de programar la nueva.
    if (this.scheduledNotifications.has(id)) {
      this.cancelNotification(id);
    }

    const timerId = window.setTimeout(() => {
      this.showNotification(title, body, options);
      this.scheduledNotifications.delete(id); // Limpiar de la lista una vez mostrada
    }, delay);

    this.scheduledNotifications.set(id, timerId);
  }

  /**
   * Cancela una notificación que fue programada previamente.
   * @param id - El ID único de la notificación a cancelar.
   */
  public cancelNotification(id: string): void {
    if (this.scheduledNotifications.has(id)) {
      const timerId = this.scheduledNotifications.get(id)!;
      window.clearTimeout(timerId);
      this.scheduledNotifications.delete(id);
    }
  }

  /**
   * Obtiene todos los IDs de los timers activos. Útil para depuración.
   * @returns Un array con los IDs de las ubicaciones que tienen timers activos.
   */
  public getActiveTimers(): string[] {
    return Array.from(this.scheduledNotifications.keys());
  }

  /**
   * Solicita permisos de notificación si no están concedidos
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) {
      throw new Error("Este navegador no soporta notificaciones.");
    }

    if (Notification.permission === "granted") {
      return "granted";
    }

    if (Notification.permission === "denied") {
      return "denied";
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  /**
   * Verifica si las notificaciones están disponibles
   */
  public isSupported(): boolean {
    return "Notification" in window;
  }

  /**
   * Obtiene el estado actual de los permisos
   */
  public getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) {
      return "denied";
    }
    return Notification.permission;
  }
}

export const notificationManager = NotificationManager.getInstance();
