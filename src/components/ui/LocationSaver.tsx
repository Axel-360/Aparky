// src/components/ui/LocationSaver.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useGeolocation } from "../../hooks/useGeolocation";
import { saveCarLocation } from "../../utils/storage";
import { notificationManager } from "../../utils/notificationManager";
import type { CarLocation } from "../../types/location";
import PhotoCapture from "./PhotoCapture";
import ParkingTimer from "./ParkingTimer";

interface LocationSaverProps {
  onLocationSaved: (location: CarLocation) => void;
  autoSave: boolean;
  notifications: boolean;
  defaultReminderMinutes?: number;
  maxPhotos?: number;
  photoQuality?: "low" | "medium" | "high";
}

// Cache simple para direcciones
const addressCache = new Map<string, string>();

const LocationSaver: React.FC<LocationSaverProps> = ({
  onLocationSaved,
  autoSave,
  notifications,
  defaultReminderMinutes = 15,
  maxPhotos = 3,
  photoQuality = "medium",
}) => {
  const { latitude, longitude, error, loading, accuracy, isWatching, getCurrentPosition, startWatching, stopWatching } =
    useGeolocation();

  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<number | null>(null);

  // Nuevos estados para funcionalidades avanzadas
  const [photos, setPhotos] = useState<string[]>([]);
  const [parkingType, setParkingType] = useState<"street" | "garage" | "lot" | "other">("street");
  const [cost, setCost] = useState<string>("");
  const [expiryTime, setExpiryTime] = useState<number | undefined>();
  const [reminderMinutes, setReminderMinutes] = useState<number | undefined>(defaultReminderMinutes);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);

  // Auto-guardar cuando se obtiene ubicación (si está habilitado)
  useEffect(() => {
    if (autoSave && latitude && longitude && !saving) {
      const now = Date.now();
      // Solo auto-guardar si han pasado al menos 5 minutos desde el último auto-guardado
      if (!lastAutoSave || now - lastAutoSave > 300000) {
        handleSaveLocation(true);
        setLastAutoSave(now);
      }
    }
  }, [latitude, longitude, autoSave, saving, lastAutoSave]);

  const isValidLocation = (lat: number, lng: number): boolean => {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  };

  const getAddressFromCoordinates = async (lat: number, lng: number): Promise<string | undefined> => {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;

    if (addressCache.has(key)) {
      return addressCache.get(key);
    }

    try {
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

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    if (!notifications || !("Notification" in window)) {
      alert(message);
      return;
    }

    if (Notification.permission === "granted") {
      new Notification("Ubicación del Coche", {
        body: message,
        icon: type === "success" ? "🚗" : "⚠️",
      });
    } else {
      alert(message);
    }
  };

  const requestNotificationPermission = () => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  // ACTUALIZADO: Función mejorada para programar recordatorios usando notificationManager
  const scheduleReminder = useCallback((locationId: string, expiryTime: number, reminderMinutes: number) => {
    const reminderTime = expiryTime - reminderMinutes * 60 * 1000;
    const now = Date.now();

    if (reminderTime > now) {
      const timeUntilReminder = reminderTime - now;

      // Usar notificationManager para programar recordatorio
      notificationManager.scheduleNotification(
        `${locationId}-reminder`,
        timeUntilReminder,
        "⏰ Recordatorio de Parking",
        `Tu parking expira en ${reminderMinutes} minutos`
      );

      console.log(
        `Recordatorio programado para ubicación: ${locationId} en ${Math.round(timeUntilReminder / 1000 / 60)} minutos`
      );
    }

    // También programar notificación de expiración
    const timeUntilExpiry = expiryTime - now;
    if (timeUntilExpiry > 0) {
      notificationManager.scheduleNotification(
        `${locationId}-expiry`,
        timeUntilExpiry,
        "🚨 Parking Expirado",
        "Tu tiempo de parking ha expirado"
      );
    }
  }, []);

  // ACTUALIZADO: Nueva función para cancelar recordatorios usando notificationManager
  const cancelReminder = useCallback((locationId: string) => {
    // Cancelar tanto el recordatorio como la notificación de expiración
    notificationManager.cancelNotification(`${locationId}-reminder`);
    notificationManager.cancelNotification(`${locationId}-expiry`);
    console.log(`Recordatorios cancelados para ubicación: ${locationId}`);
  }, []);

  // Nueva función para manejar cancelación desde ParkingTimer
  const handleTimerCancelled = useCallback(() => {
    // Cancelar recordatorio de la ubicación actual si existe
    if (currentLocationId) {
      cancelReminder(currentLocationId);
    }

    console.log("Temporizador cancelado desde la interfaz");
  }, [currentLocationId, cancelReminder]);

  // Función para extender temporizador
  const handleTimerExtended = useCallback(
    (additionalMinutes: number) => {
      if (!expiryTime || !currentLocationId) return;

      const newExpiryTime = expiryTime + additionalMinutes * 60 * 1000;
      setExpiryTime(newExpiryTime);

      // Reprogramar recordatorio si existe
      if (reminderMinutes) {
        // Cancelar notificaciones anteriores
        cancelReminder(currentLocationId);
        // Programar nuevas notificaciones con el tiempo extendido
        scheduleReminder(currentLocationId, newExpiryTime, reminderMinutes);
      }

      console.log(`Temporizador extendido ${additionalMinutes} minutos para ubicación: ${currentLocationId}`);
    },
    [expiryTime, currentLocationId, reminderMinutes, scheduleReminder, cancelReminder]
  );

  const handleSaveLocation = async (isAutoSave: boolean = false) => {
    if (!latitude || !longitude) {
      getCurrentPosition();
      return;
    }

    if (!isValidLocation(latitude, longitude)) {
      const message = "Las coordenadas obtenidas no son válidas";
      showNotification(message, "error");
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
        photos: photos.length > 0 ? photos : undefined,
        parkingType,
        expiryTime,
        cost: cost ? parseFloat(cost) : undefined,
        reminderMinutes: expiryTime ? reminderMinutes : undefined,
      };

      saveCarLocation(newLocation);
      onLocationSaved(newLocation);

      // Guardar el ID de la ubicación actual para poder cancelar recordatorios
      setCurrentLocationId(newLocation.id);

      if (!isAutoSave) {
        // Limpiar formulario después de guardar manualmente
        setNote("");
        setPhotos([]);
        setCost("");
        setExpiryTime(undefined);
        setShowAdvanced(false);
        setCurrentLocationId(null);
      }

      const message = isAutoSave ? "¡Ubicación guardada automáticamente!" : "¡Ubicación guardada correctamente!";
      showNotification(message);

      // ACTUALIZADO: Configurar recordatorio usando notificationManager si hay temporizador
      if (expiryTime && reminderMinutes) {
        scheduleReminder(newLocation.id, expiryTime, reminderMinutes);
      }
    } catch (error) {
      console.error("Error saving location:", error);
      const message = "Error al guardar la ubicación. Inténtalo de nuevo.";
      showNotification(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTimerExpired = useCallback(() => {
    if (Notification.permission === "granted") {
      new Notification("🚨 Parking Expirado", {
        body: "Tu tiempo de parking ha expirado",
        icon: "🚨",
        requireInteraction: true,
      });
    }
  }, []);

  const handleReminderTriggered = useCallback(() => {
    if (Notification.permission === "granted") {
      new Notification("⚠️ Parking por Expirar", {
        body: `Tu parking expira en ${reminderMinutes} minutos`,
        icon: "⚠️",
        requireInteraction: true,
      });
    }
  }, [reminderMinutes]);

  useEffect(() => {
    if (notifications) {
      requestNotificationPermission();
    }
  }, [notifications]);

  // ACTUALIZADO: Limpiar notificaciones usando notificationManager al desmontar el componente
  useEffect(() => {
    return () => {
      // El notificationManager maneja la limpieza automáticamente
      console.log("LocationSaver desmontado - notificationManager manejará la limpieza");
    };
  }, []);

  const parkingTypeOptions = [
    { value: "street", label: "🛣️ Calle", description: "Aparcamiento en vía pública" },
    { value: "garage", label: "🏢 Garaje", description: "Parking subterráneo o edificio" },
    { value: "lot", label: "🅿️ Aparcamiento", description: "Parking al aire libre" },
    { value: "other", label: "📍 Otro", description: "Otro tipo de ubicación" },
  ];

  return (
    <div className="location-saver">
      <div className="saver-header">
        <h3>📍 Guardar ubicación</h3>
        <div className="location-controls">
          <button
            onClick={isWatching ? stopWatching : startWatching}
            className={`watch-btn ${isWatching ? "watching" : ""}`}
            title={isWatching ? "Detener seguimiento" : "Seguir ubicación en tiempo real"}
          >
            {isWatching ? "⏹️ Detener" : "📡 Seguir"}
          </button>
          {autoSave && (
            <span className="auto-save-indicator" title="Guardado automático activado">
              🤖 Auto
            </span>
          )}
          <button className="advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)} title="Opciones avanzadas">
            {showAdvanced ? "📁 Básico" : "⚙️ Avanzado"}
          </button>
        </div>
      </div>

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
          <div className="location-status">
            <p>
              <strong>📍 Ubicación actual:</strong>
              {isWatching && <span className="watching-indicator">🔴 En vivo</span>}
            </p>
            <div className="coordinates">
              <p>Latitud: {latitude.toFixed(6)}</p>
              <p>Longitud: {longitude.toFixed(6)}</p>
              {accuracy && <p>Precisión: ±{Math.round(accuracy)} metros</p>}
            </div>
          </div>
        </div>
      )}

      <div className="location-form">
        {/* Tipo de parking */}
        <div className="parking-type-selector">
          <label>Tipo de parking:</label>
          <div className="parking-types">
            {parkingTypeOptions.map((option) => (
              <button
                key={option.value}
                className={`parking-type-btn ${parkingType === option.value ? "active" : ""}`}
                onClick={() => setParkingType(option.value as any)}
                title={option.description}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Nota */}
        <div className="note-input">
          <label htmlFor="note">Nota descriptiva:</label>
          <input
            id="note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: Parking nivel 2, plaza A-15, cerca del ascensor"
            maxLength={100}
            disabled={saving}
          />
          <small>{note.length}/100 caracteres</small>
        </div>

        {/* Costo */}
        <div className="cost-input">
          <label htmlFor="cost">Costo (opcional):</label>
          <div className="cost-input-container">
            <input
              id="cost"
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              disabled={saving}
            />
            <span className="currency">€</span>
          </div>
        </div>

        {showAdvanced && (
          <div className="advanced-options">
            {/* Fotos */}
            <PhotoCapture photos={photos} onPhotosChange={setPhotos} maxPhotos={maxPhotos} quality={photoQuality} />

            {/* Temporizador */}
            <ParkingTimer
              expiryTime={expiryTime}
              reminderMinutes={reminderMinutes}
              onExpiryTimeChange={setExpiryTime}
              onReminderChange={setReminderMinutes}
              onTimerExpired={handleTimerExpired}
              onReminderTriggered={handleReminderTriggered}
              onTimerCancelled={handleTimerCancelled}
              onTimerExtended={handleTimerExtended}
            />
          </div>
        )}
      </div>

      <div className="save-actions">
        <button
          onClick={() => handleSaveLocation(false)}
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

        {lastAutoSave && (
          <small className="auto-save-info">
            Último guardado automático: {new Date(lastAutoSave).toLocaleTimeString()}
          </small>
        )}

        {expiryTime && (
          <div className="timer-preview">
            <span className="timer-icon">⏰</span>
            <span>Expira: {new Date(expiryTime).toLocaleString()}</span>
            {reminderMinutes && <span> • Recordatorio: {reminderMinutes}min antes</span>}
            {currentLocationId && <span className="timer-id"> • ID: {currentLocationId.slice(-6)}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationSaver;
