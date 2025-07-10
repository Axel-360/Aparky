// src/features/location/components/UnifiedMap/UnifiedMap.tsx
import React, { useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/shared/ui";
import { Navigation, Target } from "lucide-react";
import { toast } from "sonner";
import type { CarLocation } from "@/types/location";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const createIcon = (type: "car" | "gps" | "manual", isSelected: boolean = false) => {
  const colors = {
    car: isSelected ? "#ef4444" : "#3b82f6",
    gps: "#22c55e",
    manual: "#f59e0b",
  };

  const emojis = {
    car: "🚗",
    gps: "📍",
    manual: "🎯",
  };

  return L.divIcon({
    html: `<div style="
      background-color: ${colors[type]};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      animation: ${isSelected ? "pulse 2s infinite" : "none"};
    ">${emojis[type]}</div>
    <style>
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
    </style>`,
    className: `unified-map-marker-${type}`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
};

const getMapConfig = (mapType: string) => {
  switch (mapType) {
    case "satellite":
      return {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: "&copy; Esri",
      };
    case "terrain":
      return {
        url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        attribution: "&copy; OpenStreetMap contributors, SRTM",
      };
    default:
      return {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: "&copy; OpenStreetMap contributors",
      };
  }
};

const MapController: React.FC<{
  center: [number, number];
  zoom: number;
  shouldFlyTo?: boolean;
}> = ({ center, zoom, shouldFlyTo = false }) => {
  const map = useMap();

  useEffect(() => {
    if (shouldFlyTo) {
      map.flyTo(center, zoom, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    } else {
      map.setView(center, zoom);
    }
  }, [map, center, zoom, shouldFlyTo]);

  return null;
};

const MapClickHandler: React.FC<{
  onMapClick?: (lat: number, lng: number) => void;
  isClickable: boolean;
}> = ({ onMapClick, isClickable }) => {
  useMapEvents({
    click: (e) => {
      if (isClickable && onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

const MapControls: React.FC<{
  onCurrentLocation?: () => void;
  onReset?: () => void;
  showLocationButton?: boolean;
  showResetButton?: boolean;
  isLoadingLocation?: boolean;
}> = ({ onCurrentLocation, showLocationButton = true, isLoadingLocation = false }) => {
  return (
    <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
      {showLocationButton && (
        <Button
          size="sm"
          variant="outline"
          onClick={onCurrentLocation}
          disabled={isLoadingLocation}
          className="bg-white/90 backdrop-blur-sm"
          title="Mi ubicación actual"
        >
          <Navigation className={`h-4 w-4 ${isLoadingLocation ? "animate-spin" : ""}`} />
        </Button>
      )}
    </div>
  );
};

interface UnifiedMapProps {
  center: [number, number];
  zoom?: number;
  mapType?: string;
  height?: string;

  locations?: CarLocation[];
  selectedLocationId?: string;

  isManualMode?: boolean;
  manualLocation?: [number, number] | null;
  onManualLocationSet?: (lat: number, lng: number) => void;

  gpsLocation?: [number, number] | null;

  showControls?: boolean;
  showLocationButton?: boolean;
  showResetButton?: boolean;

  onLocationClick?: (location: CarLocation) => void;
  onCenterChange?: (center: [number, number], zoom: number) => void;
}

export const UnifiedMap: React.FC<UnifiedMapProps> = ({
  center,
  zoom = 13,
  mapType = "osm",
  height = "400px",
  locations = [],
  selectedLocationId,
  isManualMode = false,
  manualLocation,
  onManualLocationSet,
  gpsLocation,
  showControls = false,
  showLocationButton = false,
  showResetButton = false,
  onLocationClick,
  onCenterChange,
}) => {
  const [isLoadingLocation, setIsLoadingLocation] = React.useState(false);
  const [currentCenter, setCurrentCenter] = React.useState<[number, number]>(center);
  const [currentZoom, setCurrentZoom] = React.useState(zoom);
  const mapRef = useRef<L.Map | null>(null);

  const mapConfig = getMapConfig(mapType);

  useEffect(() => {
    setCurrentCenter(center);
  }, [center]);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (isManualMode && onManualLocationSet) {
        onManualLocationSet(lat, lng);
      }
    },
    [isManualMode, onManualLocationSet]
  );

  const handleCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocalización no disponible");
      return;
    }

    setIsLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation: [number, number] = [position.coords.latitude, position.coords.longitude];
        setCurrentCenter(userLocation);
        setCurrentZoom(16);

        if (isManualMode && onManualLocationSet) {
          onManualLocationSet(userLocation[0], userLocation[1]);
        }

        onCenterChange?.(userLocation, 16);
        toast.success("📍 Ubicación actualizada");
        setIsLoadingLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        toast.error("No se pudo obtener tu ubicación");
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, [isManualMode, onManualLocationSet, onCenterChange]);

  const handleReset = useCallback(() => {
    setCurrentCenter(center);
    setCurrentZoom(zoom);
    onCenterChange?.(center, zoom);
  }, [center, zoom, onCenterChange]);

  const formatFriendlyDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `hace ${diffMinutes} minuto${diffMinutes !== 1 ? "s" : ""}`;
    } else if (diffHours < 24) {
      return `hace ${diffHours} hora${diffHours !== 1 ? "s" : ""}`;
    } else if (diffDays < 7) {
      return `hace ${diffDays} día${diffDays !== 1 ? "s" : ""}`;
    } else {
      return date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  return (
    <div className="relative" style={{ height }}>
      <MapContainer
        center={currentCenter}
        zoom={currentZoom}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
        key={`${mapType}-${currentCenter[0]}-${currentCenter[1]}`}
      >
        <MapController center={currentCenter} zoom={currentZoom} />
        <TileLayer url={mapConfig.url} attribution={mapConfig.attribution} />

        <MapClickHandler onMapClick={handleMapClick} isClickable={isManualMode} />

        {/* Ubicaciones guardadas */}
        {locations.map((location, index) => {
          const isLatest = index === 0;
          const isSelected = location.id === selectedLocationId;

          return (
            <Marker
              key={location.id}
              position={[location.latitude, location.longitude]}
              icon={createIcon("car", isSelected)}
              eventHandlers={{
                click: () => onLocationClick?.(location),
              }}
            >
              <Popup>
                <div style={{ minWidth: "200px" }}>
                  <h4 style={{ margin: "0 0 10px 0", color: isSelected ? "#ef4444" : "#3b82f6" }}>
                    {isLatest ? "🚗 Ubicación más reciente" : "📍 Ubicación guardada"}
                  </h4>

                  <p style={{ margin: "5px 0" }}>
                    <strong>📅 Guardada:</strong>
                    <br />
                    {formatFriendlyDate(location.timestamp)}
                  </p>

                  {location.note && (
                    <p style={{ margin: "5px 0" }}>
                      <strong>💭 Nota:</strong>
                      <br />
                      {location.note}
                    </p>
                  )}

                  {location.parkingType && (
                    <p style={{ margin: "5px 0" }}>
                      <strong>🅿️ Tipo:</strong>
                      <br />
                      {location.parkingType}
                    </p>
                  )}
                  {location.cost && (
                    <p style={{ margin: "5px 0" }}>
                      <strong>💰 Coste:</strong>
                      <br />
                      {location.cost.toFixed(2)}€
                    </p>
                  )}

                  {location.isManualPlacement && (
                    <p style={{ margin: "5px 0", fontSize: "12px", color: "#f59e0b" }}>
                      🎯 Ubicación marcada manualmente
                    </p>
                  )}

                  {location.address && (
                    <p style={{ margin: "5px 0", fontSize: "12px", color: "#666" }}>
                      <strong>📍Dirección:</strong>
                      <br />
                      {location.address}
                    </p>
                  )}

                  <p style={{ margin: "5px 0 0 0", fontSize: "11px", color: "#999", fontFamily: "monospace" }}>
                    🗺️ {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Ubicación GPS actual */}
        {gpsLocation && !isManualMode && (
          <Marker position={gpsLocation} icon={createIcon("gps")}>
            <Popup>
              <div className="text-center p-2">
                <h4 className="font-semibold text-green-600 mb-2">📍 Tu ubicación actual</h4>
                <p className="text-sm text-gray-600">
                  {gpsLocation[0].toFixed(6)}, {gpsLocation[1].toFixed(6)}
                </p>
                <p className="text-xs text-gray-500">Obtenida por GPS</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Ubicación manual marcada */}
        {manualLocation && isManualMode && (
          <Marker position={manualLocation} icon={createIcon("manual", true)}>
            <Popup>
              <div className="text-center p-2">
                <h4 className="font-semibold text-amber-600 mb-2">🎯 Ubicación marcada</h4>
                <p className="text-sm text-gray-600 mb-2">
                  {manualLocation[0].toFixed(6)}, {manualLocation[1].toFixed(6)}
                </p>
                <p className="text-xs text-gray-500">Marcada manualmente</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Controles del mapa */}
      {showControls && (
        <MapControls
          onCurrentLocation={handleCurrentLocation}
          onReset={handleReset}
          showLocationButton={showLocationButton}
          showResetButton={showResetButton}
          isLoadingLocation={isLoadingLocation}
        />
      )}

      {/* Indicador de modo manual */}
      {isManualMode && (
        <div className="absolute bottom-2 left-2 z-10 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
          <Target className="h-3 w-3" />
          {manualLocation ? "Ubicación marcada" : "Haz clic para marcar"}
        </div>
      )}
    </div>
  );
};

export default UnifiedMap;
