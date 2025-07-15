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
import { Target, Loader2, Search, Map, Eye, Navigation, AlertTriangle, PartyPopper } from "lucide-react";
import { LocationUtils, Formatters } from "@/utils";
import { toast } from "sonner";

interface ProximitySearchProps {
  locations: CarLocation[];
  onLocationSelect: (location: CarLocation) => void;
  onShowOnMap: (locations: CarLocation[]) => void;
  currentView?: "map" | "proximity";
  onViewChange?: (view: "map" | "proximity") => void;
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
}) => {
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nearbyLocations, setNearbyLocations] = useState<LocationWithDistance[]>([]);
  const [searchRadius, setSearchRadius] = useState<number>(500);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Función para obtener ubicación actual
  const getCurrentLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        });
      });
      setCurrentLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch (err: any) {
      console.error("Error getting location:", err);
      setError("No se pudo obtener tu ubicación. Asegúrate de tener el GPS activado y dar permisos.");
    } finally {
      setLoading(false);
    }
  }, []);

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
            onShowOnMap(nearbyFound);
          }
        });
      });
    } else {
      if (onShowOnMap) {
        onShowOnMap(nearbyFound);
      }
    }
  }, [currentView, onViewChange, onShowOnMap, nearbyFound]);

  // Función para actualizar ubicación con feedback
  const handleUpdateLocation = useCallback(async () => {
    try {
      await getCurrentLocation();
      toast.success("Ubicación actualizada correctamente");
    } catch (error) {
      toast.error("Error al actualizar la ubicación");
    }
  }, [getCurrentLocation]);

  const radiusOptions = [
    { label: "100m", value: 100 },
    { label: "250m", value: 250 },
    { label: "500m", value: 500 },
    { label: "1km", value: 1000 },
    { label: "2km", value: 2000 },
    { label: "5km", value: 5000 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search /> Buscar por proximidad
        </CardTitle>
        <CardDescription>Encuentra tus coches guardados cerca de tu ubicación actual.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!currentLocation ? (
          <div className="text-center p-6 border rounded-lg flex flex-col items-center gap-4">
            <Target className="w-10 h-10 text-primary" />
            <p className="font-medium">Necesitamos tu ubicación para buscar coches cercanos.</p>
            <Button onClick={getCurrentLocation} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Obteniendo...
                </>
              ) : (
                <>
                  <Target className="mr-2 h-4 w-4" /> Obtener mi Ubicación
                </>
              )}
            </Button>
            {error && (
              <Alert variant="destructive" className="mt-4 text-left">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selector de radio */}
            <div>
              <label className="text-sm font-medium mb-2 block">Radio de búsqueda:</label>
              <div className="flex flex-wrap gap-2">
                {radiusOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={searchRadius === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSearchRadius(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Resultados */}
            <div className="space-y-4">
              {locations.length === 0 ? (
                <Alert>
                  <Search className="h-4 w-4" />
                  <AlertDescription>No tienes ubicaciones guardadas para buscar.</AlertDescription>
                </Alert>
              ) : nearbyFound.length === 0 ? (
                <Alert>
                  <Search className="h-4 w-4" />
                  <AlertTitle>No se encontraron resultados</AlertTitle>
                  <AlertDescription>
                    No hay ubicaciones en un radio de {Formatters.formatDistance(searchRadius)}. Prueba aumentando el
                    radio.
                    {closestLocation && (
                      <Button
                        variant="link"
                        className="p-0 h-auto mt-2"
                        onClick={() => handleShowSingleLocation(closestLocation)}
                      >
                        Ver la más cercana a {Formatters.formatDistance(closestLocation.distance)}.
                      </Button>
                    )}
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
                            {location.note && <p className="text-sm font-medium">💭 {location.note}</p>}
                            {location.address && <p className="text-xs text-muted-foreground">📍 {location.address}</p>}
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

            {/* Botón para actualizar ubicación */}
            <Button variant="outline" onClick={handleUpdateLocation} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>🔄 Actualizar mi Ubicación</>
              )}
            </Button>

            {/* Botón adicional para ver todas las ubicaciones si no hay cercanas */}
            {nearbyFound.length === 0 && nearbyLocations.length > 0 && (
              <Button variant="outline" onClick={() => handleShowMultipleLocations()} className="w-full">
                <Map className="mr-2 h-4 w-4" />
                Ver todas mis ubicaciones en el mapa
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProximitySearch;
