// src/App.tsx
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Toaster } from "@/shared/ui/sonner";
import { ThemeProvider } from "@/shared/ui/theme-provider";
import { Alert, AlertDescription, Button } from "@/shared/ui";
import { AlertTriangle, X } from "lucide-react";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary/ErrorBoundary";
import { MainLayout } from "@/shared/components/Layout/Layout";

// Componentes PWA
import { InstallBanner } from "@/components/PWA/InstallBanner";
import { UpdateNotification } from "@/components/PWA/UpdateNotification";
import { OfflineIndicator } from "@/components/PWA/OfflineIndicator";
import { usePWA } from "@/hooks/usePWA";

// Componentes principales
import LocationSaver from "./features/location/components/LocationSaver/LocationSaver";
import TimerDashboard from "./features/parking/components/TimerDashboard/TimerDashboard";
import { UnifiedMap } from "./features/location/components/UnifiedMap/UnifiedMap";
import SavedLocations from "./features/location/components/SavedLocations/SavedLocations";
import ProximitySearch from "./features/location/components/ProximitySearch/ProximitySearch";
import Settings from "./shared/components/Settings/Settings";
import Stats from "./shared/components/Stats/Stats";
import Navigation from "./features/navigation/components/Navigation/Navigation";
import LocationPermissions from "./features/navigation/components/LocationPermissions/LocationPermissions";
import { NotificationSetup } from "@/components/NotificationSetup";

import type { CarLocation, UserPreferences } from "./types/location";
import { getCarLocations, updateCarLocation, saveCarLocation, deleteCarLocation } from "./utils/storage";
import { getUserPreferences, initializeTheme } from "./utils/preferences";
import { timerManager } from "./utils/timerManager";
import { LocationManager, useSmartLocation } from "./utils/locationDefaults";
import { toast } from "sonner";
import { notificationManager } from "./utils/notificationManager";

