// src/App.tsx
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Toaster } from "@/shared/ui/sonner";
import { ThemeProvider } from "@/shared/ui/theme-provider";
import { Alert, AlertDescription, Button, Card, CardContent, Badge } from "@/shared/ui";
import { AlertTriangle, X, Info } from "lucide-react";
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
import { UnifiedMap } from "./features/location/components/UnifiedMap/UnifiedMap"; // 🚀 NUEVO
import SavedLocations from "./features/location/components/SavedLocations/SavedLocations";
import ProximitySearch from "./features/location/components/ProximitySearch/ProximitySearch";
import Settings from "./shared/components/Settings/Settings";
import Stats from "./shared/components/Stats/Stats";
import Navigation from "./features/navigation/components/Navigation/Navigation";
import LocationPermissions from "./features/navigation/components/LocationPermissions/LocationPermissions";

import type { CarLocation, UserPreferences } from "./types/location";
import { getCarLocations, updateCarLocation } from "./utils/storage";
import { getUserPreferences, initializeTheme } from "./utils/preferences";
import { timerManager } from "./utils/timerManager";
import { LocationManager, useSmartLocation } from "./utils/locationDefaults";

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
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [showLocationPermissions, setShowLocationPermissions] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<CarLocation | null>(null);
  const [currentView, setCurrentView] = useState<"map" | "proximity">("map");
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [showLocationInfo, setShowLocationInfo] = useState(false);

  const mapSectionRef = useRef<HTMLDivElement>(null);
  const { isOffline, hasUpdate, updateApp, dismissUpdate } = usePWA();

  // Actualizar centro del mapa cuando se carga la ubicación inteligente
  useEffect(() => {
    if (initialLocation && !locationLoading) {
      setMapCenter(initialLocation.coordinates);
      setMapZoom(initialLocation.zoom);

      if (initialLocation.source !== "Ubicación por defecto (Madrid)") {
        setShowLocationInfo(true);
        setTimeout(() => setShowLocationInfo(false), 5000);
      }
    }
  }, [initialLocation, locationLoading]);

  const getCurrentLocation = useCallback(() => {
    if (!("geolocation" in navigator) || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCurrentLocation(newLocation);
        updateLastKnownLocation(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.warn("Could not get current location:", error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, [updateLastKnownLocation]);

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

  const handleLocationSaved = useCallback((newLocation: CarLocation) => {
    setLocations((prev) => [newLocation, ...prev]);
    setMapCenter([newLocation.latitude, newLocation.longitude]);
    setMapZoom(15);
    setSelectedLocationId(newLocation.id);
    LocationManager.saveLastKnownLocation(newLocation.latitude, newLocation.longitude, "saved_location");
  }, []);

  const handleLocationDeleted = useCallback((id: string) => {
    setLocations((prev) => prev.filter((location) => location.id !== id));
    setSelectedLocationId((prevSelected) => (prevSelected === id ? undefined : prevSelected));
    timerManager.cancelTimer(id);
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

  // 🚀 NUEVO: Handler para cambios en el mapa unificado
  const handleMapCenterChange = useCallback(
    (center: [number, number], zoom: number) => {
      setMapCenter(center);
      setMapZoom(zoom);
      updateLastKnownLocation(center[0], center[1]);
    },
    [updateLastKnownLocation]
  );

  // 🚀 NUEVO: Handler para clic en ubicación en el mapa
  const handleMapLocationClick = useCallback((location: CarLocation) => {
    setSelectedLocationId(location.id);
    // Podrías añadir aquí lógica adicional como mostrar detalles
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
        {/* 🚀 NUEVO: LocationSaver simplificado con mapa integrado */}
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
      onTimerExtend: handleTimerExtend,
      onTimerCancel: handleTimerCancel,
      onLocationUpdated: handleLocationUpdated,
      sortBy: preferences.sortBy,
      showAll: preferences.showAll,
      onSortChange: (sortBy: "date" | "note") => handlePreferencesChange({ ...preferences, sortBy }),
      onShowAllChange: (showAll: boolean) => handlePreferencesChange({ ...preferences, showAll }),
    }),
    [
      locations,
      handleLocationDeleted,
      handleLocationSelected,
      handleNavigateToLocation,
      handleTimerExtend,
      handleTimerCancel,
      handleLocationUpdated,
      preferences.sortBy,
      preferences.showAll,
      handlePreferencesChange,
      preferences,
    ]
  );

  const mainContent = useMemo(
    () => (
      <>
        {currentView === "map" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 ref={mapSectionRef} className="text-xl font-semibold">
                🗺️ Mapa de ubicaciones
              </h2>

              {initialLocation && initialLocation.source !== "Ubicación por defecto (Madrid)" && (
                <Badge variant="outline" className="text-xs">
                  {initialLocation.source}
                </Badge>
              )}
            </div>

            {/* 🚀 MAPA UNIFICADO PRINCIPAL */}
            <div>
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
      initialLocation,
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
      setGlobalError("Error al cargar la aplicación.");
    }
  }, [getCurrentLocation, checkLocationPermissions, locationLoading, initialLocation]);

  // Loading mientras se carga la ubicación inteligente
  if (locationLoading) {
    return (
      <ThemeProvider defaultTheme={preferences.theme} storageKey="car-location-theme">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="w-full max-w-md mx-auto">
            <CardContent className="p-6 text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <div>
                <h3 className="text-lg font-semibold">Cargando aplicación</h3>
                <p className="text-sm text-muted-foreground">Determinando la mejor ubicación inicial...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme={preferences.theme} storageKey="car-location-theme">
      <OfflineIndicator isOffline={isOffline} />
      <UpdateNotification isVisible={hasUpdate} onUpdate={updateApp} onDismiss={dismissUpdate} />

      {/* Notificación sobre el origen de la ubicación */}
      {showLocationInfo && initialLocation && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
          <Alert className="shadow-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="pr-8 text-blue-800 dark:text-blue-200">
              <strong>Ubicación detectada:</strong> {initialLocation.source}
            </AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-6 w-6 p-0 text-blue-600"
              onClick={() => setShowLocationInfo(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        </div>
      )}

      {globalError && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
          <Alert variant="destructive" className="shadow-lg">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="pr-8">{globalError}</AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-6 w-6 p-0"
              onClick={handleGlobalErrorDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        </div>
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
