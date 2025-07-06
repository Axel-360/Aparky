// src/hooks/useNotifications.ts
import { useState, useEffect, useCallback } from "react";
import { unifiedNotificationSystem } from "@/utils/unifiedNotificationSystem";
import { toast } from "sonner";

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

interface UseNotificationsReturn {
  // Estado
  isInitialized: boolean;
  isSupported: boolean;
  permission: NotificationPermission;
  capabilities: any;
  isLoading: boolean;
  error: string | null;

  // Acciones
  initialize: () => Promise<boolean>;
  scheduleNotification: (config: NotificationConfig) => Promise<boolean>;
  testNotification: () => Promise<boolean>;

  // Utilidades
  getSystemStatus: () => any;
  cleanup: () => void;

  // Específico para parking
  scheduleTimerNotification: (minutes: number, location?: string) => Promise<string | null>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  // Verificar estado inicial
  useEffect(() => {
    updateSystemStatus();
  }, []);

  const updateSystemStatus = useCallback(() => {
    try {
      const status = unifiedNotificationSystem.getSystemStatus();
      setSystemStatus(status);
      setIsInitialized(status.initialized);
      setError(null);
    } catch (err) {
      setError("Error obteniendo estado del sistema");
      console.error("Error updating system status:", err);
    }
  }, []);

  const initialize = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("🚀 Inicializando sistema de notificaciones...");

      const success = await unifiedNotificationSystem.initialize();

      if (success) {
        setIsInitialized(true);
        updateSystemStatus();
        console.log("✅ Sistema de notificaciones inicializado");
        return true;
      } else {
        setError("No se pudo inicializar el sistema de notificaciones");
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMessage);
      console.error("❌ Error inicializando notificaciones:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [updateSystemStatus]);

  const scheduleNotification = useCallback(
    async (config: NotificationConfig): Promise<boolean> => {
      try {
        if (!isInitialized) {
          console.warn("⚠️ Sistema no inicializado, inicializando automáticamente...");
          const initSuccess = await initialize();
          if (!initSuccess) {
            throw new Error("No se pudo inicializar el sistema");
          }
        }

        const success = await unifiedNotificationSystem.scheduleNotification(config);

        if (success) {
          updateSystemStatus();
          return true;
        } else {
          throw new Error("No se pudo programar la notificación");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error programando notificación";
        setError(errorMessage);
        console.error("❌ Error programando notificación:", err);
        return false;
      }
    },
    [isInitialized, initialize, updateSystemStatus]
  );

  const testNotification = useCallback(async (): Promise<boolean> => {
    try {
      if (!isInitialized) {
        const initSuccess = await initialize();
        if (!initSuccess) {
          throw new Error("No se pudo inicializar el sistema");
        }
      }

      const success = await unifiedNotificationSystem.testNotification();

      if (success) {
        toast.success("🧪 Notificación de prueba enviada");
        return true;
      } else {
        throw new Error("Falló el test de notificación");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error en test de notificación";
      setError(errorMessage);
      toast.error(`❌ ${errorMessage}`);
      return false;
    }
  }, [isInitialized, initialize]);

  const getSystemStatus = useCallback(() => {
    return unifiedNotificationSystem.getSystemStatus();
  }, []);

  const cleanup = useCallback(() => {
    try {
      unifiedNotificationSystem.cleanup();
      setIsInitialized(false);
      setError(null);
      updateSystemStatus();
      console.log("🧹 Sistema de notificaciones limpiado");
    } catch (err) {
      console.error("❌ Error limpiando sistema:", err);
    }
  }, [updateSystemStatus]);

  // Función específica para la aplicación de parking
  const scheduleTimerNotification = useCallback(
    async (minutes: number, location?: string): Promise<string | null> => {
      try {
        const notificationId = `parking-timer-${Date.now()}`;
        const delay = minutes * 60 * 1000; // Convertir a milisegundos

        const locationText = location ? ` en ${location}` : "";

        const config: NotificationConfig = {
          id: notificationId,
          title: "⏰ Tiempo de Parking Agotado",
          body: `Han pasado ${minutes} minutos desde que aparcaste${locationText}. ¡Es hora de revisar tu vehículo!`,
          delay,
          icon: "/icons/pwa-192x192.png",
          badge: "/icons/pwa-64x64.png",
          vibrate: [500, 200, 500, 200, 500],
          requireInteraction: true,
          tag: "parking-timer",
          data: {
            type: "parking-timer",
            minutes,
            location,
            scheduledAt: Date.now(),
          },
        };

        const success = await scheduleNotification(config);

        if (success) {
          toast.success(`⏰ Recordatorio programado para ${minutes} minutos`);
          return notificationId;
        } else {
          throw new Error("No se pudo programar el recordatorio");
        }
      } catch (err) {
        console.error("❌ Error programando recordatorio de parking:", err);
        toast.error("❌ No se pudo programar el recordatorio");
        return null;
      }
    },
    [scheduleNotification]
  );

  return {
    // Estado
    isInitialized,
    isSupported: systemStatus?.capabilities?.hasNotificationAPI ?? false,
    permission: systemStatus?.permission ?? "default",
    capabilities: systemStatus?.capabilities ?? {},
    isLoading,
    error,

    // Acciones
    initialize,
    scheduleNotification,
    testNotification,

    // Utilidades
    getSystemStatus,
    cleanup,

    // Específico para parking
    scheduleTimerNotification,
  };
};