function AppContent() {
  const { initialLocation, isLoading: locationLoading, updateLastKnownLocation } = useSmartLocation();

  // Estados principales
  const [locations, setLocations] = useState<CarLocation[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>(initialLocation?.coordinates || [40.4168, -3.7038]);
  const [mapZoom, setMapZoom] = useState<number>(initialLocation?.zoom || 13);
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>();
  const [preferences, setPreferences] = useState<UserPreferences>(getUserPreferences());
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Estados de UI
  const [currentView, setCurrentView] = useState<"map" | "proximity">("map");
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<CarLocation | null>(null);
  const [showLocationPermissions, setShowLocationPermissions] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Referencias
  const mapSectionRef = useRef<HTMLDivElement>(null);

  // Configuración de PWA
  const { isOffline, hasUpdate, updateApp, dismissUpdate } = usePWA();

  // Obtener ubicación actual del usuario
  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => console.error("Error getting current location:", error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    }
  }, []);

  // Verificar permisos de geolocalización
  const checkLocationPermissions = useCallback(async () => {
    if (!("geolocation" in navigator) || !navigator.geolocation) {
      setLocationPermissionGranted(false);
      return;
    }
    try {
      if ("permissions" in navigator && navigator.permissions) {
        const permission = await navigator.permissions.query({ name: "geolocation" });
        setLocationPermissionGranted(permission.state === "granted");
        permission.addEventListener("change", () => {
          setLocationPermissionGranted(permission.state === "granted");
        });
      } else {
        navigator.geolocation.getCurrentPosition(
          () => setLocationPermissionGranted(true),
          () => setLocationPermissionGranted(false),
          { timeout: 5000 }
        );
      }
    } catch (error) {
      console.error("Error checking location permissions:", error);
      setLocationPermissionGranted(false);
    }
  }, []);

  const openInGoogleMaps = useCallback((location: CarLocation) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}&travelmode=walking`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const handleLocationSaved = useCallback(async (newLocation: CarLocation) => {
    try {
      // Guardar en localStorage
      saveCarLocation(newLocation);

      // Actualizar estado local
      setLocations((prev) => [newLocation, ...prev]);
      setMapCenter([newLocation.latitude, newLocation.longitude]);
      setMapZoom(15);
      setSelectedLocationId(newLocation.id);
      LocationManager.saveLastKnownLocation(newLocation.latitude, newLocation.longitude, "saved_location");

      // ✅ NUEVO: Solicitar permisos de notificación antes de programar timer
      if (newLocation.expiryTime && newLocation.expiryTime > Date.now()) {
        await timerManager.scheduleTimer(newLocation);

        const timeLeft = Math.round((newLocation.expiryTime - Date.now()) / 1000 / 60);
        toast.success(`📍 Ubicación guardada con timer de ${timeLeft} minutos`);
      } else {
        toast.success("📍 Ubicación guardada correctamente");
      }
    } catch (error) {
      console.error("Error saving location:", error);
      toast.error("❌ No se pudo guardar la ubicación");
    }
  }, []);

  const handleLocationDeleted = useCallback((id: string) => {
    try {
      deleteCarLocation(id);
      setLocations((prev) => prev.filter((location) => location.id !== id));
      setSelectedLocationId((prevSelected) => (prevSelected === id ? undefined : prevSelected));
      timerManager.cancelTimer(id);
    } catch (error) {
      console.error("Error deleting location:", error);
      toast.error("❌ No se pudo eliminar la ubicación");
    }
  }, []);

  const handleLocationSelected = useCallback(
    (location: CarLocation) => {
      setCurrentView("map");
      setMapCenter([location.latitude, location.longitude]);
      setMapZoom(15);
      setSelectedLocationId(location.id);
      updateLastKnownLocation(location.latitude, location.longitude);

      setTimeout(() => {
        mapSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    },
    [updateLastKnownLocation]
  );

  const handleLocationUpdated = useCallback((locationId: string, updates: Partial<CarLocation>) => {
    setLocations((prev) => prev.map((loc) => (loc.id === locationId ? { ...loc, ...updates } : loc)));
  }, []);

  const handlePreferencesChange = useCallback((newPreferences: UserPreferences) => {
    setPreferences(newPreferences);
  }, []);

  // Handler para cambios en el mapa unificado
  const handleMapCenterChange = useCallback(
    (center: [number, number], zoom: number) => {
      setMapCenter(center);
      setMapZoom(zoom);
      updateLastKnownLocation(center[0], center[1]);
    },
    [updateLastKnownLocation]
  );

  // Handler para clic en ubicación en el mapa
  const handleMapLocationClick = useCallback((location: CarLocation) => {
    setSelectedLocationId(location.id);
  }, []);

  const handleNavigateToLocation = useCallback(
    (location: CarLocation) => {
      if (!("geolocation" in navigator) || !navigator.geolocation) {
        openInGoogleMaps(location);
        return;
      }
      if ("permissions" in navigator && navigator.permissions) {
        navigator.permissions
          .query({ name: "geolocation" })
          .then((permission) => {
            if (permission.state === "granted") {
              setNavigationTarget(location);
              setShowNavigation(true);
            } else if (permission.state === "denied") {
              openInGoogleMaps(location);
            } else {
              setNavigationTarget(location);
              setShowLocationPermissions(true);
            }
          })
          .catch(() => {
            setNavigationTarget(location);
            setShowLocationPermissions(true);
          });
      } else {
        navigator.geolocation.getCurrentPosition(
          () => {
            setNavigationTarget(location);
            setShowNavigation(true);
          },
          () => {
            setNavigationTarget(location);
            setShowLocationPermissions(true);
          },
          { timeout: 5000 }
        );
      }
    },
    [openInGoogleMaps]
  );

  const handleShowOnMap = useCallback(
    (locationsToShow: CarLocation[]) => {
      if (locationsToShow.length > 0) {
        const avgLat = locationsToShow.reduce((sum, loc) => sum + loc.latitude, 0) / locationsToShow.length;
        const avgLng = locationsToShow.reduce((sum, loc) => sum + loc.longitude, 0) / locationsToShow.length;
        setMapCenter([avgLat, avgLng]);
        setMapZoom(12);
        setCurrentView("map");
        updateLastKnownLocation(avgLat, avgLng);

        setTimeout(() => {
          mapSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 100);
      }
    },
    [updateLastKnownLocation]
  );

  const handleTimerExtend = useCallback((locationId: string, minutes: number) => {
    setLocations((prevLocations) => {
      let updatedLocation: CarLocation | undefined;

      const newLocations = prevLocations.map((loc) => {
        if (loc.id === locationId && loc.expiryTime) {
          const newExpiryTime = loc.expiryTime + minutes * 60 * 1000;
          const newExtensionCount = (loc.extensionCount || 0) + 1;
          const updates = { expiryTime: newExpiryTime, extensionCount: newExtensionCount };

          updatedLocation = { ...loc, ...updates };
          updateCarLocation(locationId, updates);
          return updatedLocation;
        }
        return loc;
      });

      if (updatedLocation) {
        setTimeout(() => timerManager.scheduleTimer(updatedLocation!), 0);
      }

      return newLocations;
    });
  }, []);

  const handleTimerCancel = useCallback((locationId: string) => {
    setLocations((prevLocations) =>
      prevLocations.map((loc) => {
        if (loc.id === locationId) {
          const updates = {
            expiryTime: undefined,
            reminderMinutes: undefined,
            extensionCount: undefined,
          };
          updateCarLocation(locationId, updates);
          return { ...loc, ...updates };
        }
        return loc;
      })
    );
    timerManager.cancelTimer(locationId);
  }, []);

  const handlePermissionGranted = useCallback(() => {
    setLocationPermissionGranted(true);
    setShowLocationPermissions(false);
    if (navigationTarget) {
      setShowNavigation(true);
    }
  }, [navigationTarget]);

  const handlePermissionDenied = useCallback(() => {
    setShowLocationPermissions(false);
    if (navigationTarget) {
      openInGoogleMaps(navigationTarget);
      setNavigationTarget(null);
    }
  }, [navigationTarget, openInGoogleMaps]);

  const closeNavigation = useCallback(() => {
    setShowNavigation(false);
    setNavigationTarget(null);
    setShowLocationPermissions(false);
  }, []);

  const showSettingsHandler = useCallback(() => setShowSettings(true), []);
  const hideSettingsHandler = useCallback(() => setShowSettings(false), []);
  const showStatsHandler = useCallback(() => setShowStats(true), []);
  const hideStatsHandler = useCallback(() => setShowStats(false), []);
  const handleGlobalErrorDismiss = useCallback(() => setGlobalError(null), []);

  const headerProps = useMemo(
    () => ({
      currentView,
      onViewChange: setCurrentView,
      onShowStats: showStatsHandler,
      onShowSettings: showSettingsHandler,
    }),
    [currentView, showStatsHandler, showSettingsHandler]
  );

  const sidebarContent = useMemo(
    () => (
      <>
        <LocationSaver
          onLocationSaved={handleLocationSaved}
          autoSave={preferences.autoSave}
          defaultReminderMinutes={preferences.defaultReminderMinutes}
          maxPhotos={preferences.maxPhotos}
          photoQuality={preferences.photoQuality}
          mapType={preferences.mapType}
          initialCenter={mapCenter}
          initialZoom={mapZoom}
        />

        <TimerDashboard locations={locations} onLocationUpdated={handleLocationUpdated} />
      </>
    ),
    [
      handleLocationSaved,
      preferences.autoSave,
      preferences.defaultReminderMinutes,
      preferences.maxPhotos,
      preferences.photoQuality,
      preferences.mapType,
      mapCenter,
      mapZoom,
      locations,
      handleLocationUpdated,
    ]
  );

  const savedLocationsProps = useMemo(
    () => ({
      locations,
      onLocationDeleted: handleLocationDeleted,
      onLocationSelected: handleLocationSelected,
      onNavigateToLocation: handleNavigateToLocation,
      sortBy: "date" as const,
      showAll: true,
      onSortChange: () => {},
      onShowAllChange: () => {},
      onTimerExtend: handleTimerExtend,
      onTimerCancel: handleTimerCancel,
      onLocationUpdated: handleLocationUpdated,
    }),
    [
      locations,
      handleLocationDeleted,
      handleLocationSelected,
      handleNavigateToLocation,
      handleTimerExtend,
      handleTimerCancel,
      handleLocationUpdated,
    ]
  );

  const mainContent = useMemo(
    () => (
      <>
        {currentView === "map" ? (
          <div className="space-y-6">
            <div ref={mapSectionRef} className="rounded-lg overflow-hidden border">
              <UnifiedMap
                center={mapCenter}
                zoom={mapZoom}
                mapType={preferences.mapType}
                height="400px"
                locations={locations}
                selectedLocationId={selectedLocationId}
                gpsLocation={currentLocation ? [currentLocation.latitude, currentLocation.longitude] : null}
                showControls={true}
                showLocationButton={true}
                showResetButton={true}
                onLocationClick={handleMapLocationClick}
                onCenterChange={handleMapCenterChange}
              />
            </div>
          </div>
        ) : (
          <ProximitySearch
            locations={locations}
            onLocationSelect={handleLocationSelected}
            onShowOnMap={handleShowOnMap}
          />
        )}
        <SavedLocations {...savedLocationsProps} />
      </>
    ),
    [
      currentView,
      mapCenter,
      mapZoom,
      preferences.mapType,
      locations,
      selectedLocationId,
      currentLocation,
      handleMapLocationClick,
      handleMapCenterChange,
      handleLocationSelected,
      handleShowOnMap,
      savedLocationsProps,
    ]
  );

  // useEffect de inicialización
  useEffect(() => {
    try {
      initializeTheme();
      const initializeNotifications = async () => {
        try {
          await notificationManager.initialize();
          console.log("🔔 Sistema de notificaciones inicializado");
        } catch (error) {
          console.log("⚠️ No se pudieron inicializar las notificaciones:", error);
        }
      };

      initializeNotifications();
      const savedLocations = getCarLocations();
      setLocations(savedLocations);

      savedLocations.forEach((location) => {
        if (location.expiryTime && location.expiryTime > Date.now()) {
          timerManager.scheduleTimer(location);
        }
      });

      if (!locationLoading && savedLocations.length > 0 && !initialLocation) {
        setMapCenter([savedLocations[0].latitude, savedLocations[0].longitude]);
        setMapZoom(15);
      }

      getCurrentLocation();
      checkLocationPermissions();
    } catch (error) {
      console.error("Error initializing app:", error);
      setGlobalError("Error al cargar la aplicación. Por favor, recarga la página.");
    }
  }, [getCurrentLocation, checkLocationPermissions, locationLoading, initialLocation]);

  // Actualizar el centro del mapa cuando cambie initialLocation
  useEffect(() => {
    if (initialLocation && !locationLoading) {
      setMapCenter(initialLocation.coordinates);
      setMapZoom(initialLocation.zoom);
    }
  }, [initialLocation, locationLoading]);

  return (
    <ThemeProvider defaultTheme="system" storageKey="where-is-it-theme">
      <UpdateNotification isVisible={hasUpdate} onUpdate={updateApp} onDismiss={dismissUpdate} />
      <OfflineIndicator isOffline={isOffline} />

      <NotificationSetup />

      {/* Indicador de error global */}
      {globalError && (
        <Alert className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-md bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{globalError}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGlobalErrorDismiss}
              className="h-auto p-1 hover:bg-red-100 dark:hover:bg-red-900"
            >
              <X className="h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <MainLayout headerProps={headerProps} sidebar={sidebarContent}>
        {mainContent}
      </MainLayout>

      <InstallBanner />

      {showLocationPermissions && navigationTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <ErrorBoundary>
            <LocationPermissions
              onPermissionGranted={handlePermissionGranted}
              onPermissionDenied={handlePermissionDenied}
            />
          </ErrorBoundary>
        </div>
      )}

      <ErrorBoundary>
        <Settings isOpen={showSettings} onClose={hideSettingsHandler} onPreferencesChange={handlePreferencesChange} />
      </ErrorBoundary>

      <ErrorBoundary>
        <Stats locations={locations} isOpen={showStats} onClose={hideStatsHandler} />
      </ErrorBoundary>

      {showNavigation && navigationTarget && locationPermissionGranted && (
        <ErrorBoundary>
          <Navigation targetLocation={navigationTarget} currentLocation={currentLocation} onClose={closeNavigation} />
        </ErrorBoundary>
      )}

      <Toaster />
    </ThemeProvider>
  );
}

function App() {
  const handleGlobalError = useCallback((error: Error, errorInfo: any) => {
    console.error("Error global capturado:", error, errorInfo);
  }, []);

  return (
    <ErrorBoundary onError={handleGlobalError}>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
