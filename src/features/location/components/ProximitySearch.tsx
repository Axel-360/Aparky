// src/features/location/components/ProximitySearch.tsx
import React, { useState, useEffect } from "react";
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

interface ProximitySearchProps {
  locations: CarLocation[];
  onLocationSelect: (location: CarLocation) => void;
  onShowOnMap: (locations: CarLocation[]) => void;
}

interface LocationWithDistance extends CarLocation {
  distance: number;
  isNearby: boolean;
}

const ProximitySearch: React.FC<ProximitySearchProps> = ({ locations, onLocationSelect, onShowOnMap }) => {
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nearbyLocations, setNearbyLocations] = useState<LocationWithDistance[]>([]);
  const [searchRadius, setSearchRadius] = useState<number>(500);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatDistance = (distance: number): string => {
    if (distance < 1000) return `${Math.round(distance)}m`;
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const getCurrentLocation = async () => {
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
  };

  useEffect(() => {
    if (!currentLocation || locations.length === 0) {
      setNearbyLocations([]);
      return;
    }
    const locationsWithDistance = locations
      .map((location) => ({
        ...location,
        distance: calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          location.latitude,
          location.longitude
        ),
        isNearby:
          calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            location.latitude,
            location.longitude
          ) <= searchRadius,
      }))
      .sort((a, b) => a.distance - b.distance);
    setNearbyLocations(locationsWithDistance);
  }, [currentLocation, locations, searchRadius]);

  const radiusOptions = [
    { label: "100m", value: 100 },
    { label: "250m", value: 250 },
    { label: "500m", value: 500 },
    { label: "1km", value: 1000 },
    { label: "2km", value: 2000 },
    { label: "5km", value: 5000 },
  ];

  const nearbyFound = nearbyLocations.filter((loc) => loc.isNearby);
  const closestLocation = nearbyLocations[0];

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
                  {" "}
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Obteniendo...{" "}
                </>
              ) : (
                <>
                  {" "}
                  <Target className="mr-2 h-4 w-4" /> Obtener mi Ubicación{" "}
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
            {/* Radius Selector */}
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

            {/* Results */}
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
                    No hay ubicaciones en un radio de {formatDistance(searchRadius)}. Prueba aumentando el radio.
                    {closestLocation && (
                      <Button
                        variant="link"
                        className="p-0 h-auto mt-2"
                        onClick={() => onLocationSelect(closestLocation)}
                      >
                        Ver la más cercana a {formatDistance(closestLocation.distance)}.
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
                    <Button variant="secondary" size="sm" onClick={() => onShowOnMap(nearbyFound)}>
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
                                {formatDistance(location.distance)}
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
                              onClick={() => onLocationSelect(location)}
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
                              title="Navegar"
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
            <Button variant="outline" onClick={getCurrentLocation} disabled={loading} className="w-full">
              {loading ? (
                <>
                  {" "}
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Actualizando...{" "}
                </>
              ) : (
                "🔄 Actualizar mi Ubicación"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProximitySearch;
