// src/components/NotificationSetupBasic.tsx
import React, { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Bell, CheckCircle, AlertCircle, Info, RefreshCw, TestTube } from "lucide-react";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationTestButton } from "@/components/NotificationTestButton";

export const NotificationSetupBasic: React.FC = () => {
  const {
    isInitialized,
    isSupported,
    permission,
    capabilities,
    isLoading,
    error,
    initialize,
    testNotification,
    getSystemStatus,
  } = useNotifications();

  const [showDetails, setShowDetails] = useState(false);

  const handleInitialize = async () => {
    const success = await initialize();
    if (success) {
      toast.success("🎉 Sistema de notificaciones activado!");
    } else {
      toast.error("❌ No se pudo activar el sistema");
      showDeviceHelp();
    }
  };

  const handleTest = async () => {
    await testNotification();
  };

  const showDeviceHelp = () => {
    if (capabilities.isIOS && !capabilities.isPWA) {
      toast.info(
        `
🍎 Para iOS:
1. Abre en Safari (no Chrome)
2. Toca Compartir → Añadir a pantalla de inicio
3. Abre desde el icono instalado
4. Acepta los permisos
      `,
        { duration: 8000 }
      );
    } else if (capabilities.isAndroid) {
      toast.info(
        `
🤖 Para Android:
1. Permite las notificaciones cuando se soliciten
2. O ve a Configuración → Notificaciones del sitio
      `,
        { duration: 6000 }
      );
    }
  };

  const getDeviceIcon = () => {
    if (capabilities.isIOS) return <span className="text-lg">🍎</span>;
    if (capabilities.isAndroid) return <span className="text-lg">🤖</span>;
    return <span className="text-lg">💻</span>;
  };

  const getPermissionBadge = () => {
    switch (permission) {
      case "granted":
        return <Badge className="bg-green-100 text-green-800">✅ Concedidos</Badge>;
      case "denied":
        return <Badge variant="destructive">❌ Denegados</Badge>;
      default:
        return <Badge variant="secondary">⏳ Pendientes</Badge>;
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h3 className="text-lg font-semibold">Notificaciones No Soportadas</h3>
            <p className="text-muted-foreground">
              Tu navegador no soporta notificaciones web. Prueba con Chrome, Firefox o Safari.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Estado Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificaciones
            {isInitialized && <Badge className="bg-green-100 text-green-800">ACTIVO</Badge>}
          </CardTitle>
          <CardDescription>Configurar sistema de notificaciones para recordatorios de parking</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Estado actual */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              {getDeviceIcon()}
              <span>Dispositivo</span>
              {capabilities.isPWA && (
                <Badge variant="secondary" className="text-xs">
                  PWA
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span>Permisos</span>
              {getPermissionBadge()}
            </div>
          </div>

          {/* Error */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {/* Recomendación iOS */}
          {capabilities.isIOS && !capabilities.isPWA && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>iOS detectado:</strong> Para notificaciones en background, instala la app en tu pantalla de
                inicio usando Safari.
              </AlertDescription>
            </Alert>
          )}

          {/* Botones principales */}
          <div className="space-y-2">
            {!isInitialized ? (
              <Button onClick={handleInitialize} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Inicializando...
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Activar Notificaciones
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-green-600 text-sm p-2 bg-green-50 rounded">
                  <CheckCircle className="h-4 w-4" />
                  <span>Sistema de notificaciones activo</span>
                </div>

                <Button onClick={handleTest} variant="outline" className="w-full">
                  <TestTube className="h-4 w-4 mr-2" />
                  Probar Notificación
                </Button>
              </div>
            )}

            <Button onClick={() => setShowDetails(!showDetails)} variant="ghost" size="sm" className="w-full text-xs">
              {showDetails ? "Ocultar" : "Mostrar"} detalles técnicos
            </Button>
          </div>

          {/* 🔥 NUEVO: Botones de test avanzados si está activo */}
          {isInitialized && (
            <div className="border-t pt-4">
              <h5 className="font-medium text-sm mb-2">Tests Avanzados:</h5>
              <NotificationTestButton />
            </div>
          )}

          {/* Detalles técnicos */}
          {showDetails && (
            <div className="border-t pt-4 space-y-2">
              <h5 className="font-medium text-sm">Información técnica:</h5>
              <div className="text-xs space-y-1 text-muted-foreground">
                <div>• API soportada: {capabilities.hasNotificationAPI ? "✅" : "❌"}</div>
                <div>• Service Worker: {capabilities.hasServiceWorker ? "✅" : "❌"}</div>
                <div>• Modo PWA: {capabilities.isPWA ? "✅" : "❌"}</div>
                <div>• Persistente: {capabilities.canShowPersistent ? "✅" : "❌"}</div>
                <div>• Programada: {capabilities.canSchedule ? "✅" : "❌"}</div>
                <div>• Permisos: {permission}</div>
              </div>

              <Button
                onClick={() => {
                  console.log("🔍 Estado completo:", getSystemStatus());
                  toast.info("Estado mostrado en consola del navegador");
                }}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Ver Estado en Consola
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guía rápida */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Guía Rápida</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <div className="space-y-1">
            <div>1. Toca "Activar Notificaciones"</div>
            <div>2. Acepta los permisos cuando se soliciten</div>
            <div>3. Si es iOS: instala la app en pantalla de inicio</div>
            <div>4. Prueba con "Probar Notificación"</div>
            {isInitialized && <div>5. ⚡ Usa "Test Background" para probar notificaciones programadas</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
