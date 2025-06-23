// src/App.tsx
import { useState, useEffect, useCallback } from "react";
import Map from "./components/ui/Map";
import LocationSaver from "./components/ui/LocationSaver";
import SavedLocations from "./components/ui/SavedLocations";
import Settings from "./components/ui/Settings";
import Stats from "./components/ui/Stats";
import Navigation from "./components/ui/Navigation";
import ProximitySearch from "./components/ui/ProximitySearch";
import TimerDashboard from "./components/ui/TimerDashboard";
import type { CarLocation, UserPreferences } from "./types/location";
import { getCarLocations } from "./utils/storage";
import { getUserPreferences, applyTheme } from "./utils/preferences";
import "./App.css";

function App() {
  const [locations, setLocations] = useState<CarLocation[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.4168, -3.7038]);
  const [mapZoom, setMapZoom] = useState<number>(13);
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>();
  const [preferences, setPreferences] = useState<UserPreferences>(getUserPreferences());
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Estados para modales
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<CarLocation | null>(null);

  // Estados para vistas
  const [currentView, setCurrentView] = useState<"map" | "proximity">("map");

  // Estado para errores globales
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedLocations = getCarLocations();
      setLocations(savedLocations);

      // Si hay ubicaciones guardadas, centrar el mapa en la más reciente
      if (savedLocations.length > 0) {
        const lastLocation = savedLocations[0];
        setMapCenter([lastLocation.latitude, lastLocation.longitude]);
        setMapZoom(15);
      }

      // Aplicar tema guardado
      applyTheme(preferences.theme);

      // Obtener ubicación actual para proximidad
      getCurrentLocation();
    } catch (error) {
      console.error("Error initializing app:", error);
      setGlobalError("Error al cargar la aplicación. Por favor, recarga la página.");
    }
  }, [preferences.theme]);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      console.log("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGlobalError(null); // Limpiar errores si se obtiene ubicación exitosamente
      },
      (error) => {
        console.log("Could not get current location:", error);
        // No establecer error global para ubicación, es opcional
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, []);

  const handleLocationSaved = useCallback((newLocation: CarLocation) => {
    try {
      setLocations((prev) => [newLocation, ...prev]);
      setMapCenter([newLocation.latitude, newLocation.longitude]);
      setMapZoom(15);
      setSelectedLocationId(newLocation.id);
      setGlobalError(null);
    } catch (error) {
      console.error("Error handling saved location:", error);
      setGlobalError("Error al procesar la ubicación guardada.");
    }
  }, []);

  const handleLocationDeleted = useCallback(
    (id: string) => {
      try {
        setLocations((prev) => prev.filter((location) => location.id !== id));
        if (selectedLocationId === id) {
          setSelectedLocationId(undefined);
        }
        setGlobalError(null);
      } catch (error) {
        console.error("Error handling deleted location:", error);
        setGlobalError("Error al eliminar la ubicación.");
      }
    },
    [selectedLocationId]
  );

  const handleLocationSelected = useCallback((location: CarLocation) => {
    try {
      setMapCenter([location.latitude, location.longitude]);
      setMapZoom(15);
      setSelectedLocationId(location.id);
      setCurrentView("map");
      setGlobalError(null);
    } catch (error) {
      console.error("Error selecting location:", error);
      setGlobalError("Error al seleccionar la ubicación.");
    }
  }, []);

  const handleNavigateToLocation = useCallback((location: CarLocation) => {
    try {
      setNavigationTarget(location);
      setShowNavigation(true);
      setGlobalError(null);
    } catch (error) {
      console.error("Error starting navigation:", error);
      setGlobalError("Error al iniciar la navegación.");
    }
  }, []);

  const handleShowOnMap = useCallback((locationsToShow: CarLocation[]) => {
    try {
      if (locationsToShow.length > 0) {
        const avgLat = locationsToShow.reduce((sum, loc) => sum + loc.latitude, 0) / locationsToShow.length;
        const avgLng = locationsToShow.reduce((sum, loc) => sum + loc.longitude, 0) / locationsToShow.length;

        setMapCenter([avgLat, avgLng]);
        setMapZoom(12);
        setCurrentView("map");
        setGlobalError(null);
      }
    } catch (error) {
      console.error("Error showing locations on map:", error);
      setGlobalError("Error al mostrar ubicaciones en el mapa.");
    }
  }, []);

  const handlePreferencesChange = useCallback((newPreferences: UserPreferences) => {
    try {
      setPreferences(newPreferences);
      setGlobalError(null);
    } catch (error) {
      console.error("Error updating preferences:", error);
      setGlobalError("Error al actualizar las preferencias.");
    }
  }, []);

  // NUEVO: Handler para actualizar ubicaciones cuando se modifican timers
  const handleLocationUpdated = useCallback((locationId: string, updates: Partial<CarLocation>) => {
    setLocations((prev) => prev.map((loc) => (loc.id === locationId ? { ...loc, ...updates } : loc)));
  }, []);

  const closeNavigation = useCallback(() => {
    setShowNavigation(false);
    setNavigationTarget(null);
  }, []);

  // Manejar errores de las notificaciones del navegador
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch((error) => {
        console.log("Notification permission denied:", error);
      });
    }
  }, []);

  return (
    <div className={`App ${preferences.theme === "dark" ? "dark-theme" : ""}`} data-theme={preferences.theme}>
      {/* Mostrar error global si existe */}
      {globalError && (
        <div
          className="global-error"
          style={{
            position: "fixed",
            top: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#dc3545",
            color: "white",
            padding: "10px 20px",
            borderRadius: "6px",
            zIndex: 9999,
          }}
        >
          {globalError}
          <button
            onClick={() => setGlobalError(null)}
            style={{
              marginLeft: "10px",
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      )}

      <header className="app-header">
        <div className="header-content">
          <div className="header-main">
            <h1>🚗 ¿Dónde aparqué mi coche?</h1>
            <p>Guarda y encuentra fácilmente donde aparcaste tu vehículo</p>
          </div>
          <div className="header-actions">
            <button
              className={`header-btn view-btn ${currentView === "map" ? "active" : ""}`}
              onClick={() => setCurrentView("map")}
              title="Vista de mapa"
            >
              🗺️
            </button>
            <button
              className={`header-btn view-btn ${currentView === "proximity" ? "active" : ""}`}
              onClick={() => setCurrentView("proximity")}
              title="Búsqueda por proximidad"
            >
              📍
            </button>
            <button className="header-btn stats-btn" onClick={() => setShowStats(true)} title="Ver estadísticas">
              📊
            </button>
            <button className="header-btn settings-btn" onClick={() => setShowSettings(true)} title="Configuración">
              ⚙️
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <LocationSaver
          onLocationSaved={handleLocationSaved}
          autoSave={preferences.autoSave}
          notifications={preferences.notifications}
          defaultReminderMinutes={preferences.defaultReminderMinutes}
          maxPhotos={preferences.maxPhotos}
          photoQuality={preferences.photoQuality}
        />

        {/* NUEVO: Timer Dashboard */}
        <TimerDashboard locations={locations} onLocationUpdated={handleLocationUpdated} />

        {currentView === "map" ? (
          <div className="map-section">
            <h3>🗺️ Mapa de ubicaciones</h3>
            <Map
              locations={locations}
              center={mapCenter}
              zoom={mapZoom}
              mapType={preferences.mapType}
              selectedLocationId={selectedLocationId}
            />
          </div>
        ) : (
          <ProximitySearch
            locations={locations}
            onLocationSelect={handleLocationSelected}
            onShowOnMap={handleShowOnMap}
          />
        )}

        <SavedLocations
          locations={locations}
          onLocationDeleted={handleLocationDeleted}
          onLocationSelected={handleLocationSelected}
          onNavigateToLocation={handleNavigateToLocation}
          sortBy={preferences.sortBy}
          showAll={preferences.showAll}
          onSortChange={(sortBy) => handlePreferencesChange({ ...preferences, sortBy })}
          onShowAllChange={(showAll) => handlePreferencesChange({ ...preferences, showAll })}
        />
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-tips">
            <p>
              💡 <strong>Consejos:</strong>
            </p>
            <ul>
              <li>Permite el acceso a la ubicación para obtener mejores resultados</li>
              <li>Añade fotos para recordar mejor dónde aparcaste</li>
              <li>Usa temporizadores para evitar multas</li>
              <li>Prueba la búsqueda por proximidad cuando estés cerca</li>
            </ul>
          </div>
          <div className="footer-stats">
            <p>
              📊 Ubicaciones guardadas: <strong>{locations.length}</strong>
            </p>
            {locations.length > 0 && (
              <p>
                📅 Última vez: <strong>{new Date(locations[0]?.timestamp).toLocaleDateString()}</strong>
              </p>
            )}
            {locations.filter((loc) => loc.photos && loc.photos.length > 0).length > 0 && (
              <p>
                📸 Con fotos: <strong>{locations.filter((loc) => loc.photos && loc.photos.length > 0).length}</strong>
              </p>
            )}
            {locations.filter((loc) => loc.cost && loc.cost > 0).length > 0 && (
              <p>
                💰 Gasto total:{" "}
                <strong>
                  {locations
                    .filter((loc) => loc.cost && loc.cost > 0)
                    .reduce((sum, loc) => sum + (loc.cost || 0), 0)
                    .toFixed(2)}
                  €
                </strong>
              </p>
            )}
          </div>
        </div>
      </footer>

      {/* Modales */}
      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onPreferencesChange={handlePreferencesChange}
      />

      <Stats locations={locations} isOpen={showStats} onClose={() => setShowStats(false)} />

      {showNavigation && navigationTarget && (
        <Navigation targetLocation={navigationTarget} currentLocation={currentLocation} onClose={closeNavigation} />
      )}
    </div>
  );
}

export default App;
