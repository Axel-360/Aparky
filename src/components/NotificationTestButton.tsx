// src/components/NotificationTestButton.tsx
// Componente para probar el sistema mejorado con SW

import React from "react";
import { Button } from "@/shared/ui/button";
import { TestTube, Clock, Bell, Zap } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { unifiedNotificationSystem } from "@/utils/unifiedNotificationSystem";
import { toast } from "sonner";

// Declarar tipo global para desarrollo
declare global {
  interface Window {
    unifiedNotificationSystem?: typeof unifiedNotificationSystem;
  }
}

export const NotificationTestButton: React.FC = () => {
  const { isInitialized, initialize, testNotification, scheduleTimerNotification } = useNotifications();

  const handleQuickTest = async () => {
    if (!isInitialized) {
      toast.info("Inicializando sistema...");
      const success = await initialize();
      if (!success) {
        toast.error("No se pudo inicializar el sistema");
        return;
      }
    }

    // Test básico
    const success = await testNotification();
    if (success) {
      toast.success("¡Test exitoso! Deberías ver una notificación");
    }
  };

  const handleParkingTest = async () => {
    if (!isInitialized) {
      const success = await initialize();
      if (!success) return;
    }

    // Test de parking (10 segundos)
    const id = await scheduleTimerNotification(0.17, "Ubicación de Prueba"); // 0.17 min = 10 segundos

    if (id) {
      toast.success("Recordatorio de parking programado para 10 segundos");
    }
  };

  const handleBackgroundTest = async () => {
    if (!isInitialized) {
      const success = await initialize();
      if (!success) return;
    }

    // Test de notificación background (30 segundos) - usando import directo
    const success = await unifiedNotificationSystem.scheduleNotification({
      id: `background-test-${Date.now()}`,
      title: "🔥 Test Background",
      body: "Esta notificación se programó para 30 segundos. ¡Minimiza la app y espera!",
      delay: 30000, // 30 segundos
      vibrate: [500, 200, 500, 200, 500],
      requireInteraction: true,
    });

    if (success) {
      toast.success("🔥 Test background programado para 30 segundos. ¡Minimiza la app!");
    }
  };

  const handleSWDebug = () => {
    // Usar import directo en lugar de window
    console.log("🔍 Estado del sistema unificado:", unifiedNotificationSystem.getSystemStatus());

    // Debug del Service Worker
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.active) {
          registration.active.postMessage({ type: "DEBUG_INFO" });
        }
      });
    }

    toast.info("Estado mostrado en consola - revisa también las funciones debug del SW");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleQuickTest} variant="outline" size="sm">
          <TestTube className="h-3 w-3 mr-1" />
          Test Rápido
        </Button>

        <Button onClick={handleParkingTest} variant="outline" size="sm">
          <Clock className="h-3 w-3 mr-1" />
          Test 10s
        </Button>

        <Button onClick={handleBackgroundTest} variant="default" size="sm">
          <Zap className="h-3 w-3 mr-1" />
          Test Background
        </Button>
      </div>

      <Button onClick={handleSWDebug} variant="ghost" size="sm" className="w-full">
        <Bell className="h-3 w-3 mr-1" />
        Debug Completo
      </Button>

      <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
        💡 <strong>Test Background:</strong> Programa una notificación para 30s. Minimiza la app y debería aparecer
        automáticamente.
      </div>
    </div>
  );
};
