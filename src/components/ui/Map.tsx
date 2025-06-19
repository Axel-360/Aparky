// src/components/Map.tsx
import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
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

interface MapProps {
  locations: CarLocation[];
  center?: [number, number];
  zoom?: number;
}

const Map: React.FC<MapProps> = ({
  locations,
  center = [40.4168, -3.7038], // Madrid por defecto
  zoom = 13,
}) => {
  return (
    <div style={{ height: "400px", width: "100%" }}>
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {locations.map((location) => (
          <Marker key={location.id} position={[location.latitude, location.longitude]}>
            <Popup>
              <div>
                <h4>🚗 Mi coche</h4>
                <p>
                  <strong>Fecha:</strong> {new Date(location.timestamp).toLocaleString()}
                </p>
                {location.note && (
                  <p>
                    <strong>Nota:</strong> {location.note}
                  </p>
                )}
                {location.address && (
                  <p>
                    <strong>Dirección:</strong> {location.address}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default Map;
