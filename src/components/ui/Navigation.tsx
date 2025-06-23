// src/components/ui/Navigation.tsx
import React, { useState, useEffect } from "react";
import type { CarLocation, LocationWithAccuracy } from "../../types/location";
import { useGoogleMaps } from "../../utils/googleMapsService";
import { useNavigation } from "../../hooks/useNavigation";

interface NavigationProps {
  targetLocation: CarLocation;
  currentLocation?: LocationWithAccuracy | null;
  onClose: () => void;
}

interface NavigationInfo {
  distance: number;
  walkingTime: number;
  bearing: number;
  steps?: string[];
  googleDirections?: any;
  nearbyPlaces?: any[];
  streetViewUrl?: string;
}

interface RouteOption {
  mode: "walking" | "driving" | "transit";
  duration: string;
  distance: string;
  description: string;
  icon: string;
  color: string;
}

const Navigation: React.FC<NavigationProps> = ({ targetLocation, currentLocation, onClose }) => {
  // Usar el hook personalizado de navegación
  const {
    navigationState,
    currentLocation: liveLocation,
    error: navError,
    hasArrived,
    stopNavigationSilent,
    toggleNavigation,
    repeatInstruction,
  } = useNavigation(targetLocation, {
    enableVoiceGuidance: true,
    updateInterval: 3000,
    arrivalThreshold: 15,
    enableNotifications: true,
    enableVibration: true,
  });

  // Estados locales para información estática
  const [navInfo, setNavInfo] = useState<NavigationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<"walking" | "driving" | "transit">("walking");
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [showNearbyPlaces, setShowNearbyPlaces] = useState(false);

  const { isReady: googleMapsReady, service: googleMapsService } = useGoogleMaps();

  // Manejar cierre del modal
  const handleClose = () => {
    // Si está navegando, detener silenciosamente
    if (navigationState.isNavigating) {
      stopNavigationSilent();
    }
    onClose();
  };

  // Usar ubicación en vivo si está disponible, sino la inicial
  const effectiveLocation = liveLocation || currentLocation;
  const displayError = error || navError;

  // Funciones de cálculo (mantener para información inicial)
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

  const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y, x);
    return ((θ * 180) / Math.PI + 360) % 360;
  };

  const getCardinalDirection = (bearing: number): string => {
    const directions = ["Norte", "Noreste", "Este", "Sureste", "Sur", "Suroeste", "Oeste", "Noroeste"];
    return directions[Math.round(bearing / 45) % 8];
  };

  const formatDistance = (distance: number): string => {
    if (distance < 1000) {
      return `${Math.round(distance)} metros`;
    } else {
      return `${(distance / 1000).toFixed(1)} km`;
    }
  };

  const formatWalkingTime = (minutes: number): string => {
    if (minutes < 1) return "Menos de 1 minuto";
    if (minutes < 60) return `${Math.round(minutes)} minutos`;

    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  // Obtener direcciones usando Google Maps API
  const getGoogleDirections = async (
    currentLat: number,
    currentLon: number,
    targetLat: number,
    targetLon: number,
    mode: "walking" | "driving" | "transit"
  ) => {
    if (!googleMapsService) return null;

    try {
      const directions = await googleMapsService.getDirections(
        { lat: currentLat, lng: currentLon },
        { lat: targetLat, lng: targetLon },
        mode,
        true
      );
      return directions;
    } catch (error) {
      console.error("Error getting Google directions:", error);
      return null;
    }
  };

  // Obtener información inicial de navegación
  const getDetailedDirections = async (
    currentLat: number,
    currentLon: number,
    targetLat: number,
    targetLon: number
  ): Promise<NavigationInfo> => {
    const distance = calculateDistance(currentLat, currentLon, targetLat, targetLon);
    const bearing = calculateBearing(currentLat, currentLon, targetLat, targetLon);
    const walkingTime = distance / 83.33;

    let steps: string[] = [];
    let googleDirections = null;
    let nearbyPlaces: any[] = [];
    let streetViewUrl: string | undefined;

    if (googleMapsService) {
      try {
        googleDirections = await getGoogleDirections(currentLat, currentLon, targetLat, targetLon, selectedMode);

        if (googleDirections?.routes[0]?.legs[0]?.steps) {
          steps = googleDirections.routes[0].legs[0].steps.map((step: any) =>
            step.html_instructions.replace(/<[^>]*>/g, "")
          );
        }

        nearbyPlaces = await googleMapsService.findNearbyPlaces({ lat: targetLat, lng: targetLon }, "parking", 500);

        streetViewUrl = googleMapsService.getStreetViewUrl(
          { lat: targetLat, lng: targetLon },
          { size: "400x300", fov: 90, heading: bearing }
        );
      } catch (error) {
        console.error("Error with Google Maps services:", error);
      }
    }

    if (steps.length === 0) {
      if (distance > 500) {
        steps = [
          `Sal desde tu ubicación actual`,
          `Dirígete hacia el ${getCardinalDirection(bearing)}`,
          `Continúa por ${formatDistance(distance * 0.7)}`,
          `Gira cuando veas referencias cercanas al destino`,
          `Tu coche está a ${formatDistance(distance * 0.3)} más adelante`,
        ];
      } else {
        steps = [
          `Dirígete hacia el ${getCardinalDirection(bearing)}`,
          `Tu coche está a solo ${formatDistance(distance)} de distancia`,
          `Deberías poder verlo desde aquí`,
        ];
      }
    }

    return {
      distance,
      walkingTime,
      bearing,
      steps,
      googleDirections,
      nearbyPlaces,
      streetViewUrl,
    };
  };

  // Obtener opciones de ruta
  const getRouteOptions = async (currentLat: number, currentLon: number, targetLat: number, targetLon: number) => {
    if (!googleMapsService) return [];

    try {
      const bestRoutes = await googleMapsService.getBestRoute(
        { lat: currentLat, lng: currentLon },
        { lat: targetLat, lng: targetLon }
      );

      const options: RouteOption[] = [];

      if (bestRoutes.walking) {
        options.push({
          mode: "walking",
          duration: bestRoutes.walking.routes[0]?.legs[0]?.duration?.text || "",
          distance: bestRoutes.walking.routes[0]?.legs[0]?.distance?.text || "",
          description: "A pie",
          icon: "🚶",
          color: "#28a745",
        });
      }

      if (bestRoutes.driving) {
        options.push({
          mode: "driving",
          duration: bestRoutes.driving.routes[0]?.legs[0]?.duration?.text || "",
          distance: bestRoutes.driving.routes[0]?.legs[0]?.distance?.text || "",
          description: "En coche",
          icon: "🚗",
          color: "#007bff",
        });
      }

      if (bestRoutes.transit) {
        options.push({
          mode: "transit",
          duration: bestRoutes.transit.routes[0]?.legs[0]?.duration?.text || "",
          distance: bestRoutes.transit.routes[0]?.legs[0]?.distance?.text || "",
          description: "Transporte público",
          icon: "🚌",
          color: "#6f42c1",
        });
      }

      return options;
    } catch (error) {
      console.error("Error getting route options:", error);
      return [];
    }
  };

  // Cargar información inicial
  useEffect(() => {
    const loadNavigation = async () => {
      setLoading(true);
      setError(null);

      try {
        let current = effectiveLocation;

        if (!current) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              if (!navigator.geolocation) {
                reject(new Error("Geolocalización no soportada"));
                return;
              }

              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000,
              });
            });

            current = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
          } catch (geoError) {
            console.error("Error getting geolocation:", geoError);
            throw new Error("No se pudo obtener tu ubicación actual");
          }
        }

        if (!current) {
          throw new Error("No se pudo determinar tu ubicación");
        }

        const navigationInfo = await getDetailedDirections(
          current.latitude,
          current.longitude,
          targetLocation.latitude,
          targetLocation.longitude
        );

        setNavInfo(navigationInfo);

        if (googleMapsReady) {
          const options = await getRouteOptions(
            current.latitude,
            current.longitude,
            targetLocation.latitude,
            targetLocation.longitude
          );
          setRouteOptions(options);
        }
      } catch (error) {
        console.error("Error getting navigation:", error);
        setError(error instanceof Error ? error.message : "Error desconocido al calcular la navegación");
      } finally {
        setLoading(false);
      }
    };

    loadNavigation();
  }, [targetLocation, effectiveLocation, selectedMode, googleMapsReady]);

  const openInMaps = (mode: "walking" | "driving" | "transit" = selectedMode) => {
    const travelMode = mode === "walking" ? "walking" : mode === "transit" ? "transit" : "driving";
    const url = `https://www.google.com/maps/dir/?api=1&destination=${targetLocation.latitude},${targetLocation.longitude}&travelmode=${travelMode}`;
    window.open(url, "_blank");
  };

  const openInAppleMaps = () => {
    const directionFlag = selectedMode === "walking" ? "w" : selectedMode === "transit" ? "r" : "d";
    const url = `http://maps.apple.com/?daddr=${targetLocation.latitude},${targetLocation.longitude}&dirflg=${directionFlag}`;
    window.open(url, "_blank");
  };

  const shareLocation = async () => {
    const text = `Mi coche está aquí: https://www.google.com/maps?q=${targetLocation.latitude},${targetLocation.longitude}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Ubicación de mi coche",
          text: text,
        });
      } catch (shareError) {
        console.log("Error sharing:", shareError);
        copyToClipboard(text);
      }
    } else {
      copyToClipboard(text);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("Ubicación copiada al portapapeles");
      })
      .catch(() => {
        alert("No se pudo copiar la ubicación");
      });
  };

  // Componente de controles de navegación
  const NavigationControls = () => (
    <div className="navigation-controls">
      <button
        className={`nav-control-btn ${navigationState.isNavigating ? "active" : ""}`}
        onClick={toggleNavigation}
        disabled={!effectiveLocation}
        title={navigationState.isNavigating ? "Detener navegación GPS" : "Iniciar navegación GPS"}
      >
        <span className="nav-icon">{navigationState.isNavigating ? "⏹️" : "🧭"}</span>
        {navigationState.isNavigating ? "Detener navegación" : "Iniciar navegación GPS"}
      </button>

      {navigationState.isNavigating && (
        <button className="voice-guidance-btn" onClick={repeatInstruction} title="Repetir instrucción de navegación">
          🔊 Repetir
        </button>
      )}
    </div>
  );

  // Componente de estado de navegación en vivo
  const NavigationStatus = () => {
    if (!navigationState.isNavigating) return null;

    const currentDistance = navigationState.currentDistance || 0;
    const direction = navigationState.direction || "";
    const progress = navigationState.progress || 0;

    return (
      <div className="navigation-status-panel">
        <div className="status-header">
          <span className="status-icon">🧭</span>
          <h4>Navegación GPS activa</h4>
          {hasArrived && <span className="arrived-badge">¡Llegaste!</span>}
        </div>

        <div className="status-metrics">
          <div className="metric">
            <span className="metric-label">Distancia:</span>
            <span className="metric-value">{Math.round(currentDistance)}m</span>
          </div>

          <div className="metric">
            <span className="metric-label">Dirección:</span>
            <span className="metric-value">{direction}</span>
          </div>

          {navigationState.estimatedArrival && (
            <div className="metric">
              <span className="metric-label">Llegada:</span>
              <span className="metric-value">{navigationState.estimatedArrival.toLocaleTimeString()}</span>
            </div>
          )}

          {navigationState.speed !== undefined && navigationState.speed > 0.5 && (
            <div className="metric">
              <span className="metric-label">Velocidad:</span>
              <span className="metric-value">{(navigationState.speed * 3.6).toFixed(1)} km/h</span>
            </div>
          )}
        </div>

        <div className="progress-section">
          <div className="progress-bar-nav">
            <div className="progress-fill-nav" style={{ width: `${Math.min(100, progress)}%` }} />
          </div>
          <span className="progress-text">{Math.round(progress)}% del camino completado</span>
        </div>

        {navigationState.nextInstruction && (
          <div className="next-instruction">
            <span className="instruction-icon">📍</span>
            <p>{navigationState.nextInstruction}</p>
          </div>
        )}

        {hasArrived && (
          <div className="arrival-alert">
            <span className="arrival-icon">🎉</span>
            <p>¡Has llegado a tu destino! Tu coche debería estar muy cerca.</p>
          </div>
        )}

        {effectiveLocation?.accuracy && effectiveLocation.accuracy > 20 && (
          <div className="accuracy-warning">
            <span className="warning-icon">⚠️</span>
            <p>Precisión GPS baja ({Math.round(effectiveLocation.accuracy)}m). Busca un área con mejor señal.</p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="navigation-modal">
        <div className="navigation-content">
          <div className="navigation-header">
            <h3>🧭 Calculando ruta...</h3>
            <button className="close-btn" onClick={handleClose}>
              ✕
            </button>
          </div>
          <div className="navigation-loading">
            <div className="loading-spinner"></div>
            <p>Obteniendo tu ubicación y calculando la mejor ruta</p>
            {googleMapsReady && <p className="loading-sub">Conectando con Google Maps...</p>}
          </div>
        </div>
      </div>
    );
  }

  if (displayError) {
    return (
      <div className="navigation-modal">
        <div className="navigation-content">
          <div className="navigation-header">
            <h3>🧭 Error de navegación</h3>
            <button className="close-btn" onClick={handleClose}>
              ✕
            </button>
          </div>
          <div className="navigation-error">
            <p>⚠️ {displayError}</p>
            <div className="fallback-options">
              <button className="maps-btn" onClick={() => openInMaps()}>
                🗺️ Abrir en Google Maps
              </button>
              <button className="maps-btn" onClick={openInAppleMaps}>
                🍎 Abrir en Apple Maps
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="navigation-modal">
      <div className="navigation-content">
        <div className="navigation-header">
          <h3>🧭 Navegación a tu coche</h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <NavigationControls />
        <NavigationStatus />

        {navInfo && (
          <div className="navigation-info">
            {/* Opciones de ruta */}
            {routeOptions.length > 0 && (
              <div className="route-options">
                <h4>🚀 Opciones de ruta:</h4>
                <div className="route-tabs">
                  {routeOptions.map((option) => (
                    <button
                      key={option.mode}
                      className={`route-tab ${selectedMode === option.mode ? "active" : ""}`}
                      onClick={() => setSelectedMode(option.mode)}
                      style={{ borderColor: option.color }}
                    >
                      <span className="route-icon">{option.icon}</span>
                      <div className="route-details">
                        <div className="route-mode">{option.description}</div>
                        <div className="route-time">{option.duration}</div>
                        <div className="route-distance">{option.distance}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Resumen de ruta (usar datos en vivo si están disponibles) */}
            <div className="route-summary">
              <div className="summary-item">
                <span className="summary-icon">📏</span>
                <div className="summary-details">
                  <strong>Distancia:</strong>
                  <span>
                    {formatDistance(navigationState.isNavigating ? navigationState.currentDistance : navInfo.distance)}
                  </span>
                </div>
              </div>

              <div className="summary-item">
                <span className="summary-icon">⏱️</span>
                <div className="summary-details">
                  <strong>Tiempo estimado:</strong>
                  <span>
                    {navigationState.estimatedArrival
                      ? `${Math.round((navigationState.estimatedArrival.getTime() - Date.now()) / 60000)} min`
                      : formatWalkingTime(navInfo.walkingTime)}
                  </span>
                </div>
              </div>

              <div className="summary-item">
                <span className="summary-icon">🧭</span>
                <div className="summary-details">
                  <strong>Dirección:</strong>
                  <span>
                    {navigationState.isNavigating ? navigationState.direction : getCardinalDirection(navInfo.bearing)}
                  </span>
                </div>
              </div>
            </div>

            {/* Street View */}
            {navInfo.streetViewUrl && (
              <div className="street-view-section">
                <h4>📸 Vista del destino:</h4>
                <img
                  src={navInfo.streetViewUrl}
                  alt="Vista del destino"
                  className="street-view-image"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}

            {/* Instrucciones paso a paso */}
            {navInfo.steps && !navigationState.isNavigating && (
              <div className="route-steps">
                <h4>📋 Instrucciones paso a paso:</h4>
                <ol className="steps-list">
                  {navInfo.steps.map((step, index) => (
                    <li key={index} className="step-item">
                      <span className="step-number">{index + 1}</span>
                      <span className="step-text">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Lugares cercanos */}
            {navInfo.nearbyPlaces && navInfo.nearbyPlaces.length > 0 && (
              <div className="nearby-places">
                <button className="toggle-nearby" onClick={() => setShowNearbyPlaces(!showNearbyPlaces)}>
                  🅿️ Parkings cercanos ({navInfo.nearbyPlaces.length})
                  <span className={`toggle-icon ${showNearbyPlaces ? "open" : ""}`}>▼</span>
                </button>

                {showNearbyPlaces && (
                  <div className="places-list">
                    {navInfo.nearbyPlaces.slice(0, 5).map((place, index) => (
                      <div key={index} className="place-item">
                        <div className="place-info">
                          <strong>{place.name}</strong>
                          <span className="place-vicinity">{place.vicinity}</span>
                          {place.rating && <span className="place-rating">⭐ {place.rating}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="destination-info">
              <h4>🎯 Destino:</h4>
              <div className="destination-details">
                {targetLocation.note && (
                  <p>
                    <strong>Nota:</strong> {targetLocation.note}
                  </p>
                )}
                {targetLocation.address && (
                  <p>
                    <strong>Dirección:</strong> {targetLocation.address}
                  </p>
                )}
                <p>
                  <strong>Guardado:</strong> {new Date(targetLocation.timestamp).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="navigation-actions">
              {!navigationState.isNavigating && (
                <button className="start-nav-btn primary" onClick={() => openInMaps()}>
                  🚀 Abrir navegación externa
                </button>
              )}

              <div className="secondary-actions">
                <button className="maps-option-btn" onClick={openInAppleMaps}>
                  🍎 Apple Maps
                </button>

                <button className="share-location-btn" onClick={shareLocation}>
                  📤 Compartir
                </button>
              </div>
            </div>

            {/* Alertas de proximidad */}
            {navigationState.currentDistance > 0 && navigationState.currentDistance < 50 && (
              <div className="proximity-alert">
                <span className="proximity-icon">🎉</span>
                <p>¡Estás muy cerca! Tu coche debería estar visible desde aquí.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Navigation;
