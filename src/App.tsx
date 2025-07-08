// src/App.tsx - VERSIÓN COMPLETA FINAL CON MANEJO DE ERRORES CRÍTICOS
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
import { NotificationSetup } from "@/components/notifications/NotificationSetup";

// Contexto y hooks
import { AppProvider } from "./contexts/AppContext";
import { useGeolocation } from "./features/location/hooks/useGeolocation";

// Tipos y utilidades
import type { CarLocation, UserPreferences } from "./types/location";
import { getCarLocations, updateCarLocation, saveCarLocation, deleteCarLocation } from "./utils/storage";
import { getUserPreferences, initializeTheme } from "./utils/preferences";
import { timerManager } from "./utils/timerManager";
import { unifiedNotificationSystem } from "@/utils/unifiedNotificationSystem";
import { useSmartLocation } from "./utils/locationDefaults";
import { toast } from "sonner";

// 🔥 DECLARACIÓN GLOBAL SEGURA
declare global {
  interface Window {
    timerManager?: typeof timerManager;
    unifiedNotificationSystem?: typeof unifiedNotificationSystem;
    notificationManager?: any;
    testNotificationSystem?: () => Promise<void>;
  }
}

// 🔥 EXPOSICIÓN GLOBAL SEGURA
if (typeof window !== "undefined") {
  try {
    window.timerManager = timerManager;
    window.unifiedNotificationSystem = unifiedNotificationSystem;
    console.log("🔧 TimerManager y UnifiedNotificationSystem expuestos globalmente");
  } catch (exposureError) {
    console.error("❌ Error exponiendo sistemas globalmente:", exposureError);
  }
}

