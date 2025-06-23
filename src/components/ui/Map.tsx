// src/components/ui/Map.tsx
import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import type { CarLocation } from "../../types/location";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix para los iconos de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Crear iconos personalizados
const createCustomIcon = (color: string, isLatest: boolean = false) => {
  return L.divIcon({
    html: `<div style="
      background-color: ${color};
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
    ">${isLatest ? "🚗" : "📍"}</div>`,
    className: "custom-marker",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
};

// Configuraciones de mapas
const getMapConfig = (mapType: string) => {
  switch (mapType) {
    case "satellite":
      return {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution:
          "&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
      };
    case "terrain":
      return {
        url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        attribution: "Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)",
      };
    default: // osm
      return {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      };
  }
};

interface MapProps {
  locations: CarLocation[];
  center: [number, number];
  zoom: number;
  mapType?: string;
  selectedLocationId?: string;
}

// Componente para actualizar el centro del mapa
const MapUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);

  return null;
};

const Map: React.FC<MapProps> = ({
  locations,
  center = [40.4168, -3.7038],
  zoom = 13,
  mapType = "osm",
  selectedLocationId,
}) => {
  const mapConfig = getMapConfig(mapType);

  return (
    <div style={{ height: "400px", width: "100%", borderRadius: "12px", overflow: "hidden" }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        key={`${center[0]}-${center[1]}-${mapType}`}
      >
        <MapUpdater center={center} zoom={zoom} />
        <TileLayer url={mapConfig.url} attribution={mapConfig.attribution} />
        {locations.map((location, index) => {
          const isLatest = index === 0;
          const isSelected = location.id === selectedLocationId;
          const iconColor = isSelected ? "#ff6b6b" : isLatest ? "#28a745" : "#007bff";

          return (
            <Marker
              key={location.id}
              position={[location.latitude, location.longitude]}
              icon={createCustomIcon(iconColor, isLatest)}
            >
              <Popup>
                <div style={{ minWidth: "200px" }}>
                  <h4 style={{ margin: "0 0 10px 0", color: iconColor }}>
                    {isLatest ? "🚗 Última ubicación" : "📍 Ubicación guardada"}
                  </h4>
                  <p style={{ margin: "5px 0" }}>
                    <strong>📅 Fecha:</strong>
                    <br />
                    {new Date(location.timestamp).toLocaleString()}
                  </p>
                  {location.note && (
                    <p style={{ margin: "5px 0" }}>
                      <strong>💭 Nota:</strong>
                      <br />
                      {location.note}
                    </p>
                  )}
                  {location.address && (
                    <p style={{ margin: "5px 0", fontSize: "12px", color: "#666" }}>
                      <strong>📍 Dirección:</strong>
                      <br />
                      {location.address}
                    </p>
                  )}
                  <p style={{ margin: "5px 0 0 0", fontSize: "11px", color: "#999", fontFamily: "monospace" }}>
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default Map;
