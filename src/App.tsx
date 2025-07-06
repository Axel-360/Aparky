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
import { NotificationSetupBasic } from "@/components/NotificationSetupBasic";
import { unifiedNotificationSystem } from "@/utils/unifiedNotificationSystem";

//import { NotificationSetup } from "@/components/NotificationSetup";

import type { CarLocation, UserPreferences } from "./types/location";
import { getCarLocations, updateCarLocation, saveCarLocation, deleteCarLocation } from "./utils/storage";
import { getUserPreferences, initializeTheme } from "./utils/preferences";
import { timerManager } from "./utils/timerManager";
import { useSmartLocation } from "./utils/locationDefaults";
import { toast } from "sonner";

// 🔥 NUEVOS IMPORTS para sistema de notificaciones mejorado
//import { notificationManager } from "./utils/notificationManager";
//import { mobileNotificationHelper } from "./utils/mobileNotificationHelper";

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
  const [showLocationPermissions, setShowLocationPermissions] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<CarLocation | null>(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // PWA
  const { isOffline, hasUpdate, updateApp, dismissUpdate } = usePWA();

  // Referencias
  const mapSectionRef = useRef<HTMLDivElement>(null);

  // Handlers principales
  const handleLocationSaved = useCallback(
    (location: CarLocation) => {
      console.log("💾 Guardando ubicación con sistema mejorado:", location.note || location.id);

      try {
        saveCarLocation(location);
        setLocations((prev) => [location, ...prev]);

        // 🔥 MEJORADO: Programar timer con sistema robusto
        if (location.expiryTime && location.expiryTime > Date.now()) {
          console.log("⏰ Programando timer para nueva ubicación...");

          timerManager.scheduleTimer(location).catch((timerError) => {
            console.error("❌ Error programando timer:", timerError);
            // Continuar sin timer si falla
          });
        }

        updateLastKnownLocation(location.latitude, location.longitude);
        setMapCenter([location.latitude, location.longitude]);
        setMapZoom(15);
        setSelectedLocationId(location.id);

        toast.success("Ubicación guardada correctamente");
      } catch (error) {
        console.error("❌ Error guardando ubicación:", error);
        toast.error("Error al guardar la ubicación");
        setGlobalError("No se pudo guardar la ubicación");
      }
    },
    [updateLastKnownLocation]
  );

  const handleLocationUpdated = useCallback(
    (id: string, updates: Partial<CarLocation>) => {
      try {
        updateCarLocation(id, updates);
        setLocations((prev) => prev.map((loc) => (loc.id === id ? { ...loc, ...updates } : loc)));

        // 🔥 MEJORADO: Re-programar timer si es necesario
        if (updates.expiryTime) {
          const location = locations.find((loc) => loc.id === id);
          if (location) {
            const updatedLocation = { ...location, ...updates };
            timerManager.scheduleTimer(updatedLocation).catch((error) => {
              console.error("❌ Error re-programando timer:", error);
            });
          }
        }

        toast.success("Ubicación actualizada");
      } catch (error) {
        console.error("Error updating location:", error);
        toast.error("Error al actualizar la ubicación");
      }
    },
    [locations]
  );

  const handleLocationDeleted = useCallback(
    (locationId: string) => {
      try {
        // Encontrar la ubicación para obtener la información completa
        const location = locations.find((loc) => loc.id === locationId);
        if (!location) {
          console.error("Ubicación no encontrada:", locationId);
          return;
        }

        deleteCarLocation(locationId);
        setLocations((prev) => prev.filter((loc) => loc.id !== locationId));

        // 🔥 MEJORADO: Cancelar timer con sistema completo
        timerManager.cancelTimer(locationId);

        if (selectedLocationId === locationId) {
          setSelectedLocationId(undefined);
        }
        toast.success("Ubicación eliminada");
      } catch (error) {
        console.error("Error deleting location:", error);
        toast.error("Error al eliminar la ubicación");
      }
    },
    [locations, selectedLocationId]
  );

  // 🔥 NUEVO: Handler para extensión de timers mejorado
  const handleTimerExtend = useCallback(
    async (locationId: string, minutes: number) => {
      try {
        console.log(`⏰ Extendiendo timer ${locationId} por ${minutes} minutos`);

        const location = locations.find((loc) => loc.id === locationId);
        if (!location || !location.expiryTime) {
          throw new Error("Ubicación no encontrada o sin timer");
        }

        // Usar método de extensión del timerManager
        await timerManager.extendTimer(locationId, minutes, location);

        // Actualizar estado local
        const newExpiryTime = location.expiryTime + minutes * 60000;
        const newExtensionCount = (location.extensionCount || 0) + 1;

        const updates = {
          expiryTime: newExpiryTime,
          extensionCount: newExtensionCount,
        };

        // Actualizar storage y estado
        updateCarLocation(locationId, updates);
        setLocations((prev) => prev.map((loc) => (loc.id === locationId ? { ...loc, ...updates } : loc)));

        toast.success(`Timer extendido ${minutes} minutos`);
        console.log("✅ Timer extendido exitosamente");
      } catch (error) {
        console.error("❌ Error extendiendo timer:", error);
        toast.error("Error al extender el timer");
      }
    },
    [locations]
  );

  // 🔥 NUEVO: Handler para cancelación de timers mejorado
  const handleTimerCancel = useCallback(async (locationId: string) => {
    try {
      console.log(`❌ Cancelando timer: ${locationId}`);

      // Cancelar timer
      timerManager.cancelTimer(locationId);

      // Actualizar storage
      const updates = {
        expiryTime: undefined,
        reminderMinutes: undefined,
        extensionCount: undefined,
      };

      updateCarLocation(locationId, updates);

      // Actualizar estado
      setLocations((prev) => prev.map((loc) => (loc.id === locationId ? { ...loc, ...updates } : loc)));

      toast.success("Timer cancelado");
      console.log("✅ Timer cancelado exitosamente");
    } catch (error) {
      console.error("❌ Error cancelando timer:", error);
      toast.error("Error al cancelar el timer");
    }
  }, []);

  const handleLocationSelected = useCallback((location: CarLocation) => {
    setMapCenter([location.latitude, location.longitude]);
    setMapZoom(15);
    setSelectedLocationId(location.id);
    setCurrentView("map");
  }, []);

  const handleShowOnMap = useCallback(
    (locations: CarLocation[]) => {
      if (locations.length > 0) {
        const location = locations[0]; // Tomar la primera ubicación
        handleLocationSelected(location);
        if (mapSectionRef.current) {
          mapSectionRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }
    },
    [handleLocationSelected]
  );

  const handleMapLocationClick = useCallback((location: CarLocation) => {
    setSelectedLocationId(location.id);
  }, []);

  const handleMapCenterChange = useCallback((center: [number, number], zoom: number) => {
    setMapCenter(center);
    setMapZoom(zoom);
  }, []);

  const handleNavigateToLocation = useCallback((location: CarLocation) => {
    setNavigationTarget(location);
    setShowLocationPermissions(true);
  }, []);

  const handlePermissionGranted = useCallback(() => {
    setLocationPermissionGranted(true);
    setShowLocationPermissions(false);
    setShowNavigation(true);
  }, []);

  const handlePermissionDenied = useCallback(() => {
    setShowLocationPermissions(false);
    setNavigationTarget(null);
    toast.error("Se necesitan permisos de ubicación para la navegación");
  }, []);

  const closeNavigation = useCallback(() => {
    setShowNavigation(false);
    setNavigationTarget(null);
    setLocationPermissionGranted(false);
  }, []);

  const handlePreferencesChange = useCallback((newPreferences: UserPreferences) => {
    setPreferences(newPreferences);
  }, []);

  const showSettingsHandler = useCallback(() => setShowSettings(true), []);
  const hideSettingsHandler = useCallback(() => setShowSettings(false), []);
  const showStatsHandler = useCallback(() => setShowStats(true), []);
  const hideStatsHandler = useCallback(() => setShowStats(false), []);

  const handleGlobalErrorDismiss = useCallback(() => {
    setGlobalError(null);
  }, []);

  const getCurrentLocation = useCallback(async () => {
    if ("geolocation" in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000,
          });
        });

        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });
        updateLastKnownLocation(latitude, longitude);
      } catch (error) {
        console.log("Could not get current location:", error);
      }
    }
  }, [updateLastKnownLocation]);

  const checkLocationPermissions = useCallback(async () => {
    if ("permissions" in navigator) {
      try {
        const result = await navigator.permissions.query({ name: "geolocation" as PermissionName });
        setLocationPermissionGranted(result.state === "granted");
      } catch (error) {
        console.log("Could not check location permissions:", error);
      }
    }
  }, []);

  // Props computadas
  const headerProps = useMemo(
    () => ({
      currentView,
      onViewChange: setCurrentView,
      onShowStats: showStatsHandler,
      onShowSettings: showSettingsHandler,
    }),
    [currentView, showStatsHandler, showSettingsHandler]
  );

  const savedLocationsProps = useMemo(
    () => ({
      locations,
      onLocationSelected: handleLocationSelected,
      onLocationUpdated: handleLocationUpdated,
      onLocationDeleted: handleLocationDeleted,
      onNavigateToLocation: handleNavigateToLocation,
      onTimerExtend: handleTimerExtend,
      onTimerCancel: handleTimerCancel,
      sortBy: preferences.sortBy,
      showAll: preferences.showAll,
      onSortChange: (sortBy: "date" | "note") => handlePreferencesChange({ ...preferences, sortBy }),
      onShowAllChange: (showAll: boolean) => handlePreferencesChange({ ...preferences, showAll }),
    }),
    [
      locations,
      handleLocationSelected,
      handleLocationUpdated,
      handleLocationDeleted,
      handleNavigateToLocation,
      handleTimerExtend,
      handleTimerCancel,
      preferences,
      handlePreferencesChange,
    ]
  );

  const sidebarContent = useMemo(
    () => (
      <>
        <LocationSaver onLocationSaved={handleLocationSaved} autoSave={preferences.autoSave} />
        <TimerDashboard locations={locations} onLocationUpdated={handleLocationUpdated} />
      </>
    ),
    [handleLocationSaved, preferences.autoSave, locations, handleLocationUpdated]
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

  // 🔥 MEJORADO: useEffect de inicialización con sistema completo de notificaciones
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("🚀 Iniciando aplicación con sistema mejorado...");

        // 1. Inicializar tema
        initializeTheme();

        // 🔥 NUEVO: 2. Inicializar sistema completo de notificaciones
        const initializeNotifications = async () => {
          try {
            console.log("🔔 Inicializando sistema completo de notificaciones...");

            // Inicializar sistema principal
            //const mainSystemReady = await notificationManager.initialize();
            //console.log("📱 Sistema principal:", mainSystemReady ? "✅ Listo" : "❌ Falló");

            // El mobile helper se inicializa automáticamente
            //const mobileDebugInfo = mobileNotificationHelper.getDebugInfo() as any;
            //console.log("📱 Sistema móvil:", mobileDebugInfo.hasServiceWorker ? "✅ Listo" : "⚠️ Limitado");

            // Log completo del estado
            // console.log("🔧 Estado completo de notificaciones:", {
            //  principal: mainSystemReady,
            // móvil: true,
            // serviceworker: mobileDebugInfo.hasServiceWorker,
            // permisos: notificationManager.getPermissionStatus(),
            // dispositivo: {
            //   iOS: mobileDebugInfo.isIOS,
            //   Android: mobileDebugInfo.isAndroid,
            //   standalone: mobileDebugInfo.isStandalone,
            //  },
            // });

            // return mainSystemReady || true; // Considerar éxito si al menos el móvil funciona
            console.log("📱 Usando solo sistema unificado");
            return true;
          } catch (error) {
            console.error("❌ Error inicializando notificaciones:", error);
            return false;
          }
        };

        // 3. Inicializar notificaciones
        const notificationsReady = await initializeNotifications();
        if (!notificationsReady) {
          console.warn("⚠️ Sistema de notificaciones con problemas, pero la app continuará");
        }

        // 4. Cargar ubicaciones guardadas
        const savedLocations = getCarLocations();
        setLocations(savedLocations);
        console.log(`📍 Cargadas ${savedLocations.length} ubicaciones`);

        // 🔥 MEJORADO: 5. Sincronizar timers con sistema robusto
        if (savedLocations.length > 0) {
          console.log("⏰ Sincronizando timers con sistema mejorado...");

          try {
            // Usar el nuevo método de sincronización
            await timerManager.syncWithSavedLocations(savedLocations);
            console.log("✅ Timers sincronizados exitosamente");
          } catch (error) {
            console.error("❌ Error sincronizando timers:", error);

            // Fallback - sincronizar de forma individual
            console.log("🔄 Intentando sincronización individual...");
            const activeLocations = savedLocations.filter(
              (location) => location.expiryTime && location.expiryTime > Date.now()
            );

            for (const location of activeLocations) {
              try {
                await timerManager.scheduleTimer(location);
                console.log(`✅ Timer individual sincronizado: ${location.note || location.id}`);
              } catch (individualError) {
                console.error(`❌ Error timer individual ${location.id}:`, individualError);
              }
            }
          }
        }

        // 6. Configurar mapa inicial
        if (!locationLoading && savedLocations.length > 0 && !initialLocation) {
          setMapCenter([savedLocations[0].latitude, savedLocations[0].longitude]);
          setMapZoom(15);
          console.log("🗺️ Mapa centrado en primera ubicación");
        }

        // 7. Obtener ubicación actual
        getCurrentLocation();
        checkLocationPermissions();

        // 🔥 NUEVO: 8. Configurar listeners de eventos móviles
        setupMobileEventListeners();

        console.log("🎉 Aplicación inicializada completamente");
      } catch (error) {
        console.error("❌ Error crítico inicializando app:", error);
        setGlobalError("Error al cargar la aplicación. Por favor, recarga la página.");
      }
    };

    // 🔥 NUEVO: Función para configurar listeners específicos de móviles
    const setupMobileEventListeners = () => {
      try {
        // Listener para cuando la app vuelve del background
        window.addEventListener("focus", async () => {
          console.log("📱 App volvió al foco - verificando notificaciones perdidas");

          try {
            const locations = getCarLocations();
            const activeLocations = locations.filter(
              (location) => location.expiryTime && location.expiryTime > Date.now()
            );

            if (activeLocations.length > 0) {
              console.log(`🔄 Re-sincronizando ${activeLocations.length} timers activos`);
              await timerManager.syncWithSavedLocations(locations);
            }
          } catch (error) {
            console.error("❌ Error sincronizando al volver al foco:", error);
          }
        });

        // Listener para clicks en notificaciones
        window.addEventListener("notificationClick", (event: any) => {
          console.log("🔔 Notificación clickeada desde SW:", event.detail);
        });

        // Listener para fallos de notificación
        window.addEventListener("notificationFailed", (event: any) => {
          console.warn("⚠️ Notificación falló:", event.detail);
        });

        console.log("📱 Event listeners móviles configurados");
      } catch (error) {
        console.error("❌ Error configurando listeners móviles:", error);
      }
    };

    // Cleanup function mejorada
    const cleanup = () => {
      try {
        unifiedNotificationSystem.cleanup();
        console.log("🧹 Mobile helper limpiado");
      } catch (error) {
        console.error("❌ Error en cleanup:", error);
      }
    };

    // Inicializar la app
    initializeApp();

    // Cleanup al desmontar
    return cleanup;
  }, [getCurrentLocation, checkLocationPermissions, locationLoading, initialLocation]);

  // 🔥 NUEVO: useEffect para debug en desarrollo
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const debugInterval = setInterval(() => {
        console.log("🔍 DEBUG - Estado de la aplicación:");
        console.log("  - Timers:", timerManager.getTimerInfo());
      }, 60000); // Cada minuto en desarrollo

      return () => clearInterval(debugInterval);
    }
  }, []);

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

      {/* NUEVO: Sistema de notificaciones mejorado */}
      <ErrorBoundary>
        <NotificationSetupBasic />
      </ErrorBoundary>

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

// 🔥 NUEVO: Función de test para debugging (disponible globalmente en desarrollo)
if (process.env.NODE_ENV === "development") {
  (window as any).testNotificationSystem = async () => {
    try {
      console.log("🧪 Iniciando test completo del sistema");

      // Test del timer manager
      await timerManager.testTimerSystem();

      alert("Tests completados - revisa la consola para ver los resultados");
    } catch (error) {
      console.error("❌ Error en tests:", error);
      alert("Error en tests del sistema");
    }
  };
}

export default App;