function AppContent() {
  // 🚨 VERIFICACIONES DE SEGURIDAD AL INICIO
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Estados principales
  const [locations, setLocations] = useState<CarLocation[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.4168, -3.7038]);
  const [mapZoom, setMapZoom] = useState<number>(13);
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

  // PWA hooks
  const { isOffline, hasUpdate, updateApp, dismissUpdate } = usePWA();

  // 🔥 VERIFICACIONES SEGURAS DE DEPENDENCIAS
  const { initialLocation, isLoading: locationLoading, updateLastKnownLocation } = useSmartLocation();

  // Hook de geolocalización con manejo seguro
  const geoHook = useGeolocation();
  const { latitude, longitude, loading: isGeoLoading, getCurrentPosition: getCurrentLocation } = geoHook;

  // Crear currentLocation a partir de latitude/longitude
  const geoCurrentLocation = useMemo(() => {
    if (latitude !== null && longitude !== null) {
      return { latitude, longitude };
    }
    return null;
  }, [latitude, longitude]);

  // Función para verificar permisos de geolocalización
  const checkLocationPermissions = useCallback(() => {
    try {
      if ("geolocation" in navigator) {
        navigator.permissions
          ?.query({ name: "geolocation" })
          .then((result) => {
            console.log("Permiso de geolocalización:", result.state);
          })
          .catch(() => {
            console.log("No se pueden verificar permisos de geolocalización");
          });
      }
    } catch (error) {
      console.error("Error verificando permisos:", error);
    }
  }, []);

  // Referencias para scroll
  const mapSectionRef = useRef<HTMLDivElement>(null);

  // 🚨 VERIFICACIÓN DE DEPENDENCIAS CRÍTICAS
  useEffect(() => {
    const verifyDependencies = async () => {
      try {
        console.log("🔍 Verificando dependencias críticas...");

        // Verificar funciones esenciales
        if (typeof getCarLocations !== "function") {
          throw new Error("getCarLocations no está disponible");
        }

        if (!timerManager || typeof timerManager.scheduleTimer !== "function") {
          throw new Error("timerManager no está completamente disponible");
        }

        if (!unifiedNotificationSystem || typeof unifiedNotificationSystem.cleanup !== "function") {
          console.warn("⚠️ unifiedNotificationSystem no completamente disponible - usando fallback");
        }

        console.log("✅ Dependencias críticas verificadas");
        setIsInitialized(true);
      } catch (verificationError) {
        console.error("❌ Error en verificación de dependencias:", verificationError);
        setInitError(
          `Error de dependencias: ${
            verificationError instanceof Error ? verificationError.message : "Error desconocido"
          }`
        );
      }
    };

    verifyDependencies();
  }, []);

  // 🔥 LISTENER PARA NOTIFICACIONES DE RESPALDO
  useEffect(() => {
    if (!isInitialized) return;

    const handleParkingExpiredFallback = (event: CustomEvent) => {
      try {
        const { locationNote, message } = event.detail;

        console.log("🆘 Recibido evento de parking expirado:", event.detail);

        toast.error(message, {
          duration: 10000,
          position: "top-center",
          style: {
            backgroundColor: "#dc2626",
            color: "white",
            fontSize: "16px",
            fontWeight: "bold",
          },
        });

        setTimeout(() => {
          if (confirm(`⏰ PARKING EXPIRADO\n\n${locationNote}\n\nEl tiempo ha terminado. ¿Abrir la aplicación?`)) {
            window.focus();
          }
        }, 1000);
      } catch (error) {
        console.error("Error manejando evento de parking expirado:", error);
      }
    };

    window.addEventListener("parkingExpiredFallback", handleParkingExpiredFallback as EventListener);

    return () => {
      window.removeEventListener("parkingExpiredFallback", handleParkingExpiredFallback as EventListener);
    };
  }, [isInitialized]);

  // Sincronizar ubicación actual con el hook de geolocalización
  useEffect(() => {
    if (!isInitialized) return;

    if (geoCurrentLocation) {
      setCurrentLocation(geoCurrentLocation);
      try {
        updateLastKnownLocation(geoCurrentLocation.latitude, geoCurrentLocation.longitude);
      } catch (error) {
        console.error("Error actualizando última ubicación conocida:", error);
      }
    }
  }, [geoCurrentLocation, updateLastKnownLocation, isInitialized]);

  // Handlers para UI
  const showSettingsHandler = useCallback(() => setShowSettings(true), []);
  const hideSettingsHandler = useCallback(() => setShowSettings(false), []);
  const showStatsHandler = useCallback(() => setShowStats(true), []);
  const hideStatsHandler = useCallback(() => setShowStats(false), []);
  const closeNavigation = useCallback(() => setShowNavigation(false), []);
  const handleGlobalErrorDismiss = useCallback(() => setGlobalError(null), []);

  const handlePreferencesChange = useCallback((newPreferences: UserPreferences) => {
    setPreferences(newPreferences);
  }, []);

  const handleLocationSaved = useCallback(
    async (newLocation: CarLocation) => {
      try {
        console.log("💾 Guardando nueva ubicación:", newLocation);

        saveCarLocation(newLocation);
        setLocations((prev) => [...prev, newLocation]);

        if (newLocation.expiryTime) {
          console.log("⏰ Programando timer para nueva ubicación");
          await timerManager.scheduleTimer(newLocation);
        }

        if (!newLocation.isManualPlacement && currentLocation) {
          updateLastKnownLocation(currentLocation.latitude, currentLocation.longitude);
        }

        toast.success("📍 Ubicación guardada");
      } catch (error) {
        console.error("Error saving location:", error);
        toast.error("Error al guardar la ubicación");
      }
    },
    [currentLocation, updateLastKnownLocation]
  );

  const handleLocationUpdate = useCallback(
    async (id: string, updates: Partial<CarLocation>) => {
      try {
        console.log(`📝 Actualizando ubicación ${id}:`, updates);

        updateCarLocation(id, updates);
        setLocations((prev) => prev.map((loc) => (loc.id === id ? { ...loc, ...updates } : loc)));

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
        const location = locations.find((loc) => loc.id === locationId);
        if (!location) {
          console.error("Ubicación no encontrada:", locationId);
          return;
        }

        deleteCarLocation(locationId);
        setLocations((prev) => prev.filter((loc) => loc.id !== locationId));

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

  const handleTimerExtend = useCallback(
    async (locationId: string, minutes: number) => {
      try {
        console.log(`⏰ Extendiendo timer ${locationId} por ${minutes} minutos`);

        const location = locations.find((loc) => loc.id === locationId);
        if (!location || !location.expiryTime) {
          throw new Error("Ubicación no encontrada o sin timer");
        }

        await timerManager.extendTimer(locationId, minutes, location);

        const newExpiryTime = location.expiryTime + minutes * 60000;
        const newExtensionCount = (location.extensionCount || 0) + 1;

        const updates = {
          expiryTime: newExpiryTime,
          extensionCount: newExtensionCount,
        };

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

  const handleTimerCancel = useCallback(async (locationId: string) => {
    try {
      console.log(`❌ Cancelando timer: ${locationId}`);

      timerManager.cancelTimer(locationId);

      const updates = {
        expiryTime: undefined,
        reminderMinutes: undefined,
        extensionCount: undefined,
      };

      updateCarLocation(locationId, updates);
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
        const location = locations[0];
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

  // Props memoizados
  const headerProps = useMemo(
    () => ({
      currentView,
      onViewChange: setCurrentView,
      onShowSettings: showSettingsHandler,
      onShowStats: showStatsHandler,
      theme: preferences.theme,
    }),
    [currentView, showSettingsHandler, showStatsHandler, preferences.theme]
  );

  const locationSaverProps = useMemo(
    () => ({
      onLocationSaved: handleLocationSaved,
      currentLocation,
      mapCenter,
      isLoading: isGeoLoading,
      autoSave: preferences.autoSave || false,
    }),
    [handleLocationSaved, currentLocation, mapCenter, isGeoLoading, preferences.autoSave]
  );

  const timerDashboardProps = useMemo(
    () => ({
      locations,
      onTimerExtend: handleTimerExtend,
      onTimerCancel: handleTimerCancel,
      onNavigateToLocation: handleNavigateToLocation,
    }),
    [locations, handleTimerExtend, handleTimerCancel, handleNavigateToLocation]
  );

  const savedLocationsProps = useMemo(
    () => ({
      locations,
      selectedLocationId,
      onLocationUpdated: handleLocationUpdate,
      onLocationDeleted: handleLocationDeleted,
      onLocationSelected: handleLocationSelected,
      onNavigateToLocation: handleNavigateToLocation,
      sortBy: preferences.sortBy || "date",
      showAll: preferences.showAll || true,
      onSortChange: (sortBy: "date" | "note") => {
        const newPrefs = { ...preferences, sortBy };
        setPreferences(newPrefs);
        handlePreferencesChange(newPrefs);
      },
      onShowAllChange: (showAll: boolean) => {
        const newPrefs = { ...preferences, showAll };
        setPreferences(newPrefs);
        handlePreferencesChange(newPrefs);
      },
      dateFilter: "all" as const,
      onDateFilterChange: (filter: "all" | "today" | "week" | "month") => {
        console.log("Date filter changed:", filter);
      },
      onTimerExtend: handleTimerExtend,
      onTimerCancel: handleTimerCancel,
    }),
    [
      locations,
      selectedLocationId,
      handleLocationUpdate,
      handleLocationDeleted,
      handleLocationSelected,
      handleNavigateToLocation,
      preferences,
      handlePreferencesChange,
      handleTimerExtend,
      handleTimerCancel,
    ]
  );

  // Contenido del sidebar
  const sidebarContent = useMemo(
    () => (
      <>
        <LocationSaver {...locationSaverProps} />
        <TimerDashboard {...timerDashboardProps} />
      </>
    ),
    [locationSaverProps, timerDashboardProps]
  );

  // Contenido principal
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

  // 🚨 INICIALIZACIÓN PRINCIPAL CON MANEJO DE ERRORES MEJORADO
  useEffect(() => {
    if (!isInitialized) return;

    const initializeApp = async () => {
      try {
        console.log("🚀 Iniciando aplicación con manejo de errores mejorado...");

        // 1. Inicializar tema
        try {
          initializeTheme();
          console.log("✅ Tema inicializado");
        } catch (themeError) {
          console.error("❌ Error inicializando tema:", themeError);
        }

        // 2. Cargar ubicaciones guardadas
        try {
          const savedLocations = getCarLocations();
          setLocations(savedLocations);
          console.log(`📍 Cargadas ${savedLocations.length} ubicaciones`);

          // 3. Sincronizar timers
          if (savedLocations.length > 0) {
            console.log("⏰ Sincronizando timers...");

            try {
              await timerManager.syncWithSavedLocations(savedLocations);
              console.log("✅ Timers sincronizados exitosamente");
            } catch (timerError) {
              console.error("❌ Error sincronizando timers:", timerError);

              // Fallback seguro
              try {
                console.log("🔄 Intentando sincronización individual segura...");
                const activeLocations = savedLocations.filter(
                  (location) => location.expiryTime && location.expiryTime > Date.now()
                );

                for (const location of activeLocations) {
                  try {
                    await timerManager.scheduleTimer(location);
                    console.log(`✅ Timer individual: ${location.note || location.id}`);
                  } catch (individualError) {
                    console.error(`❌ Error timer individual ${location.id}:`, individualError);
                  }
                }
              } catch (fallbackError) {
                console.error("❌ Error en fallback de timers:", fallbackError);
              }
            }
          }
        } catch (locationError) {
          console.error("❌ Error cargando ubicaciones:", locationError);
          setLocations([]);
        }

        // 4. Configurar mapa inicial
        try {
          if (!locationLoading && locations.length > 0 && !initialLocation) {
            setMapCenter([locations[0].latitude, locations[0].longitude]);
            setMapZoom(15);
            console.log("🗺️ Mapa centrado en primera ubicación");
          }
        } catch (mapError) {
          console.error("❌ Error configurando mapa:", mapError);
        }

        // 5. Obtener ubicación actual
        try {
          if (getCurrentLocation) {
            getCurrentLocation();
          }
          checkLocationPermissions();
          console.log("📍 Geolocalización inicializada");
        } catch (geoError) {
          console.error("❌ Error con geolocalización:", geoError);
        }

        // 6. Configurar listeners móviles
        try {
          setupMobileEventListeners();
          console.log("📱 Event listeners configurados");
        } catch (listenerError) {
          console.error("❌ Error configurando listeners:", listenerError);
        }

        console.log("🎉 Aplicación inicializada completamente");
      } catch (criticalError) {
        console.error("❌ Error crítico inesperado:", criticalError);
        console.error("Stack trace:", criticalError instanceof Error ? criticalError.stack : "No stack available");

        const errorMessage =
          criticalError instanceof Error
            ? `Error: ${criticalError.message}`
            : "Error desconocido al inicializar la aplicación";

        setGlobalError(`${errorMessage}. Por favor, recarga la página.`);
      }
    };

    const setupMobileEventListeners = () => {
      try {
        const handleFocus = async () => {
          try {
            console.log("📱 App volvió al foco");
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
        };

        const handleNotificationClick = (event: any) => {
          try {
            console.log("🔔 Notificación clickeada:", event.detail);
          } catch (error) {
            console.error("❌ Error manejando click de notificación:", error);
          }
        };

        const handleNotificationFailed = (event: any) => {
          try {
            console.warn("⚠️ Notificación falló:", event.detail);
          } catch (error) {
            console.error("❌ Error manejando fallo de notificación:", error);
          }
        };

        window.addEventListener("focus", handleFocus);
        window.addEventListener("notificationClick", handleNotificationClick);
        window.addEventListener("notificationFailed", handleNotificationFailed);

        console.log("📱 Event listeners móviles configurados");
      } catch (error) {
        console.error("❌ Error configurando listeners móviles:", error);
      }
    };

    const cleanup = () => {
      try {
        if (unifiedNotificationSystem && typeof unifiedNotificationSystem.cleanup === "function") {
          unifiedNotificationSystem.cleanup();
          console.log("🧹 Sistema unificado limpiado");
        }
      } catch (error) {
        console.error("❌ Error en cleanup:", error);
      }
    };

    // Inicializar con manejo de errores extra
    try {
      initializeApp().catch((asyncError) => {
        console.error("❌ Error en función async de inicialización:", asyncError);
        setGlobalError("Error async al inicializar. Por favor, recarga la página.");
      });
    } catch (syncError) {
      console.error("❌ Error síncrono al inicializar:", syncError);
      setGlobalError("Error síncrono al inicializar. Por favor, recarga la página.");
    }

    return cleanup;
  }, [isInitialized, locationLoading, initialLocation, locations.length]);

  // useEffect para debug en desarrollo
  useEffect(() => {
    if (!isInitialized) return;

    if (process.env.NODE_ENV === "development") {
      const debugInterval = setInterval(() => {
        console.log("🔍 DEBUG - Estado de la aplicación:");
        console.log("  - Timers:", timerManager.getTimerInfo());
      }, 60000);

      return () => clearInterval(debugInterval);
    }
  }, [isInitialized]);

  // Actualizar mapa cuando cambie initialLocation
  useEffect(() => {
    if (!isInitialized) return;

    if (initialLocation && !locationLoading) {
      setMapCenter(initialLocation.coordinates);
      setMapZoom(initialLocation.zoom);
    }
  }, [initialLocation, locationLoading, isInitialized]);

  // Si hay error de inicialización, mostrar error temprano
  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-800 mb-4">Error de Inicialización</h1>
          <p className="text-red-600 mb-4">{initError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Recargar Aplicación
          </button>
        </div>
      </div>
    );
  }

  // Si no está inicializado, mostrar loading
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="where-is-it-theme">
      <UpdateNotification isVisible={hasUpdate} onUpdate={updateApp} onDismiss={dismissUpdate} />
      <OfflineIndicator isOffline={isOffline} />

      <ErrorBoundary>
        <NotificationSetup />
      </ErrorBoundary>

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
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

// 🔥 FUNCIÓN DE TEST GLOBAL SEGURA
if (typeof window !== "undefined") {
  window.testNotificationSystem = async () => {
    try {
      console.log("🧪 Iniciando test completo del sistema");
      if (timerManager && typeof timerManager.testTimerSystem === "function") {
        await timerManager.testTimerSystem();
        alert("Tests completados - revisa la consola para ver los resultados");
      } else {
        console.error("❌ timerManager.testTimerSystem no disponible");
        alert("Error: Sistema de test no disponible");
      }
    } catch (error) {
      console.error("❌ Error en tests:", error);
      alert("Error en tests del sistema");
    }
  };
}

export default App;
