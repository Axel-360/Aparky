// Archivo: src/components/NotificationSetup.tsx
import React, { useState, useEffect } from "react";
import { Alert, AlertDescription, Button } from "@/shared/ui";
import { Bell, X, CheckCircle, AlertTriangle } from "lucide-react";
import { notificationManager } from "@/utils/notificationManager";
import { getUserPreferences } from "@/utils/preferences";

export const NotificationSetup: React.FC = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>("default");
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasServiceWorker, setHasServiceWorker] = useState(false);

  useEffect(() => {
    const checkStatus = () => {
      const preferences = getUserPreferences();
      const status = notificationManager.getPermissionStatus();
      const swSupported = "serviceWorker" in navigator;

      setPermissionStatus(status);
      setHasServiceWorker(swSupported);

      // Mostrar alerta si:
      // - Las notificaciones están activadas en preferencias
      // - Los permisos no están concedidos
      // - El navegador soporta notificaciones
      setShowAlert(preferences.notifications && status === "default" && notificationManager.isSupported());
    };

    checkStatus();

    // Verificar cada 5 segundos
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const success = await notificationManager.initialize();

      if (success) {
        setShowAlert(false);
        setPermissionStatus("granted");

        // Mostrar notificación de prueba
        setTimeout(() => {
          notificationManager.testNotification();
        }, 1000);
      } else {
        console.warn("No se pudieron inicializar las notificaciones");
      }
    } catch (error) {
      console.error("Error solicitando permisos:", error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await notificationManager.testNotification();
    } catch (error) {
      console.error("Error probando notificación:", error);
    }
  };

  // No mostrar si ya están concedidos los permisos
  if (permissionStatus === "granted") {
    return (
      <Alert className="mb-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex-1">
            <span className="font-medium text-green-800 dark:text-green-200">✅ Notificaciones activadas</span>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Recibirás avisos de tus temporizadores{" "}
              {hasServiceWorker ? "incluso con la app cerrada" : "cuando la app esté abierta"}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleTestNotification} className="ml-4">
            Probar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!showAlert) return null;

  return (
    <Alert className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
      <Bell className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <div className="font-medium text-amber-800 dark:text-amber-200">🔔 Activa las notificaciones de parking</div>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            Recibe avisos cuando tu temporizador esté por expirar
            {hasServiceWorker && " (incluso con la app cerrada)"}
          </p>
          {!hasServiceWorker && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Instala la app para notificaciones en segundo plano
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button
            size="sm"
            onClick={handleRequestPermission}
            disabled={isRequesting}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isRequesting ? "Activando..." : "Activar"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowAlert(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
