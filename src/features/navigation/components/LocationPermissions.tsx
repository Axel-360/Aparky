// src/features/navigation/components/LocationPermissions.tsx
import React, { useState, useEffect } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
  AlertTitle,
  Progress,
} from "@/shared/ui";
import { MapPin, Shield, CheckCircle, XCircle, AlertTriangle, Smartphone, Settings } from "lucide-react";

interface LocationPermissionsProps {
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
}

type PermissionStatus = "prompt" | "granted" | "denied" | "checking";

const LocationPermissions: React.FC<LocationPermissionsProps> = ({ onPermissionGranted, onPermissionDenied }) => {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>("checking");
  const [isRequesting, setIsRequesting] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<string>("");

  useEffect(() => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes("Chrome")) setBrowserInfo("Chrome");
    else if (userAgent.includes("Firefox")) setBrowserInfo("Firefox");
    else if (userAgent.includes("Safari")) setBrowserInfo("Safari");
    else if (userAgent.includes("Edge")) setBrowserInfo("Edge");
    else setBrowserInfo("tu navegador");

    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    if (!navigator.geolocation) {
      setPermissionStatus("denied");
      return;
    }

    try {
      if ("permissions" in navigator) {
        const permission = await navigator.permissions.query({ name: "geolocation" });
        setPermissionStatus(permission.state as PermissionStatus);

        if (permission.state === "granted") {
          onPermissionGranted();
        } else if (permission.state === "denied") {
          onPermissionDenied();
        }
      } else {
        setPermissionStatus("prompt");
      }
    } catch (error) {
      console.error("Error checking permissions:", error);
      setPermissionStatus("prompt");
    }
  };

  const requestPermission = async () => {
    setIsRequesting(true);

    try {
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        });
      });

      setPermissionStatus("granted");
      onPermissionGranted();
    } catch (error: any) {
      console.error("Permission denied:", error);

      if (error.code === 1) {
        setPermissionStatus("denied");
        onPermissionDenied();
      } else {
        setPermissionStatus("prompt");
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const getInstructions = () => {
    const baseInstructions = {
      Chrome: [
        "Haz clic en el icono de ubicación en la barra de direcciones",
        "Selecciona 'Permitir' para este sitio",
        "Recarga la página si es necesario",
      ],
      Firefox: [
        "Haz clic en el icono de escudo en la barra de direcciones",
        "Selecciona 'Permitir ubicación'",
        "Confirma los permisos",
      ],
      Safari: [
        "Ve a Safari > Preferencias > Sitios web",
        "Selecciona 'Ubicación' en la barra lateral",
        "Cambia este sitio a 'Permitir'",
      ],
      Edge: [
        "Haz clic en el icono de ubicación en la barra de direcciones",
        "Selecciona 'Permitir una vez' o 'Permitir siempre'",
        "Recarga la página si es necesario",
      ],
    };

    return (
      baseInstructions[browserInfo as keyof typeof baseInstructions] || [
        "Busca el icono de ubicación en tu navegador",
        "Permite el acceso a la ubicación",
        "Recarga la página si es necesario",
      ]
    );
  };

  if (permissionStatus === "checking") {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center space-y-4">
          <div className="animate-pulse">
            <MapPin className="h-8 w-8 mx-auto text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Verificando permisos...</p>
          <Progress value={50} className="w-full" />
        </CardContent>
      </Card>
    );
  }

  if (permissionStatus === "granted") {
    return (
      <Card className="w-full max-w-md mx-auto border-green-200 dark:border-green-800">
        <CardContent className="p-6 text-center space-y-4">
          <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
          <div>
            <h3 className="text-lg font-semibold text-green-600">¡Permisos concedidos!</h3>
            <p className="text-sm text-muted-foreground">La navegación está lista para funcionar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (permissionStatus === "denied") {
    return (
      <Card className="w-full max-w-md mx-auto border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            Permisos de ubicación denegados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Acción requerida</AlertTitle>
            <AlertDescription>
              Para usar la navegación, necesitas habilitar los permisos de ubicación manualmente.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Cómo habilitar en {browserInfo}:
            </h4>
            <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
              {getInstructions().map((instruction, index) => (
                <li key={index}>{instruction}</li>
              ))}
            </ol>
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={checkPermissionStatus} variant="outline" className="w-full">
              Verificar permisos de nuevo
            </Button>
            <Button onClick={onPermissionDenied} variant="secondary" className="w-full">
              Continuar sin navegación
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Permisos de ubicación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center space-y-3">
          <Smartphone className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="font-semibold">Navegación paso a paso</h3>
            <p className="text-sm text-muted-foreground">
              Para guiarte hasta tu coche, necesitamos acceso a tu ubicación
            </p>
          </div>
        </div>

        <Alert>
          <MapPin className="h-4 w-4" />
          <AlertTitle>¿Por qué necesitamos tu ubicación?</AlertTitle>
          <AlertDescription className="text-xs">
            • Calcular la ruta más corta hasta tu coche
            <br />
            • Proporcionarte instrucciones de navegación
            <br />
            • Notificarte cuando te acerques al destino
            <br />• Tu ubicación no se guarda ni se comparte
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-2">
          <Button onClick={requestPermission} disabled={isRequesting} className="w-full">
            {isRequesting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Solicitando permisos...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                Permitir acceso a ubicación
              </>
            )}
          </Button>
          <Button onClick={onPermissionDenied} variant="secondary" className="w-full">
            Usar solo Google Maps
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Al hacer clic en "Permitir", tu navegador te pedirá confirmación
        </p>
      </CardContent>
    </Card>
  );
};

export default LocationPermissions;
