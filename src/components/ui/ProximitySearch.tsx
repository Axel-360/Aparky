// src/components/ui/ProximitySearch.tsx
import React, { useState, useEffect } from "react";
import type { CarLocation } from "../../types/location";

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
  const [searchRadius, setSearchRadius] = useState<number>(500); // metros
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calcular distancia entre dos puntos
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Formatear distancia
  const formatDistance = (distance: number): string => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  };

  // Obtener ubicación actual
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

      setCurrentLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (error) {
      console.error("Error getting location:", error);
      setError("No se pudo obtener tu ubicación actual. Verifica que tengas GPS activado.");
    } finally {
      setLoading(false);
    }
  };

  // Buscar ubicaciones cercanas
  useEffect(() => {
    if (!currentLocation || locations.length === 0) {
      setNearbyLocations([]);
      return;
    }

    const locationsWithDistance = locations.map((location) => {
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        location.latitude,
        location.longitude
      );

      return {
        ...location,
        distance,
        isNearby: distance <= searchRadius,
      };
    });

    // Ordenar por distancia
    locationsWithDistance.sort((a, b) => a.distance - b.distance);
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

  const nearbyCount = nearbyLocations.filter((loc) => loc.isNearby).length;
  const closestLocation = nearbyLocations[0];

  return (
    <div className="proximity-search">
      <div className="proximity-header">
        <h3>📍 Ubicaciones cercanas</h3>
        <p>Encuentra ubicaciones de aparcamiento cerca de ti</p>
      </div>

      {!currentLocation ? (
        <div className="location-prompt">
          <div className="prompt-content">
            <span className="prompt-icon">🎯</span>
            <p>Para buscar ubicaciones cercanas necesitamos tu ubicación actual</p>
            <button className="get-location-btn" onClick={getCurrentLocation} disabled={loading}>
              {loading ? "⏳ Obteniendo ubicación..." : "📍 Obtener mi ubicación"}
            </button>
            {error && <p className="error-text">{error}</p>}
          </div>
        </div>
      ) : (
        <div className="proximity-content">
          <div className="search-controls">
            <div className="radius-selector">
              <label>Radio de búsqueda:</label>
              <div className="radius-options">
                {radiusOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`radius-btn ${searchRadius === option.value ? "active" : ""}`}
                    onClick={() => setSearchRadius(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="search-summary">
              <div className="summary-stats">
                <span className="stat-item">
                  📊 {nearbyCount} de {locations.length} ubicaciones en {formatDistance(searchRadius)}
                </span>
                {closestLocation && (
                  <span className="stat-item">🎯 La más cercana a {formatDistance(closestLocation.distance)}</span>
                )}
              </div>

              {nearbyCount > 0 && (
                <button
                  className="show-all-btn"
                  onClick={() => onShowOnMap(nearbyLocations.filter((loc) => loc.isNearby))}
                >
                  🗺️ Ver todas en el mapa
                </button>
              )}
            </div>
          </div>

          <div className="locations-list">
            {nearbyLocations.length === 0 ? (
              <div className="no-locations">
                <span className="no-locations-icon">🔍</span>
                <p>No tienes ubicaciones guardadas aún</p>
                <p>Guarda algunas ubicaciones para verlas aquí</p>
              </div>
            ) : nearbyCount === 0 ? (
              <div className="no-nearby">
                <span className="no-nearby-icon">📍</span>
                <p>No hay ubicaciones guardadas en un radio de {formatDistance(searchRadius)}</p>
                <p>Prueba aumentando el radio de búsqueda</p>
                {closestLocation && (
                  <div className="closest-suggestion">
                    <p>La ubicación más cercana está a {formatDistance(closestLocation.distance)}</p>
                    <button className="go-to-closest-btn" onClick={() => onLocationSelect(closestLocation)}>
                      🎯 Ver ubicación más cercana
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="nearby-locations">
                {nearbyLocations.map((location) => (
                  <div
                    key={location.id}
                    className={`proximity-location-item ${location.isNearby ? "nearby" : "distant"}`}
                  >
                    <div className="location-main">
                      <div className="location-info">
                        <div className="location-title">
                          <span className={`distance-badge ${location.isNearby ? "near" : "far"}`}>
                            {formatDistance(location.distance)}
                          </span>
                          <span className="location-date">{new Date(location.timestamp).toLocaleDateString()}</span>
                        </div>

                        {location.note && <p className="location-note">💭 {location.note}</p>}

                        {location.address && <p className="location-address">📍 {location.address}</p>}
                      </div>

                      <div className="location-actions">
                        <button
                          className="action-btn view-btn"
                          onClick={() => onLocationSelect(location)}
                          title="Ver en mapa"
                        >
                          👁️
                        </button>

                        <button
                          className="action-btn navigate-btn"
                          onClick={() => {
                            const url = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}&travelmode=walking`;
                            window.open(url, "_blank");
                          }}
                          title="Navegar"
                        >
                          🧭
                        </button>
                      </div>
                    </div>

                    {location.distance <= 100 && (
                      <div className="very-close-alert">
                        <span className="alert-icon">🎉</span>
                        <span>¡Muy cerca! Debería ser visible</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="proximity-actions">
            <button className="refresh-location-btn" onClick={getCurrentLocation} disabled={loading}>
              🔄 Actualizar mi ubicación
            </button>

            {nearbyCount > 0 && (
              <button
                className="navigate-closest-btn"
                onClick={() => {
                  const closest = nearbyLocations.find((loc) => loc.isNearby);
                  if (closest) {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${closest.latitude},${closest.longitude}&travelmode=walking`;
                    window.open(url, "_blank");
                  }
                }}
              >
                🚀 Ir a la más cercana
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProximitySearch;
