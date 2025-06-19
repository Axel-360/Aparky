// src/components/SavedLocations.tsx
import React, { useState } from "react";
import type { CarLocation } from "../../types/location";
import { deleteCarLocation } from "../../utils/storage";

interface SavedLocationsProps {
  locations: CarLocation[];
  onLocationDeleted: (id: string) => void;
  onLocationSelected: (location: CarLocation) => void;
}

const SavedLocations: React.FC<SavedLocationsProps> = ({ locations, onLocationDeleted, onLocationSelected }) => {
  const [sortBy, setSortBy] = useState<"date" | "note">("date");
  const [showAll, setShowAll] = useState(false);

  const handleDelete = (location: CarLocation) => {
    const locationName = location.note || `ubicación del ${new Date(location.timestamp).toLocaleDateString()}`;
    if (window.confirm(`¿Estás seguro de que quieres eliminar la ${locationName}?`)) {
      deleteCarLocation(location.id);
      onLocationDeleted(location.id);
    }
  };

  const openInMaps = (location: CarLocation) => {
    const query = location.address
      ? encodeURIComponent(location.address)
      : `${location.latitude},${location.longitude}`;
    const url = `https://www.google.com/maps/search/${query}`;
    window.open(url, "_blank");
  };

  const shareLocation = async (location: CarLocation) => {
    const text = `Mi coche está aquí: https://www.google.com/maps?q=${location.latitude},${location.longitude}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Ubicación de mi coche",
          text: text,
        });
      } catch (error) {
        console.log("Error sharing:", error);
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

  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Hace un momento";
    if (minutes < 60) return `Hace ${minutes} minuto${minutes !== 1 ? "s" : ""}`;
    if (hours < 24) return `Hace ${hours} hora${hours !== 1 ? "s" : ""}`;
    return `Hace ${days} día${days !== 1 ? "s" : ""}`;
  };

  const sortedLocations = [...locations].sort((a, b) => {
    if (sortBy === "date") {
      return b.timestamp - a.timestamp;
    }
    return (a.note || "").localeCompare(b.note || "");
  });

  const displayedLocations = showAll ? sortedLocations : sortedLocations.slice(0, 5);

  if (locations.length === 0) {
    return (
      <div className="no-locations">
        <p>📍 No hay ubicaciones guardadas todavía.</p>
        <p>Usa el botón de arriba para guardar la ubicación de tu coche.</p>
      </div>
    );
  }

  return (
    <div className="saved-locations">
      <div className="locations-header">
        <h3>📋 Ubicaciones guardadas ({locations.length})</h3>
        <div className="controls">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "date" | "note")} className="sort-select">
            <option value="date">Ordenar por fecha</option>
            <option value="note">Ordenar por nota</option>
          </select>
        </div>
      </div>

      <div className="locations-list">
        {displayedLocations.map((location, index) => (
          <div key={location.id} className={`location-card ${index === 0 ? "latest" : ""}`}>
            <div className="location-content">
              <div className="location-info">
                {index === 0 && sortBy === "date" && <span className="latest-badge">ÚLTIMA UBICACIÓN</span>}

                <p className="location-date">
                  🚗 {new Date(location.timestamp).toLocaleString()}
                  <small> • {formatRelativeTime(location.timestamp)}</small>
                </p>

                {location.note && <p className="location-note">💭 {location.note}</p>}

                {location.address && <p className="location-address">📍 {location.address}</p>}

                <p className="location-coords">
                  Coordenadas: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </p>
              </div>

              <div className="location-actions">
                <button
                  onClick={() => onLocationSelected(location)}
                  className="action-btn view-btn"
                  title="Ver en el mapa"
                >
                  👁️
                </button>

                <button
                  onClick={() => openInMaps(location)}
                  className="action-btn maps-btn"
                  title="Abrir en Google Maps"
                >
                  🗺️
                </button>

                <button
                  onClick={() => shareLocation(location)}
                  className="action-btn share-btn"
                  title="Compartir ubicación"
                >
                  📤
                </button>

                <button onClick={() => handleDelete(location)} className="action-btn delete-btn" title="Eliminar">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {locations.length > 5 && (
        <button onClick={() => setShowAll(!showAll)} className="show-more-btn">
          {showAll ? "Mostrar menos" : `Mostrar todas (${locations.length})`}
        </button>
      )}
    </div>
  );
};

export default SavedLocations;
