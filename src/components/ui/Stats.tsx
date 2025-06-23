// src/components/ui/Stats.tsx
import React from "react";
import type { CarLocation } from "../../types/location";
import { calculateLocationStats } from "../../utils/stats";

interface StatsProps {
  locations: CarLocation[];
  isOpen: boolean;
  onClose: () => void;
}

const Stats: React.FC<StatsProps> = ({ locations, isOpen, onClose }) => {
  const stats = calculateLocationStats(locations);

  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const formatHour = (hour: number): string => {
    return `${hour.toString().padStart(2, "0")}:00`;
  };

  const getWeekdayPercentage = (count: number): number => {
    return stats.totalLocations > 0 ? Math.round((count / stats.totalLocations) * 100) : 0;
  };

  const mostActiveDay = stats.weeklyCount.indexOf(Math.max(...stats.weeklyCount));

  if (!isOpen) return null;

  return (
    <div className="stats-overlay">
      <div className="stats-modal">
        <div className="stats-header">
          <h2>📊 Estadísticas de uso</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="stats-content">
          {stats.totalLocations === 0 ? (
            <div className="no-stats">
              <p>📈 No hay suficientes datos para mostrar estadísticas.</p>
              <p>Guarda algunas ubicaciones para ver información interesante sobre tus hábitos de aparcamiento.</p>
            </div>
          ) : (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">📍</div>
                  <div className="stat-info">
                    <h3>Total de ubicaciones</h3>
                    <p className="stat-number">{stats.totalLocations}</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">🕐</div>
                  <div className="stat-info">
                    <h3>Hora más común</h3>
                    <p className="stat-number">{formatHour(stats.mostUsedHour)}</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">📅</div>
                  <div className="stat-info">
                    <h3>Día más activo</h3>
                    <p className="stat-number">{weekDays[mostActiveDay]}</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">🏙️</div>
                  <div className="stat-info">
                    <h3>Área favorita</h3>
                    <p className="stat-text">{stats.mostCommonArea}</p>
                  </div>
                </div>
              </div>

              <div className="chart-section">
                <h3>📈 Actividad por día de la semana</h3>
                <div className="week-chart">
                  {weekDays.map((day, index) => (
                    <div key={day} className="day-bar">
                      <div className="bar-container">
                        <div
                          className="bar-fill"
                          style={{
                            height: `${getWeekdayPercentage(stats.weeklyCount[index])}%`,
                            backgroundColor: index === mostActiveDay ? "#28a745" : "#007bff",
                          }}
                        ></div>
                      </div>
                      <div className="day-label">{day}</div>
                      <div className="day-count">{stats.weeklyCount[index]}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="insights-section">
                <h3>💡 Insights</h3>
                <div className="insights-list">
                  <div className="insight-item">
                    <span className="insight-icon">🎯</span>
                    <span>
                      Sueles aparcar más frecuentemente los {weekDays[mostActiveDay]}s (
                      {getWeekdayPercentage(stats.weeklyCount[mostActiveDay])}% del tiempo)
                    </span>
                  </div>
                  <div className="insight-item">
                    <span className="insight-icon">⏰</span>
                    <span>Tu hora más común para aparcar es a las {formatHour(stats.mostUsedHour)}</span>
                  </div>
                  {stats.mostCommonArea !== "Sin datos" && (
                    <div className="insight-item">
                      <span className="insight-icon">📍</span>
                      <span>Tu zona de aparcamiento favorita es: {stats.mostCommonArea}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Stats;
