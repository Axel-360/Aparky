// src/components/ui/TimerDashboard.tsx
import React, { useState, useEffect } from "react";
import type { CarLocation } from "../../types/location";
import { updateCarLocation } from "../../utils/storage";
import { notificationManager } from "../../utils/notificationManager";

interface TimerWidget {
  id: string;
  locationId: string;
  locationNote?: string;
  expiryTime: number;
  reminderMinutes?: number;
  status: "active" | "warning" | "expired" | "extended";
  timeLeft: string;
  extensionCount: number;
  address?: string;
  parkingType?: string;
}

interface ParkingStats {
  totalActive: number;
  totalExpired: number;
  totalExtensions: number;
  nextExpiration?: string;
}

interface TimerDashboardProps {
  locations: CarLocation[];
  onLocationUpdated?: (locationId: string, updates: Partial<CarLocation>) => void;
}

const TimerDashboard: React.FC<TimerDashboardProps> = ({ locations, onLocationUpdated }) => {
  const [activeTimers, setActiveTimers] = useState<TimerWidget[]>([]);
  const [stats, setStats] = useState<ParkingStats>({
    totalActive: 0,
    totalExpired: 0,
    totalExtensions: 0,
  });

  useEffect(() => {
    updateTimers();
    const interval = setInterval(updateTimers, 30000); // Actualizar cada 30 segundos
    return () => clearInterval(interval);
  }, [locations]);

  const updateTimers = () => {
    const locationsWithTimers = locations.filter((loc) => loc.expiryTime);

    const timers = locationsWithTimers.map((location) => createTimerWidget(location));

    // CORREGIDO: Ordenar por urgencia (menos tiempo restante primero)
    const sortedTimers = timers.sort((a, b) => {
      // Los expirados van al final
      if (a.status === "expired" && b.status !== "expired") return 1;
      if (b.status === "expired" && a.status !== "expired") return -1;

      // Entre activos, el que menos tiempo tenga va primero
      return a.expiryTime - b.expiryTime;
    });

    const activeTimers = sortedTimers.filter((timer) => timer.status !== "expired");
    const expiredCount = sortedTimers.filter((timer) => timer.status === "expired").length;
    const totalExtensions = locationsWithTimers.reduce((sum, loc) => sum + ((loc as any).extensionCount || 0), 0);

    // Encontrar próxima expiración
    const nextExpiration =
      activeTimers.length > 0 ? Math.min(...activeTimers.map((timer) => timer.expiryTime)) : undefined;

    setActiveTimers(sortedTimers);
    setStats({
      totalActive: activeTimers.length,
      totalExpired: expiredCount,
      totalExtensions,
      nextExpiration: nextExpiration ? new Date(nextExpiration).toLocaleTimeString() : undefined,
    });
  };

  const createTimerWidget = (location: CarLocation): TimerWidget => {
    const now = Date.now();
    const timeLeft = (location.expiryTime || 0) - now;
    const reminderTime = location.reminderMinutes ? location.reminderMinutes * 60 * 1000 : 0;

    let status: TimerWidget["status"] = "active";
    if (timeLeft <= 0) {
      status = "expired";
    } else if (reminderTime > 0 && timeLeft <= reminderTime) {
      status = "warning";
    }

    return {
      id: location.id,
      locationId: location.id,
      locationNote: location.note,
      expiryTime: location.expiryTime || 0,
      reminderMinutes: location.reminderMinutes,
      status,
      timeLeft: formatTimeLeft(timeLeft),
      extensionCount: (location as any).extensionCount || 0,
      address: location.address,
      parkingType: location.parkingType,
    };
  };

  const formatTimeLeft = (milliseconds: number): string => {
    if (milliseconds <= 0) return "Expirado";

    const minutes = Math.floor(milliseconds / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  // ACTUALIZADO: Función para reprogramar notificaciones cuando se extiende un timer
  const rescheduleNotifications = (timerId: string, newExpiryTime: number, reminderMinutes?: number) => {
    // Cancelar notificaciones existentes
    notificationManager.cancelNotification(`${timerId}-reminder`);
    notificationManager.cancelNotification(`${timerId}-expiry`);

    const now = Date.now();

    // Programar nueva notificación de recordatorio si aplica
    if (reminderMinutes) {
      const reminderTime = newExpiryTime - reminderMinutes * 60 * 1000;
      if (reminderTime > now) {
        notificationManager.scheduleNotification(
          `${timerId}-reminder`,
          reminderTime - now,
          "⏰ Recordatorio de Parking",
          `Tu parking expira en ${reminderMinutes} minutos`
        );
      }
    }

    // Programar nueva notificación de expiración
    const timeUntilExpiry = newExpiryTime - now;
    if (timeUntilExpiry > 0) {
      notificationManager.scheduleNotification(
        `${timerId}-expiry`,
        timeUntilExpiry,
        "🚨 Parking Expirado",
        "Tu tiempo de parking ha expirado"
      );
    }
  };

  const extendTimer = async (timerId: string, minutes: number) => {
    try {
      const location = locations.find((loc) => loc.id === timerId);
      if (!location || !location.expiryTime) return;

      const newExpiryTime = location.expiryTime + minutes * 60 * 1000;
      const newExtensionCount = ((location as any).extensionCount || 0) + 1;

      const updates = {
        expiryTime: newExpiryTime,
        extensionCount: newExtensionCount,
      };

      // Actualizar en storage
      updateCarLocation(timerId, updates);

      // Notificar al componente padre si existe
      if (onLocationUpdated) {
        onLocationUpdated(timerId, updates);
      }

      // NUEVO: Reprogramar notificaciones con el nuevo tiempo
      rescheduleNotifications(timerId, newExpiryTime, location.reminderMinutes);

      // Actualizar timers inmediatamente
      updateTimers();

      // Mostrar notificación
      if (Notification.permission === "granted") {
        new Notification("⏰ Tiempo Extendido", {
          body: `Se añadieron ${minutes} minutos más`,
          icon: "/favicon.ico",
        });
      }
    } catch (error) {
      console.error("Error extending timer:", error);
      alert("Error al extender el tiempo. Inténtalo de nuevo.");
    }
  };

  const cancelTimer = async (timerId: string) => {
    if (!confirm("¿Cancelar el temporizador de este parking?")) return;

    try {
      // CORREGIDO: Limpiar completamente el timer para evitar notificaciones futuras
      const updates = {
        expiryTime: undefined,
        reminderMinutes: undefined,
        extensionCount: undefined, // También limpiar el contador de extensiones
      };

      // Actualizar en storage
      updateCarLocation(timerId, updates);

      // Notificar al componente padre si existe
      if (onLocationUpdated) {
        onLocationUpdated(timerId, updates);
      }

      // ACTUALIZADO: Cancelar notificaciones usando notificationManager
      notificationManager.cancelNotification(`${timerId}-reminder`);
      notificationManager.cancelNotification(`${timerId}-expiry`);

      // Actualizar timers inmediatamente
      updateTimers();

      // Mostrar notificación de confirmación
      if (Notification.permission === "granted") {
        new Notification("✅ Temporizador Cancelado", {
          body: "El temporizador de parking ha sido cancelado",
          icon: "/favicon.ico",
        });
      }
    } catch (error) {
      console.error("Error canceling timer:", error);
      alert("Error al cancelar el temporizador. Inténtalo de nuevo.");
    }
  };

  const getStatusIcon = (status: TimerWidget["status"]) => {
    switch (status) {
      case "expired":
        return "🚨";
      case "warning":
        return "⚠️";
      case "extended":
        return "🔄";
      default:
        return "✅";
    }
  };

  const getStatusColor = (status: TimerWidget["status"]) => {
    switch (status) {
      case "expired":
        return "#dc3545";
      case "warning":
        return "#ffc107";
      case "extended":
        return "#17a2b8";
      default:
        return "#28a745";
    }
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

  // CORREGIDO: Obtener el timer más urgente (que menos tiempo le quede)
  const getMostUrgentTimer = (): TimerWidget | null => {
    const activeNonExpiredTimers = activeTimers.filter((timer) => timer.status !== "expired");
    if (activeNonExpiredTimers.length === 0) return null;

    // El primer elemento ya está ordenado por urgencia (menos tiempo restante)
    return activeNonExpiredTimers[0];
  };

  if (activeTimers.length === 0) {
    return (
      <div className="timer-dashboard-empty">
        <div className="no-timers">
          <div style={{ fontSize: "48px", marginBottom: "15px" }}>⏰</div>
          <h3>No hay temporizadores activos</h3>
          <p>Los temporizadores aparecerán aquí cuando configures tiempo de parking</p>
        </div>
      </div>
    );
  }

  const mostUrgentTimer = getMostUrgentTimer();

  return (
    <div className="timer-dashboard">
      {/* Header con estadísticas */}
      <div className="dashboard-header">
        <h3>⏰ Temporizadores Activos</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{stats.totalActive}</div>
            <div className="stat-label">Activos</div>
          </div>

          <div className="stat-card expired">
            <div className="stat-number">{stats.totalExpired}</div>
            <div className="stat-label">Expirados</div>
          </div>

          <div className="stat-card extensions">
            <div className="stat-number">{stats.totalExtensions}</div>
            <div className="stat-label">Extensiones</div>
          </div>

          {stats.nextExpiration && (
            <div className="stat-card next">
              <div className="stat-number">{stats.nextExpiration}</div>
              <div className="stat-label">Próximo</div>
            </div>
          )}
        </div>
      </div>

      {/* Lista de timers */}
      <div className="timers-list">
        {activeTimers.map((timer, index) => (
          <div
            key={timer.id}
            className={`timer-card ${timer.status} ${index === 0 && timer.status !== "expired" ? "most-urgent" : ""}`}
            style={{ borderColor: getStatusColor(timer.status) }}
          >
            <div className="timer-content">
              <div className="timer-info">
                <div className="timer-status">
                  <span className="status-icon">{getStatusIcon(timer.status)}</span>
                  <h4 className="time-left" style={{ color: getStatusColor(timer.status) }}>
                    {timer.timeLeft}
                    {index === 0 && timer.status !== "expired" && <span className="urgent-badge"> 🔥 MÁS URGENTE</span>}
                  </h4>
                </div>

                <div className="location-details">
                  {timer.locationNote && <p className="location-note">💭 {timer.locationNote}</p>}

                  {timer.address && <p className="location-address">📍 {timer.address}</p>}

                  <div className="location-meta">
                    <span className="parking-type">
                      {getParkingTypeIcon(timer.parkingType)}
                      {timer.parkingType === "garage"
                        ? "Garaje"
                        : timer.parkingType === "lot"
                        ? "Aparcamiento"
                        : timer.parkingType === "other"
                        ? "Otro"
                        : "Calle"}
                    </span>

                    <span className="expiry-time">Expira: {new Date(timer.expiryTime).toLocaleTimeString()}</span>

                    {timer.extensionCount > 0 && (
                      <span className="extension-count">
                        🔄 {timer.extensionCount} extensión{timer.extensionCount !== 1 ? "es" : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="timer-actions">
                {timer.status !== "expired" && (
                  <>
                    <button
                      onClick={() => extendTimer(timer.id, 30)}
                      className="extend-btn short"
                      title="Extender 30 minutos"
                    >
                      +30min
                    </button>
                    <button
                      onClick={() => extendTimer(timer.id, 60)}
                      className="extend-btn long"
                      title="Extender 1 hora"
                    >
                      +1h
                    </button>
                  </>
                )}
                <button onClick={() => cancelTimer(timer.id)} className="cancel-btn" title="Cancelar temporizador">
                  {timer.status === "expired" ? "Limpiar" : "Cancelar"}
                </button>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  backgroundColor: getStatusColor(timer.status),
                  width: `${Math.max(
                    0,
                    Math.min(
                      100,
                      ((timer.expiryTime - Date.now()) /
                        (timer.reminderMinutes ? timer.reminderMinutes * 60 * 1000 : 3600000)) *
                        100
                    )
                  )}%`,
                }}
              />
            </div>

            {/* Mensaje de expiración */}
            {timer.status === "expired" && (
              <div className="expired-message">
                <p>⚠️ El tiempo de parking ha expirado. Considera mover tu vehículo.</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CORREGIDO: Widget flotante para el más urgente */}
      {mostUrgentTimer && (
        <div className={`floating-timer ${mostUrgentTimer.status}`}>
          <div className="floating-content">
            <span className="floating-icon">{getStatusIcon(mostUrgentTimer.status)}</span>
            <div className="floating-text">
              <div className="floating-time">{mostUrgentTimer.timeLeft}</div>
              <div className="floating-location">{mostUrgentTimer.locationNote || "Parking más urgente"}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimerDashboard;
