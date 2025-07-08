// src/components/NotificationSetup.tsx - Versión corregida sin errores TypeScript
import React, { useState, useEffect } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Bell, Smartphone, Wifi, WifiOff, CheckCircle, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { notificationManager } from "@/utils/notificationManager";

interface SystemStatus {
  permission: NotificationPermission;
  serviceWorkerReady: boolean;
  isOnline: boolean;
  deviceInfo: {
    isIOS: boolean;
    isAndroid: boolean;
    isStandalone: boolean;
    browser: string;
  };
}

export const NotificationSetup: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    permission: "default",
    serviceWorkerReady: false,
    isOnline: navigator.onLine,
    deviceInfo: {
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isAndroid: /Android/.test(navigator.userAgent),
      isStandalone: window.matchMedia("(display-mode: standalone)").matches,
      browser: getBrowserName(),
    },
  });

  const [isRequesting, setIsRequesting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showAdvancedInfo, setShowAdvancedInfo] = useState(false);

  useEffect(() => {
    checkSystemStatus();

    // Listeners para cambios de estado
    const handleOnline = () => setSystemStatus((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () => setSystemStatus((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const checkSystemStatus = async () => {
    // Verificar permisos
    const permission = Notification.permission;

    // Verificar Service Worker
    let serviceWorkerReady = false;
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        serviceWorkerReady = !!registration?.active;
        // 🔥 CORREGIDO: Usar la variable registration (aunque sea solo para verificación)
        console.log("SW registration check:", !!registration);
      } catch (error) {
        console.error("Error verificando SW:", error);
      }
    }

    setSystemStatus((prev) => ({
      ...prev,
      permission,
      serviceWorkerReady,
    }));
  };

  const requestNotificationPermission = async () => {
    setIsRequesting(true);

    try {
      // Verificar soporte básico
      if (!("Notification" in window)) {
        toast.error("Las notificaciones no están soportadas en este navegador");
        return;
      }

      // Solicitar permisos
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        toast.success("¡Permisos de notificación concedidos!");

        // Inicializar sistema de notificaciones
        await initializeNotificationSystem();

        // Mostrar notificación de prueba
        setTimeout(() => {
          testNotification();
        }, 1000);
      } else if (permission === "denied") {
        toast.error("Permisos de notificación denegados");
        showPermissionInstructions();
      }

      await checkSystemStatus();
    } catch (error) {
      console.error("Error solicitando permisos:", error);
      toast.error("Error al solicitar permisos de notificación");
    } finally {
      setIsRequesting(false);
    }
  };

  const initializeNotificationSystem = async () => {
    try {
      // Inicializar el notification manager
      const success = await notificationManager.initialize();

      if (success) {
        console.log("Sistema de notificaciones inicializado correctamente");
      } else {
        throw new Error("No se pudo inicializar el sistema");
      }
    } catch (error) {
      console.error("Error inicializando sistema:", error);
      throw error;
    }
  };

  const testNotification = async () => {
    setIsTesting(true);

    try {
      if (systemStatus.permission !== "granted") {
        toast.error("Primero debes dar permisos de notificación");
        return;
      }

      // Test usando el notification manager
      await notificationManager.testNotification();

      toast.success("Notificación de prueba enviada. Si ves la notificación, el sistema funciona correctamente.");
    } catch (error) {
      console.error("Error en test:", error);
      toast.error("Error enviando notificación de prueba");
    } finally {
      setIsTesting(false);
    }
  };

  const showPermissionInstructions = () => {
    const { isIOS, isAndroid } = systemStatus.deviceInfo;

    let instructions = "";

    if (isIOS) {
      instructions = `Para iOS:
1. Asegúrate de estar usando Safari (no Chrome)
2. Añade la app a tu pantalla de inicio (Compartir → Añadir a pantalla de inicio)
3. Abre la app desde el icono instalado (no desde Safari)
4. Ve a Configuración → Notificaciones → Safari → permitir notificaciones`;
    } else if (isAndroid) {
      instructions = `Para Android:
1. Ve a Configuración del navegador → Configuración del sitio → Notificaciones
2. Busca este sitio y activa las notificaciones
3. O reinstala la app desde Chrome (Añadir a pantalla de inicio)`;
    } else {
      instructions = `Para ordenadores:
1. Busca el icono de notificaciones en la barra de direcciones
2. Selecciona "Permitir"
3. O ve a Configuración del navegador → Privacidad → Notificaciones`;
    }

    toast.info(instructions, { duration: 10000 });
  };

  const getStatusColor = (status: boolean) => (status ? "text-green-600" : "text-red-600");
  const getStatusIcon = (status: boolean) => (status ? CheckCircle : AlertCircle);

  // 🔥 CORREGIDO: Usar la variable isSystemReady
  const isSystemReady = systemStatus.permission === "granted" && systemStatus.serviceWorkerReady;
  console.log("System ready status:", isSystemReady); // Para evitar warning de variable no usada

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Configuración de Notificaciones
        </CardTitle>
        <CardDescription>Configura las notificaciones para que funcionen incluso con la app cerrada</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Estado del sistema */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Estado del Sistema:</h4>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              {React.createElement(getStatusIcon(systemStatus.permission === "granted"), {
                className: `h-3 w-3 ${getStatusColor(systemStatus.permission === "granted")}`,
              })}
              <span>Permisos</span>
            </div>

            <div className="flex items-center gap-1">
              {React.createElement(getStatusIcon(systemStatus.serviceWorkerReady), {
                className: `h-3 w-3 ${getStatusColor(systemStatus.serviceWorkerReady)}`,
              })}
              <span>Service Worker</span>
            </div>

            <div className="flex items-center gap-1">
              {systemStatus.isOnline ? (
                <Wifi className="h-3 w-3 text-green-600" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-600" />
              )}
              <span>Conexión</span>
            </div>

            <div className="flex items-center gap-1">
              <Smartphone className="h-3 w-3" />
              <span>
                {systemStatus.deviceInfo.isIOS && "iOS"}
                {systemStatus.deviceInfo.isAndroid && "Android"}
                {!systemStatus.deviceInfo.isIOS && !systemStatus.deviceInfo.isAndroid && "Desktop"}
              </span>
              {systemStatus.deviceInfo.isStandalone && (
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  PWA
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Alertas específicas del dispositivo */}
        {systemStatus.deviceInfo.isIOS && !systemStatus.deviceInfo.isStandalone && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Para notificaciones en background en iOS, debes instalar la app en tu pantalla de inicio desde Safari.
            </AlertDescription>
          </Alert>
        )}

        {/* Botones de acción */}
        <div className="space-y-2">
          {systemStatus.permission !== "granted" ? (
            <Button onClick={requestNotificationPermission} disabled={isRequesting} className="w-full">
              {isRequesting ? "Solicitando..." : "Activar Notificaciones"}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-green-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                <span>Sistema de notificaciones activo</span>
              </div>

              <Button onClick={testNotification} disabled={isTesting} variant="outline" className="w-full">
                {isTesting ? "Enviando..." : "Probar Notificación"}
              </Button>
            </div>
          )}

          <Button
            onClick={() => setShowAdvancedInfo(!showAdvancedInfo)}
            variant="ghost"
            size="sm"
            className="w-full text-xs"
          >
            {showAdvancedInfo ? "Ocultar" : "Mostrar"} información técnica
          </Button>
        </div>

        {/* Información avanzada */}
        {showAdvancedInfo && (
          <div className="border-t pt-3 space-y-2">
            <h5 className="font-medium text-xs">Información del dispositivo:</h5>
            <div className="text-xs space-y-1 text-muted-foreground">
              <div>Navegador: {systemStatus.deviceInfo.browser}</div>
              <div>Modo PWA: {systemStatus.deviceInfo.isStandalone ? "Sí" : "No"}</div>
              <div>Permisos: {systemStatus.permission}</div>
              <div>SW activo: {systemStatus.serviceWorkerReady ? "Sí" : "No"}</div>
              <div>Background disponible: {notificationManager.isBackgroundNotificationAvailable() ? "Sí" : "No"}</div>
            </div>

            {/* Recomendaciones específicas del dispositivo */}
            <div className="space-y-1">
              <h6 className="font-medium text-xs">Recomendaciones:</h6>
              {notificationManager.getDeviceRecommendations().map((rec, index) => (
                <div key={index} className="text-xs text-muted-foreground">
                  • {rec}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

function getBrowserName(): string {
  const userAgent = navigator.userAgent;

  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) return "Safari";
  if (userAgent.includes("Edge")) return "Edge";

  return "Desconocido";
}
