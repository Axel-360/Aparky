// src/components/ui/SavedLocations.tsx
import React, { useState, useMemo, useEffect } from "react";
import type { CarLocation, DateFilter } from "../../types/location";
import { deleteCarLocation, getCarLocations } from "../../utils/storage";
import { filterLocationsByDate } from "../../utils/stats";
import SearchFilter from "./SearchFilter";

interface SavedLocationsProps {
  locations: CarLocation[];
  onLocationDeleted: (id: string) => void;
  onLocationSelected: (location: CarLocation) => void;
  onNavigateToLocation?: (location: CarLocation) => void;
  sortBy: "date" | "note";
  showAll: boolean;
  onSortChange: (sortBy: "date" | "note") => void;
  onShowAllChange: (showAll: boolean) => void;
}

const SavedLocations: React.FC<SavedLocationsProps> = ({
  locations: initialLocations,
  onLocationDeleted,
  onLocationSelected,
  onNavigateToLocation,
  sortBy,
  showAll,
  onSortChange,
  onShowAllChange,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [timerStates, setTimerStates] = useState<{ [locationId: string]: string }>({});
  // Estado local para manejar las ubicaciones y forzar re-renders
  const [locations, setLocations] = useState<CarLocation[]>(initialLocations);

  // Sincronizar con las props cuando cambien
  useEffect(() => {
    setLocations(initialLocations);
  }, [initialLocations]);

  // Actualizar timers cada minuto
  useEffect(() => {
    const updateTimers = () => {
      const newTimerStates: { [locationId: string]: string } = {};

      locations.forEach((location) => {
        if (location.expiryTime) {
          const timeLeft = getTimeLeft(location.expiryTime);
          newTimerStates[location.id] = timeLeft;
        }
      });

      setTimerStates(newTimerStates);
    };

    updateTimers();
    const interval = setInterval(updateTimers, 60000); // Actualizar cada minuto

    return () => clearInterval(interval);
  }, [locations]);

  const handleDelete = (location: CarLocation) => {
    const locationName = location.note || `ubicación del ${new Date(location.timestamp).toLocaleDateString()}`;
    if (window.confirm(`¿Estás seguro de que quieres eliminar la ${locationName}?`)) {
      deleteCarLocation(location.id);
      onLocationDeleted(location.id);
    }
  };

  const handleExtendTimer = async (location: CarLocation, additionalMinutes: number) => {
    if (!location.expiryTime) return;

    const newExpiryTime = location.expiryTime + additionalMinutes * 60 * 1000;

    try {
      // Actualizar en localStorage
      const allLocations = getCarLocations();
      const updatedLocations = allLocations.map((loc: CarLocation) =>
        loc.id === location.id ? { ...loc, expiryTime: newExpiryTime } : loc
      );
      localStorage.setItem("car-locations", JSON.stringify(updatedLocations));

      // Actualizar estado local inmediatamente
      setLocations((prev) => prev.map((loc) => (loc.id === location.id ? { ...loc, expiryTime: newExpiryTime } : loc)));

      // Actualizar el estado de timers inmediatamente
      setTimerStates((prev) => ({
        ...prev,
        [location.id]: getTimeLeft(newExpiryTime),
      }));

      // Mostrar notificación de éxito
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("⏰ Tiempo Extendido", {
          body: `Se añadieron ${additionalMinutes} minutos más`,
          icon: "⏰",
        });
      }
    } catch (error) {
      console.error("Error extending timer:", error);
      alert("Error al extender el tiempo. Inténtalo de nuevo.");
    }
  };

  const handleCancelTimer = async (location: CarLocation) => {
    if (window.confirm("¿Estás seguro de que quieres cancelar el temporizador de este parking?")) {
      try {
        // Actualizar en localStorage
        const allLocations = getCarLocations();
        const updatedLocations = allLocations.map((loc: CarLocation) =>
          loc.id === location.id
            ? {
                ...loc,
                expiryTime: undefined,
                reminderMinutes: undefined,
              }
            : loc
        );
        localStorage.setItem("car-locations", JSON.stringify(updatedLocations));

        // Actualizar estado local inmediatamente
        setLocations((prev) =>
          prev.map((loc) =>
            loc.id === location.id ? { ...loc, expiryTime: undefined, reminderMinutes: undefined } : loc
          )
        );

        // Actualizar el estado de timers
        setTimerStates((prev) => {
          const newState = { ...prev };
          delete newState[location.id];
          return newState;
        });

        // Mostrar notificación de éxito
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("✅ Temporizador Cancelado", {
            body: "El temporizador de parking ha sido cancelado",
            icon: "✅",
          });
        }
      } catch (error) {
        console.error("Error canceling timer:", error);
        alert("Error al cancelar el temporizador. Inténtalo de nuevo.");
      }
    }
  };

  const getTimeLeft = (expiryTime: number): string => {
    const now = Date.now();
    const remaining = expiryTime - now;

    if (remaining <= 0) return "Expirado";

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getTimerStatus = (
    expiryTime?: number,
    reminderMinutes?: number
  ): "active" | "warning" | "expired" | "inactive" => {
    if (!expiryTime) return "inactive";

    const now = Date.now();
    const remaining = expiryTime - now;

    if (remaining <= 0) return "expired";
    if (reminderMinutes && remaining <= reminderMinutes * 60 * 1000) return "warning";
    return "active";
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

  const getParkingTypeIcon = (type?: string): string => {
    switch (type) {
      case "garage":
        return "🏢";
      case "lot":
        return "🅿️";
      case "other":
        return "📍";
      default:
        return "🛣️";
    }
  };

  const getParkingTypeName = (type?: string): string => {
    switch (type) {
      case "garage":
        return "Garaje";
      case "lot":
        return "Aparcamiento";
      case "other":
        return "Otro";
      default:
        return "Calle";
    }
  };

  // Filtrar y ordenar ubicaciones
  const filteredAndSortedLocations = useMemo(() => {
    // Aplicar filtros de fecha
    let filtered = filterLocationsByDate(locations, dateFilter);

    // Aplicar búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((location) => {
        const note = location.note?.toLowerCase() || "";
        const address = location.address?.toLowerCase() || "";
        const coords = `${location.latitude},${location.longitude}`;
        const date = new Date(location.timestamp).toLocaleDateString().toLowerCase();

        return note.includes(query) || address.includes(query) || coords.includes(query) || date.includes(query);
      });
    }

    // Ordenar
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "date") {
        return b.timestamp - a.timestamp;
      }
      return (a.note || "").localeCompare(b.note || "");
    });

    return sorted;
  }, [locations, searchQuery, dateFilter, sortBy]);

  const displayedLocations = showAll ? filteredAndSortedLocations : filteredAndSortedLocations.slice(0, 5);

  if (locations.length === 0) {
    return (
      <div className="saved-locations">
        <div className="no-locations">
          <p>📍 No hay ubicaciones guardadas todavía.</p>
          <p>Usa el botón de arriba para guardar la ubicación de tu coche.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="saved-locations">
      <div className="locations-header">
        <h3>📋 Ubicaciones guardadas ({filteredAndSortedLocations.length})</h3>
        <div className="controls">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as "date" | "note")}
            className="sort-select"
          >
            <option value="date">Ordenar por fecha</option>
            <option value="note">Ordenar por nota</option>
          </select>
        </div>
      </div>

      <SearchFilter
        onSearchChange={setSearchQuery}
        onDateFilterChange={setDateFilter}
        searchValue={searchQuery}
        dateFilter={dateFilter}
      />

      {filteredAndSortedLocations.length === 0 ? (
        <div className="no-locations">
          <p>🔍 No se encontraron ubicaciones que coincidan con tu búsqueda.</p>
          <p>Intenta con otros términos o ajusta los filtros.</p>
        </div>
      ) : (
        <>
          <div className="locations-list">
            {displayedLocations.map((location, index) => {
              const isLatest = index === 0 && sortBy === "date" && dateFilter === "all" && !searchQuery;
              const timerStatus = getTimerStatus(location.expiryTime, location.reminderMinutes);
              const timeLeft =
                timerStates[location.id] || (location.expiryTime ? getTimeLeft(location.expiryTime) : "");

              return (
                <div key={location.id} className={`location-card ${isLatest ? "latest" : ""}`}>
                  <div className="location-content">
                    <div className="location-info">
                      <div className="location-header">
                        <div>
                          {isLatest && <span className="latest-badge">ÚLTIMA UBICACIÓN</span>}
                          <p className="location-date">
                            🚗 {new Date(location.timestamp).toLocaleString()}
                            <small> • {formatRelativeTime(location.timestamp)}</small>
                          </p>
                        </div>

                        <div className="location-badges">
                          {location.photos && location.photos.length > 0 && (
                            <span className="badge photo-badge">📸 {location.photos.length}</span>
                          )}
                          {location.expiryTime &&
                            getTimerStatus(location.expiryTime, location.reminderMinutes) !== "inactive" && (
                              <span className={`badge timer-badge ${timerStatus}`}>
                                {timerStatus === "expired" ? "🚨 Expirado" : `⏰ ${timeLeft}`}
                              </span>
                            )}
                          {location.cost && location.cost > 0 && (
                            <span className="badge cost-badge">💰 {location.cost.toFixed(2)}€</span>
                          )}
                        </div>
                      </div>

                      {location.note && <p className="location-note">💭 {location.note}</p>}

                      {location.address && <p className="location-address">📍 {location.address}</p>}

                      <div className="location-meta">
                        <span className="parking-type">
                          {getParkingTypeIcon(location.parkingType)} {getParkingTypeName(location.parkingType)}
                        </span>

                        {location.expiryTime &&
                          getTimerStatus(location.expiryTime, location.reminderMinutes) !== "inactive" && (
                            <span className={`expiry-info ${timerStatus}`}>
                              {timerStatus === "expired"
                                ? "🚨 Expirado"
                                : `⏰ Expira: ${new Date(location.expiryTime).toLocaleTimeString()}`}
                            </span>
                          )}
                      </div>

                      {/* GESTIÓN DE TIMER MEJORADA */}
                      {location.expiryTime &&
                        getTimerStatus(location.expiryTime, location.reminderMinutes) !== "inactive" && (
                          <div className="timer-management">
                            <div className="timer-info">
                              <span className={`timer-status ${timerStatus}`}>
                                {timerStatus === "expired"
                                  ? "🚨 Tiempo expirado"
                                  : timerStatus === "warning"
                                  ? `⚠️ Quedan ${timeLeft}`
                                  : `✅ Quedan ${timeLeft}`}
                              </span>
                              {location.reminderMinutes && (
                                <span className="reminder-info">
                                  📢 Recordatorio: {location.reminderMinutes}min antes
                                </span>
                              )}
                            </div>

                            {/* SOLO MOSTRAR BOTONES SI NO HA EXPIRADO */}
                            {timerStatus !== "expired" && (
                              <div className="timer-actions">
                                <button
                                  className="extend-btn"
                                  onClick={() => handleExtendTimer(location, 30)}
                                  title="Extender 30 minutos"
                                >
                                  ⏰ +30min
                                </button>
                                <button
                                  className="extend-btn"
                                  onClick={() => handleExtendTimer(location, 60)}
                                  title="Extender 1 hora"
                                >
                                  ⏰ +1h
                                </button>
                                <button
                                  className="cancel-timer-btn"
                                  onClick={() => handleCancelTimer(location)}
                                  title="Cancelar temporizador de parking"
                                >
                                  🚫 Cancelar tiempo
                                </button>
                              </div>
                            )}

                            {/* MENSAJE CUANDO HA EXPIRADO */}
                            {timerStatus === "expired" && (
                              <div className="timer-expired-message">
                                <p>⚠️ El tiempo de parking ha expirado. Considera mover tu vehículo.</p>
                              </div>
                            )}
                          </div>
                        )}

                      {/* Fotos */}
                      {location.photos && location.photos.length > 0 && (
                        <div className="location-photos">
                          <div className="photos-grid">
                            {location.photos.slice(0, 3).map((photo, photoIndex) => (
                              <img
                                key={photoIndex}
                                src={photo}
                                alt={`Foto ${photoIndex + 1}`}
                                className="location-photo"
                                onClick={() => {
                                  // Abrir foto en modal o nueva ventana
                                  const newWindow = window.open();
                                  if (newWindow) {
                                    newWindow.document.write(
                                      `<img src="${photo}" style="max-width: 100%; max-height: 100vh;" />`
                                    );
                                  }
                                }}
                              />
                            ))}
                            {location.photos.length > 3 && (
                              <div className="photos-more">+{location.photos.length - 3} más</div>
                            )}
                          </div>
                        </div>
                      )}

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

                      {onNavigateToLocation && (
                        <button
                          onClick={() => onNavigateToLocation(location)}
                          className="action-btn navigate-btn"
                          title="Navegar hasta aquí"
                        >
                          🧭
                        </button>
                      )}

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
              );
            })}
          </div>

          {filteredAndSortedLocations.length > 5 && (
            <button onClick={() => onShowAllChange(!showAll)} className="show-more-btn">
              {showAll ? "Mostrar menos" : `Mostrar todas (${filteredAndSortedLocations.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default SavedLocations;
