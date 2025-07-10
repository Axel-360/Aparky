// src/features/navigation/components/Navigation.tsx
import React, { useEffect, useState } from "react";
import { useNavigation } from "../hooks/useNavigation";
import type { CarLocation, LocationWithAccuracy } from "@/types/location";
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
  Badge,
} from "@/shared/ui";
import {
  Loader2,
  X,
  Navigation as NavigationIcon,
  Clock,
  Route as RouteIcon,
  StepForward,
  Mic,
  PartyPopper,
  MapPin,
  Compass,
  Gauge,
  ExternalLink,
  Pause,
  Play,
  RefreshCw,
} from "lucide-react";

interface NavigationProps {
  targetLocation: CarLocation;
  currentLocation: LocationWithAccuracy | null;
  onClose: () => void;
}

interface LocalNavigationState {
  isNavigating: boolean;
  currentDistance: number;
  estimatedArrival: Date | null;
  direction: string;
  nextInstruction?: string;
  progress: number;
  speed?: number;
  accuracy?: number;
  currentLocation?: { latitude: number; longitude: number };
}

const RouteSummary: React.FC<{ state: LocalNavigationState }> = ({ state }) => {
  const estimatedMinutes =
    state.speed && state.speed > 0.5 ? Math.round(state.currentDistance / state.speed / 60) : null;

  const formatDistance = (distance: number): string => {
    if (distance < 1000) return `${Math.round(distance)}m`;
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const formatSpeed = (speed?: number): string => {
    if (!speed || speed < 0.1) return "Parado";
    const kmh = speed * 3.6;
    return `${kmh.toFixed(1)} km/h`;
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="p-3 rounded-lg bg-muted">
        <dt className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-1.5">
          <Clock className="h-4 w-4" /> Tiempo estimado
        </dt>
        <dd className="text-xl font-bold text-center">
          {estimatedMinutes !== null ? `${estimatedMinutes} min` : "Calculando..."}
        </dd>
      </div>
      <div className="p-3 rounded-lg bg-muted">
        <dt className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-1.5">
          <RouteIcon className="h-4 w-4" /> Distancia
        </dt>
        <dd className="text-xl font-bold text-center">{formatDistance(state.currentDistance)}</dd>
      </div>
      <div className="p-3 rounded-lg bg-muted">
        <dt className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-1.5">
          <Compass className="h-4 w-4" /> Dirección
        </dt>
        <dd className="text-lg font-semibold text-center">{state.direction || "Calculando..."}</dd>
      </div>
      <div className="p-3 rounded-lg bg-muted">
        <dt className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-1.5">
          <Gauge className="h-4 w-4" /> Velocidad
        </dt>
        <dd className="text-lg font-semibold text-center">{formatSpeed(state.speed)}</dd>
      </div>
    </div>
  );
};

const AccuracyInfo: React.FC<{ accuracy?: number }> = ({ accuracy }) => {
  if (!accuracy) return null;

  const getAccuracyColor = (acc: number) => {
    if (acc <= 10) return "text-green-600 dark:text-green-400";
    if (acc <= 30) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getAccuracyText = (acc: number) => {
    if (acc <= 10) return "Excelente";
    if (acc <= 30) return "Buena";
    return "Baja";
  };

  return (
    <div className="flex items-center justify-center gap-2 text-sm">
      <span className="text-muted-foreground">Precisión GPS:</span>
      <span className={getAccuracyColor(accuracy)}>
        {getAccuracyText(accuracy)} (±{Math.round(accuracy)}m)
      </span>
    </div>
  );
};

const Navigation: React.FC<NavigationProps> = ({ targetLocation, onClose }) => {
  const [retryCount, setRetryCount] = useState(0);

  const {
    navigationState,
    error: navError,
    toggleNavigation,
    repeatInstruction,
    hasArrived,
    startNavigation,
  } = useNavigation(targetLocation, {
    enableVoiceGuidance: true,
    updateInterval: 3000,
    arrivalThreshold: 20,
    enableNotifications: true,
    enableVibration: true,
  });

  useEffect(() => {
    if (!navigationState.isNavigating && !hasArrived && !navError) {
      startNavigation();
    }
  }, []);

  const isLoading = !navigationState.isNavigating && !navError && !hasArrived && navigationState.currentDistance === 0;

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${targetLocation.latitude},${targetLocation.longitude}&travelmode=walking`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    startNavigation();
  };

  const formatTargetInfo = () => {
    return targetLocation.note || targetLocation.address || "Tu ubicación guardada";
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg mx-auto animate-in fade-in-0 slide-in-from-bottom-10 duration-300 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <NavigationIcon className="h-5 w-5 text-primary" />
              Navegación
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Hacia: {formatTargetInfo()}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Estado de carga */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center p-8 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-center">Obteniendo tu ubicación y calculando la mejor ruta...</p>
              <p className="text-xs text-muted-foreground text-center">Asegúrate de conceder permisos de ubicación</p>
            </div>
          )}

          {/* Estado de error */}
          {navError && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTitle className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Error de Navegación
                </AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>{navError}</p>
                  {retryCount < 3 && (
                    <Button size="sm" variant="outline" onClick={handleRetry} className="w-full mt-2">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reintentar ({3 - retryCount} intentos restantes)
                    </Button>
                  )}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Button size="sm" className="w-full" onClick={openInGoogleMaps}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir en Google Maps
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Coordenadas: {targetLocation.latitude.toFixed(6)}, {targetLocation.longitude.toFixed(6)}
                </p>
              </div>
            </div>
          )}

          {/* Estado de llegada */}
          {hasArrived && (
            <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
              <PartyPopper className="h-12 w-12 text-green-500" />
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-green-600 dark:text-green-400">¡Has llegado!</h3>
                <p className="text-muted-foreground">Tu coche debería estar muy cerca de tu posición actual.</p>
              </div>
              <Button onClick={onClose} className="mt-4">
                Finalizar navegación
              </Button>
            </div>
          )}

          {/* Estado de navegación activa */}
          {!isLoading && !navError && !hasArrived && (
            <div className="space-y-6">
              {/* Información del destino */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{formatTargetInfo()}</p>
                  {targetLocation.address && (
                    <p className="text-xs text-muted-foreground truncate">{targetLocation.address}</p>
                  )}
                </div>
                {navigationState.isNavigating && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <div className="w-2 h-2 bg-green-600 rounded-full mr-1 animate-pulse" />
                    Activo
                  </Badge>
                )}
              </div>

              {/* Resumen de la ruta */}
              <RouteSummary state={navigationState} />

              {/* Barra de progreso */}
              {navigationState.progress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progreso</span>
                    <span className="font-medium">{Math.round(navigationState.progress)}%</span>
                  </div>
                  <Progress value={navigationState.progress} className="w-full h-2" />
                </div>
              )}

              {/* Instrucción actual */}
              {navigationState.nextInstruction && (
                <Alert>
                  <StepForward className="h-4 w-4" />
                  <AlertTitle>Siguiente paso</AlertTitle>
                  <AlertDescription className="font-semibold text-base">
                    {navigationState.nextInstruction}
                  </AlertDescription>
                </Alert>
              )}

              {/* Información de precisión */}
              <AccuracyInfo accuracy={navigationState.accuracy} />

              {/* Controles de navegación */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="lg"
                    className="flex-1"
                    onClick={toggleNavigation}
                    variant={navigationState.isNavigating ? "destructive" : "default"}
                  >
                    {navigationState.isNavigating ? (
                      <>
                        <Pause className="h-5 w-5 mr-2" />
                        Detener
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5 mr-2" />
                        Iniciar
                      </>
                    )}
                  </Button>
                  <Button size="lg" variant="outline" onClick={repeatInstruction} title="Repetir instrucción de voz">
                    <Mic className="h-5 w-5" />
                  </Button>
                </div>

                <Button size="sm" variant="link" className="w-full" onClick={openInGoogleMaps}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir en Google Maps como alternativa
                </Button>
              </div>

              {/* Información adicional */}
              <div className="text-xs text-muted-foreground space-y-1 text-center">
                <p>La navegación usa tu GPS para guiarte hasta tu coche</p>
                <p>Mantén la pantalla encendida para mejores resultados</p>
                {navigationState.speed && navigationState.speed > 0 && (
                  <p>Velocidad detectada: {(navigationState.speed * 3.6).toFixed(1)} km/h</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Navigation;
