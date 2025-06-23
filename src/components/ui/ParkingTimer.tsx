// src/components/ui/ParkingTimer.tsx
import React, { useState, useEffect } from "react";

interface ParkingTimerProps {
  expiryTime?: number;
  reminderMinutes?: number;
  onExpiryTimeChange: (expiryTime?: number) => void;
  onReminderChange: (reminderMinutes?: number) => void;
  onTimerExpired?: () => void;
  onReminderTriggered?: () => void;
  onTimerCancelled?: () => void;
  onTimerExtended?: (additionalMinutes: number) => void;
}

const ParkingTimer: React.FC<ParkingTimerProps> = ({
  expiryTime,
  reminderMinutes,
  onExpiryTimeChange,
  onReminderChange,
  onTimerExpired,
  onReminderTriggered,
  onTimerCancelled,
}) => {
  const [duration, setDuration] = useState<string>("");
  const [customTime, setCustomTime] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [status, setStatus] = useState<"inactive" | "active" | "warning" | "expired">("inactive");
  const [reminderSent, setReminderSent] = useState(false);

  // Actualizar contador cada minuto
  useEffect(() => {
    if (!expiryTime) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = expiryTime - now;

      if (remaining <= 0) {
        setTimeLeft("Expirado");
        setStatus("expired");
        if (onTimerExpired) onTimerExpired();
        return;
      }

      // Verificar si hay que enviar recordatorio
      const reminderTime = reminderMinutes ? reminderMinutes * 60 * 1000 : 0;
      if (!reminderSent && remaining <= reminderTime && reminderTime > 0) {
        setReminderSent(true);
        if (onReminderTriggered) onReminderTriggered();
      }

      // Calcular tiempo restante
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }

      // Determinar estado
      if (remaining <= (reminderMinutes || 0) * 60 * 1000) {
        setStatus("warning");
      } else {
        setStatus("active");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Actualizar cada minuto

    return () => clearInterval(interval);
  }, [expiryTime, reminderMinutes, reminderSent, onTimerExpired, onReminderTriggered]);

  const quickDurations = [
    { label: "30 min", minutes: 30 },
    { label: "1 hora", minutes: 60 },
    { label: "2 horas", minutes: 120 },
    { label: "4 horas", minutes: 240 },
  ];

  const reminderOptions = [
    { label: "5 min antes", minutes: 5 },
    { label: "10 min antes", minutes: 10 },
    { label: "15 min antes", minutes: 15 },
    { label: "30 min antes", minutes: 30 },
  ];

  const setQuickDuration = (minutes: number) => {
    const expiryTime = Date.now() + minutes * 60 * 1000;
    onExpiryTimeChange(expiryTime);
    setReminderSent(false);
  };

  const setCustomDuration = () => {
    if (!duration) return;

    const minutes = parseInt(duration);
    if (isNaN(minutes) || minutes <= 0) {
      alert("Introduce una duración válida en minutos");
      return;
    }

    const expiryTime = Date.now() + minutes * 60 * 1000;
    onExpiryTimeChange(expiryTime);
    setDuration("");
    setReminderSent(false);
  };

  const setSpecificTime = () => {
    if (!customTime) return;

    const today = new Date();
    const [hours, minutes] = customTime.split(":").map(Number);

    const targetTime = new Date(today);
    targetTime.setHours(hours, minutes, 0, 0);

    // Si la hora ya pasó hoy, asumir que es para mañana
    if (targetTime.getTime() <= Date.now()) {
      targetTime.setDate(targetTime.getDate() + 1);
    }

    onExpiryTimeChange(targetTime.getTime());
    setCustomTime("");
    setReminderSent(false);
  };

  const clearTimer = () => {
    onExpiryTimeChange(undefined);
    setStatus("inactive");
    setReminderSent(false);

    // Notificar que el temporizador fue cancelado
    if (onTimerCancelled) {
      onTimerCancelled();
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "active":
        return "✅";
      case "warning":
        return "⚠️";
      case "expired":
        return "🚨";
      default:
        return "⏰";
    }
  };

  const getStatusClass = () => {
    switch (status) {
      case "active":
        return "timer-active";
      case "warning":
        return "timer-warning";
      case "expired":
        return "timer-expired";
      default:
        return "timer-inactive";
    }
  };

  return (
    <div className="parking-timer">
      <div className="timer-header">
        <h4>⏰ Temporizador de parking</h4>
        {expiryTime && (
          <div className={`timer-status ${getStatusClass()}`}>
            <span className="timer-icon">{getStatusIcon()}</span>
            <span className="timer-text">{status === "expired" ? "Expirado" : `Quedan ${timeLeft}`}</span>
          </div>
        )}
      </div>

      {!expiryTime ? (
        <div className="timer-setup">
          <div className="quick-durations">
            <h5>Duración rápida:</h5>
            <div className="duration-buttons">
              {quickDurations.map((option) => (
                <button key={option.minutes} className="duration-btn" onClick={() => setQuickDuration(option.minutes)}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="custom-duration">
            <h5>Duración personalizada:</h5>
            <div className="custom-input">
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Minutos"
                min="1"
                max="1440"
              />
              <button onClick={setCustomDuration} disabled={!duration} className="set-duration-btn">
                Establecer
              </button>
            </div>
          </div>

          <div className="specific-time">
            <h5>Hora específica:</h5>
            <div className="time-input">
              <input type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} />
              <button onClick={setSpecificTime} disabled={!customTime} className="set-time-btn">
                Establecer
              </button>
            </div>
          </div>

          <div className="reminder-setup">
            <h5>Recordarme:</h5>
            <div className="reminder-buttons">
              {reminderOptions.map((option) => (
                <button
                  key={option.minutes}
                  className={`reminder-btn ${reminderMinutes === option.minutes ? "active" : ""}`}
                  onClick={() => onReminderChange(option.minutes)}
                >
                  {option.label}
                </button>
              ))}
              <button
                className={`reminder-btn ${reminderMinutes === undefined ? "active" : ""}`}
                onClick={() => onReminderChange(undefined)}
              >
                Sin recordatorio
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="timer-active-display">
          <div className="timer-info">
            <p>
              <strong>Expira:</strong> {new Date(expiryTime).toLocaleString()}
            </p>
            {reminderMinutes && (
              <p>
                <strong>Recordatorio:</strong> {reminderMinutes} minutos antes
                {reminderSent && <span className="reminder-sent"> ✅ Enviado</span>}
              </p>
            )}
          </div>

          {/* Solo mostrar botón para limpiar la configuración del timer */}
          <div className="timer-actions">
            <button className="clear-timer-btn" onClick={clearTimer} title="Limpiar configuración del temporizador">
              ✕ Limpiar configuración
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParkingTimer;
