// src/components/LocationSaver.tsx
import React, { useState } from "react";
import { useGeolocation } from "../../hooks/useGeolocation";
import { saveCarLocation } from "../../utils/storage";
import type { CarLocation } from "../../types/location";

interface LocationSaverProps {
  onLocationSaved: (location: CarLocation) => void;
}

// Cache simple para direcciones
const addressCache = new Map<string, string>();

const LocationSaver: React.FC<LocationSaverProps> = ({ onLocationSaved }) => {
  const { latitude, longitude, error, loading, accuracy, getCurrentPosition } = useGeolocation();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const isValidLocation = (lat: number, lng: number): boolean => {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  };

  const getAddressFromCoordinates = async (lat: number, lng: number): Promise<string | undefined> => {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;

    if (addressCache.has(key)) {
      return addressCache.get(key);
    }

    try {
      // Añadir delay para respetar rate limits de Nominatim
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "User-Agent": "CarLocationApp/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Error en la respuesta del servidor");
      }

      const data = await response.json();
      const address = data.display_name;

      if (address) {
        addressCache.set(key, address);
      }

      return address;
    } catch (error) {
      console.error("Error getting address:", error);
      return undefined;
    }
  };

  const handleSaveLocation = async () => {
    if (!latitude || !longitude) {
      getCurrentPosition();
      return;
    }

    if (!isValidLocation(latitude, longitude)) {
      alert("Las coordenadas obtenidas no son válidas");
      return;
    }

    setSaving(true);

    try {
      const address = await getAddressFromCoordinates(latitude, longitude);

      const newLocation: CarLocation = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        latitude,
        longitude,
        address,
        timestamp: Date.now(),
        note: note.trim() || undefined,
      };

      saveCarLocation(newLocation);
      onLocationSaved(newLocation);
      setNote("");

      alert("¡Ubicación guardada correctamente!");
    } catch (error) {
      console.error("Error saving location:", error);
      alert("Error al guardar la ubicación. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="location-saver">
      <h3>📍 Guardar ubicación del coche</h3>

      {error && (
        <div className="error-message">
          <strong>⚠️ Error:</strong> {error.message}
          {error.code === 1 && (
            <div style={{ marginTop: "10px", fontSize: "14px" }}>
              <strong>Solución:</strong> Ve a la configuración de tu navegador y permite el acceso a la ubicación para
              este sitio.
            </div>
          )}
        </div>
      )}

      {latitude && longitude && (
        <div className="location-info">
          <p>
            <strong>📍 Ubicación actual:</strong>
          </p>
          <p>Latitud: {latitude.toFixed(6)}</p>
          <p>Longitud: {longitude.toFixed(6)}</p>
          {accuracy && <p>Precisión: ±{Math.round(accuracy)} metros</p>}
        </div>
      )}

      <div className="note-input">
        <label htmlFor="note">Nota (opcional):</label>
        <input
          id="note"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ej: Parking del centro comercial, nivel 2, plaza A-15"
          maxLength={100}
        />
        <small>{note.length}/100 caracteres</small>
      </div>

      <button
        onClick={handleSaveLocation}
        disabled={loading || saving}
        className={`save-button ${loading || saving ? "disabled" : ""}`}
      >
        {loading
          ? "⏳ Obteniendo ubicación..."
          : saving
          ? "💾 Guardando..."
          : latitude && longitude
          ? "💾 Guardar ubicación actual"
          : "📍 Obtener mi ubicación"}
      </button>
    </div>
  );
};

export default LocationSaver;
