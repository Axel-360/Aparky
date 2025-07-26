// src/features/location/components/ProximitySearch.tsx
import React, { useState, useEffect, useCallback } from "react";
import type { CarLocation } from "@/types/location";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/ui";
import {
  Target,
  Loader2,
  Search,
  Map,
  Eye,
  Navigation,
  AlertTriangle,
  PartyPopper,
  RefreshCw,
  Car,
  Bike,
  Footprints,
  MapPinCheck,
  Pin,
  NotebookText,
  RotateCcw,
} from "lucide-react";
import { LocationUtils, Formatters } from "@/utils";
import { toast } from "sonner";

interface ProximitySearchProps {
  locations: CarLocation[];
  onLocationSelect: (location: CarLocation) => void;
  onShowOnMap: (locations: CarLocation[]) => void;
  currentView?: "map" | "proximity";
  onViewChange?: (view: "map" | "proximity") => void;
  // Nueva prop para recibir la ubicación actual del contexto global
  currentUserLocation?: { latitude: number; longitude: number } | null;
}

interface LocationWithDistance extends CarLocation {
  distance: number;
  isNearby: boolean;
}

const ProximitySearch: React.FC<ProximitySearchProps> = ({
  locations,
  onLocationSelect,
  onShowOnMap,
  currentView,
  onViewChange,
  currentUserLocation, // Nueva prop
}) => {
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nearbyLocations, setNearbyLocations] = useState<LocationWithDistance[]>([]);
  const [searchRadius, setSearchRadius] = useState<number>(() => {
    // Recordar el último radio usado
    try {
      const saved = localStorage.getItem("proximity-search-radius");
      return saved ? parseInt(saved, 10) : 500;
    } catch {
      return 500;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoLocationAttempted, setAutoLocationAttempted] = useState(false);

  // Función para obtener ubicación actual
  const getCurrentLocation = useCallback(async (isAutomatic = false) => {
    if (!isAutomatic) {
      setLoading(true);
    }
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: isAutomatic ? 5000 : 10000, // Timeout más corto para automático
          maximumAge: isAutomatic ? 60000 : 300000, // Cache más corto para automático
        });
      });

      const newLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setCurrentLocation(newLocation);

      if (!isAutomatic) {
        toast.success("Ubicación actualizada correctamente");
      }
    } catch (err: any) {
      console.error("Error getting location:", err);
      const errorMessage = getLocationErrorMessage(err);
      setError(errorMessage);

      if (!isAutomatic) {
        toast.error(errorMessage);
      }
    } finally {
      if (!isAutomatic) {
        setLoading(false);
      }
      setAutoLocationAttempted(true);
    }
  }, []);

  // Función para cambiar radio con persistencia
  const handleRadiusChange = useCallback((newRadius: number) => {
    setSearchRadius(newRadius);
    try {
      localStorage.setItem("proximity-search-radius", newRadius.toString());
    } catch {
      // Silenciar errores de localStorage
    }
  }, []);

  // Función auxiliar para mensajes de error más amigables
  const getLocationErrorMessage = (error: any): string => {
    switch (error.code) {
      case 1: // PERMISSION_DENIED
        return "Permisos de ubicación denegados. Actívalos en la configuración del navegador.";
      case 2: // POSITION_UNAVAILABLE
        return "No se pudo determinar tu ubicación. Verifica que tengas GPS activado.";
      case 3: // TIMEOUT
        return "Tiempo agotado obteniendo ubicación. Inténtalo de nuevo.";
      default:
        return "No se pudo obtener tu ubicación. Asegúrate de tener el GPS activado y dar permisos.";
    }
  };

  // Efecto para obtener ubicación automáticamente al montar el componente
  useEffect(() => {
    let mounted = true;

    const initializeLocation = async () => {
      // 1. Primero intentar usar la ubicación del contexto global si está disponible y es reciente
      if (currentUserLocation) {
        console.log("🎯 Usando ubicación del contexto global");
        setCurrentLocation(currentUserLocation);
        return;
      }

      // 2. Si no hay ubicación global, intentar obtener ubicación automáticamente
      if (!autoLocationAttempted && mounted) {
        console.log("📍 Obteniendo ubicación automáticamente...");
        await getCurrentLocation(true);
      }
    };

    initializeLocation();

    return () => {
      mounted = false;
    };
  }, [currentUserLocation, autoLocationAttempted, getCurrentLocation]);

  // Actualizar ubicación local cuando cambie la global
  useEffect(() => {
    if (currentUserLocation && !currentLocation) {
      setCurrentLocation(currentUserLocation);
    }
  }, [currentUserLocation, currentLocation]);

  // Calcular ubicaciones cercanas
  useEffect(() => {
    if (!currentLocation || locations.length === 0) {
      setNearbyLocations([]);
      return;
    }

    const locationsWithDistance = locations
      .map((location) => ({
        ...location,
        distance: LocationUtils.calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          location.latitude,
          location.longitude
        ),
        isNearby:
          LocationUtils.calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            location.latitude,
            location.longitude
          ) <= searchRadius,
      }))
      .sort((a, b) => a.distance - b.distance);

    setNearbyLocations(locationsWithDistance);
  }, [currentLocation, locations, searchRadius]);

  // Manejar actualización manual de ubicación
  const handleUpdateLocation = useCallback(() => {
    getCurrentLocation(false);
  }, [getCurrentLocation]);

  // Derivar valores después del useEffect
  const nearbyFound = nearbyLocations.filter((loc) => loc.isNearby);
  const closestLocation = nearbyLocations[0];

  // Función para mostrar ubicación individual con scroll
  const handleShowSingleLocation = useCallback(
    (location: CarLocation) => {
      if (currentView !== "map" && onViewChange) {
        onViewChange("map");

        // Esperar a que React renderice antes de hacer scroll
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            onLocationSelect(location);
            if (onShowOnMap) {
              onShowOnMap([location]);
            }
          });
        });
      } else {
        onLocationSelect(location);
        if (onShowOnMap) {
          onShowOnMap([location]);
        }
      }
    },
    [currentView, onViewChange, onLocationSelect, onShowOnMap]
  );

  // Función para mostrar múltiples ubicaciones con scroll
  const handleShowMultipleLocations = useCallback(() => {
    if (currentView !== "map" && onViewChange) {
      onViewChange("map");

      // Esperar a que React renderice antes de hacer scroll
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (onShowOnMap) {
            onShowOnMap(nearbyFound.length > 0 ? nearbyFound : nearbyLocations);
          }
        });
      });
    } else {
      if (onShowOnMap) {
        onShowOnMap(nearbyFound.length > 0 ? nearbyFound : nearbyLocations);
      }
    }
  }, [currentView, onViewChange, onShowOnMap, nearbyFound, nearbyLocations]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Búsqueda por Proximidad
        </CardTitle>
        <CardDescription>Encuentra tus vehículos aparcados cerca de tu ubicación actual</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controles de radio de búsqueda */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Radio de búsqueda:</label>

          {/* Radios predefindos */}
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              {[100, 250, 500, 1000, 2000, 5000].map((radius) => (
                <Button
                  key={radius}
                  variant={searchRadius === radius ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleRadiusChange(radius)}
                  className="text-xs"
                >
                  {radius >= 1000 ? `${radius / 1000}km` : `${radius}m`}
                </Button>
              ))}
            </div>

            {/* Segunda fila con radios más grandes */}
            <div className="flex gap-2 flex-wrap">
              {[10000, 25000, 50000, 100000].map((radius) => (
                <Button
                  key={radius}
                  variant={searchRadius === radius ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleRadiusChange(radius)}
                  className="text-xs"
                >
                  {radius / 1000}km
                </Button>
              ))}
            </div>
          </div>

          {/* Radio personalizado y atajos */}
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="Radio personalizado"
                className="flex h-8 w-42 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    handleRadiusChange(value);
                  }
                }}
              />
              <span className="text-xs text-muted-foreground">metros</span>
            </div>

            {/* Atajos de distancia comunes */}
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => handleRadiusChange(200)}
                className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
              >
                <Footprints className="w-5 h-5 inline mr-1" /> 2 manzanas
              </button>
              <button
                onClick={() => handleRadiusChange(800)}
                className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
              >
                <Footprints className="w-5 h-5 inline mr-1" /> Cerca andando
              </button>
              <button
                onClick={() => handleRadiusChange(2000)}
                className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
              >
                <Bike className="w-5 h-5 inline mr-1" /> Barrio
              </button>
              <button
                onClick={() => handleRadiusChange(10000)}
                className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
              >
                <Car className="w-5 h-5 inline mr-1" /> Ciudad
              </button>
            </div>
          </div>

          {/* Indicador del radio actual */}
          <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
            <Search className="w-4 h-4 inline mr-1" /> Buscando en{" "}
            {searchRadius >= 1000
              ? `${(searchRadius / 1000).toFixed(searchRadius >= 10000 ? 0 : 1)}km`
              : `${searchRadius}m`}
            {searchRadius >= 50000 && " (búsqueda muy amplia)"}
          </div>
        </div>

        {/* Estado de carga inicial */}
        {!autoLocationAttempted && !currentLocation && (
          <div className="flex items-center justify-center p-8">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Obteniendo tu ubicación...</p>
            </div>
          </div>
        )}

        {/* Error de ubicación */}
        {error && !currentLocation && (
          <Alert className="border-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error de ubicación</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{error}</p>
              <Button variant="outline" onClick={handleUpdateLocation} disabled={loading} size="sm">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reintentando...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reintentar
                  </>
                )}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Contenido principal cuando hay ubicación */}
        {currentLocation && (
          <div className="space-y-4">
            {/* Estado actual */}
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium text-green-800 dark:text-green-200">
                    <MapPinCheck className="w-5 h-5 inline mr-1" /> Ubicación obtenida
                  </span>
                  <p className="text-green-600 dark:text-green-400 text-xs mt-1">
                    Buscando en un radio de {searchRadius >= 1000 ? `${searchRadius / 1000}km` : `${searchRadius}m`}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleUpdateLocation} disabled={loading} className="h-8">
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                </Button>
              </div>
            </div>

            {/* Resultados de búsqueda */}
            <div className="space-y-4">
              {locations.length === 0 ? (
                <Alert>
                  <Search className="h-4 w-4" />
                  <AlertDescription>
                    No tienes ubicaciones guardadas aún. Guarda una ubicación primero para usar la búsqueda por
                    proximidad.
                  </AlertDescription>
                </Alert>
              ) : nearbyFound.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="space-y-3">
                    <p>
                      No hay vehículos aparcados en un radio de{" "}
                      {searchRadius >= 1000 ? `${searchRadius / 1000}km` : `${searchRadius}m`}.
                    </p>
                    {closestLocation && (
                      <p className="text-sm">
                        Tu vehículo más cercano está a{" "}
                        <span className="font-medium">{Formatters.formatDistance(closestLocation.distance)}</span>.
                      </p>
                    )}
                    <Button variant="outline" size="sm" onClick={handleShowMultipleLocations}>
                      <Map className="mr-2 h-4 w-4" />
                      Ver todas en el mapa
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="flex justify-between items-center bg-muted/50 p-2 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-bold text-foreground">{nearbyFound.length}</span> ubicaciones encontradas.
                    </p>
                    <Button variant="secondary" size="sm" onClick={handleShowMultipleLocations}>
                      <Map className="mr-2 h-4 w-4" /> Ver en mapa
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {nearbyFound.map((location) => (
                      <Card key={location.id} className="p-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold bg-primary text-primary-foreground px-2 py-1 rounded-md">
                                {Formatters.formatDistance(location.distance)}
                              </span>
                              <p className="text-sm text-muted-foreground">
                                {new Date(location.timestamp).toLocaleDateString()}
                              </p>
                            </div>
                            {location.note && (
                              <p className="text-sm font-medium">
                                <NotebookText className="w-4 h-4 inline mr-1" />
                                {location.note}
                              </p>
                            )}
                            {location.address && (
                              <p className="text-xs text-muted-foreground">
                                <Pin className="w-4 h-4 inline mr-1  text-red-700" /> {location.address}
                              </p>
                            )}
                            {location.distance <= 100 && (
                              <Alert className="mt-2 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                                <PartyPopper className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-700 dark:text-green-300">
                                  ¡Muy cerca! Debería ser visible.
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleShowSingleLocation(location)}
                              title="Ver en mapa"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() =>
                                window.open(
                                  `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}&travelmode=walking`,
                                  "_blank",
                                  "noopener,noreferrer"
                                )
                              }
                              title="Navegar con Google Maps"
                            >
                              <Navigation className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProximitySearch;
