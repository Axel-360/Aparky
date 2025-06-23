// src/components/ui/Settings.tsx
import React, { useState } from "react";
import type { UserPreferences } from "../../types/location";
import { getUserPreferences, saveUserPreferences, applyTheme } from "../../utils/preferences";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onPreferencesChange: (preferences: UserPreferences) => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, onPreferencesChange }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(getUserPreferences());

  const handleChange = (key: keyof UserPreferences, value: any) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    saveUserPreferences({ [key]: value });
    onPreferencesChange(updated);

    if (key === "theme") {
      applyTheme(value);
    }
  };

  const exportData = () => {
    const locations = localStorage.getItem("car-locations");
    if (locations) {
      const blob = new Blob([locations], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `car-locations-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result as string;
          JSON.parse(data); // Validar que es JSON válido
          localStorage.setItem("car-locations", data);
          alert("Datos importados correctamente. Recarga la página para ver los cambios.");
        } catch (error) {
          alert("Error al importar los datos. Asegúrate de que el archivo sea válido.");
        }
      };
      reader.readAsText(file);
    }
  };

  const clearAllData = () => {
    if (
      window.confirm("¿Estás seguro de que quieres eliminar todas las ubicaciones? Esta acción no se puede deshacer.")
    ) {
      localStorage.removeItem("car-locations");
      alert("Todos los datos han sido eliminados. Recarga la página para ver los cambios.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>⚙️ Configuración</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3>🎨 Apariencia</h3>
            <div className="setting-item">
              <label>Tema:</label>
              <select
                value={preferences.theme}
                onChange={(e) => handleChange("theme", e.target.value as "light" | "dark")}
              >
                <option value="light">Claro</option>
                <option value="dark">Oscuro</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h3>🗺️ Mapa</h3>
            <div className="setting-item">
              <label>Tipo de mapa:</label>
              <select value={preferences.mapType} onChange={(e) => handleChange("mapType", e.target.value)}>
                <option value="osm">OpenStreetMap</option>
                <option value="satellite">Satélite</option>
                <option value="terrain">Terreno</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h3>📋 Listado</h3>
            <div className="setting-item">
              <label>Ordenar por defecto:</label>
              <select
                value={preferences.sortBy}
                onChange={(e) => handleChange("sortBy", e.target.value as "date" | "note")}
              >
                <option value="date">Fecha</option>
                <option value="note">Nota</option>
              </select>
            </div>
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.showAll}
                  onChange={(e) => handleChange("showAll", e.target.checked)}
                />
                Mostrar todas las ubicaciones por defecto
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>🔔 Funcionalidades</h3>
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.autoSave}
                  onChange={(e) => handleChange("autoSave", e.target.checked)}
                />
                Guardar automáticamente al obtener ubicación
              </label>
            </div>
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.notifications}
                  onChange={(e) => handleChange("notifications", e.target.checked)}
                />
                Mostrar notificaciones
              </label>
            </div>
            <div className="setting-item">
              <label>Recordatorio por defecto (minutos):</label>
              <select
                value={preferences.defaultReminderMinutes}
                onChange={(e) => handleChange("defaultReminderMinutes", parseInt(e.target.value))}
              >
                <option value="5">5 minutos</option>
                <option value="10">10 minutos</option>
                <option value="15">15 minutos</option>
                <option value="30">30 minutos</option>
                <option value="60">60 minutos</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h3>📸 Fotos</h3>
            <div className="setting-item">
              <label>Máximo de fotos por ubicación:</label>
              <select
                value={preferences.maxPhotos}
                onChange={(e) => handleChange("maxPhotos", parseInt(e.target.value))}
              >
                <option value="1">1 foto</option>
                <option value="2">2 fotos</option>
                <option value="3">3 fotos</option>
                <option value="5">5 fotos</option>
                <option value="10">10 fotos</option>
              </select>
            </div>
            <div className="setting-item">
              <label>Calidad de las fotos:</label>
              <select
                value={preferences.photoQuality}
                onChange={(e) => handleChange("photoQuality", e.target.value as "low" | "medium" | "high")}
              >
                <option value="low">Baja (más rápido)</option>
                <option value="medium">Media (recomendado)</option>
                <option value="high">Alta (mejor calidad)</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h3>💾 Datos</h3>
            <div className="setting-actions">
              <button className="export-btn" onClick={exportData}>
                📤 Exportar datos
              </button>
              <label className="import-btn">
                📥 Importar datos
                <input type="file" accept=".json" onChange={importData} style={{ display: "none" }} />
              </label>
              <button className="clear-btn" onClick={clearAllData}>
                🗑️ Eliminar todos los datos
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
