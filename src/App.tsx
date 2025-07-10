// src/App.tsx - VERSIÓN COMPLETA MODIFICADA: Sin notificaciones push, manteniendo UI
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Toaster } from "@/shared/ui/sonner";
import { ThemeProvider } from "@/shared/ui/theme-provider";
import { Alert, AlertDescription, Button } from "@/shared/ui";
import { AlertTriangle, X } from "lucide-react";
import { useUIState } from "@/hooks/useUIState";
import { useAppData } from "@/hooks/useAppData";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary/ErrorBoundary";
import { MainLayout } from "@/shared/components/Layout/Layout";

// Componentes PWA
import { InstallBanner } from "@/components/PWA/InstallBanner";
import { UpdateNotification } from "@/components/PWA/UpdateNotification";
import { OfflineIndicator } from "@/components/PWA/OfflineIndicator";
import { usePWA } from "@/hooks/usePWA";

// Componentes principales
import LocationSaver from "./features/location/components/LocationSaver";
import TimerDashboard from "./features/parking/components/TimerDashboard/TimerDashboard";
import { UnifiedMap } from "./features/location/components/UnifiedMap";
import SavedLocations from "./features/location/components/SavedLocations";
import ProximitySearch from "./features/location/components/ProximitySearch";
import Settings from "./shared/components/Settings/Settings";
import Stats from "./shared/components/Stats/Stats";
import Navigation from "./features/navigation/components/Navigation/Navigation";
import LocationPermissions from "./features/navigation/components/LocationPermissions/LocationPermissions";
// ELIMINADO: import { NotificationSetup } from "@/components/notifications/NotificationSetup";

// Contexto y hooks
import { AppProvider } from "./contexts/AppContext";
import { useGeolocation } from "./features/location/hooks/useGeolocation";

// Tipos y utilidades
import type { CarLocation } from "./types/location";
import { initializeTheme } from "./utils/preferences";
import { timerManager } from "./utils/timerManager";
import { useSmartLocation } from "./utils/locationDefaults";
import { toast } from "sonner";

// 🔥 DECLARACIÓN GLOBAL SIMPLIFICADA (sin notificaciones)
declare global {
  interface Window {
    timerManager?: typeof timerManager;
    testTimerSystem?: () => Promise<void>; // Solo test de timers
  }
}

// 🆕 CONFIGURAR CALLBACKS PARA MOSTRAR NOTIFICACIONES EN UI
const setupTimerCallbacks = () => {
  // Callback para cuando expira un parking
  timerManager.onTimerExpiration((locationId: string, locationNote: string) => {
    console.log(`🚨 Timer expirado - ejecutando callback UI: ${locationNote}`);

    toast.error(`🚨 Parking expirado: ${locationNote}`, {
      duration: 15000, // 15 segundos para que se vea bien
      position: "top-center",
      action: {
        label: "Ver ubicación",
        onClick: () => {
          console.log("Navegando a ubicación expirada:", locationId);
          // Aquí puedes añadir lógica para navegar al mapa o mostrar la ubicación
        },
      },
      style: {
        background: "#fef2f2",
        color: "#dc2626",
        border: "2px solid #fca5a5",
      },
    });
  });

  // Callback para recordatorios
  timerManager.onTimerReminder((locationId: string, locationNote: string, minutesLeft: number) => {
    console.log(`⏰ Recordatorio - ejecutando callback UI: ${locationNote}, ${minutesLeft} minutos`);

    toast.warning(`⏰ Recordatorio: ${locationNote} expira en ${minutesLeft} minutos`, {
      duration: 10000, // 10 segundos
      position: "top-center",
      action: {
        label: "Extender",
        onClick: () => {
          console.log("Extendiendo timer:", locationId);
          // Aquí puedes añadir lógica para extender el timer
        },
      },
      style: {
        background: "#fefce8",
        color: "#d97706",
        border: "2px solid #fde68a",
      },
    });
  });

  console.log("✅ Callbacks de timer configurados para mostrar en UI");
};

// 🔥 EXPOSICIÓN GLOBAL SEGURA (solo timerManager)
if (typeof window !== "undefined") {
  try {
    window.timerManager = timerManager;
    console.log("🔧 TimerManager expuesto globalmente");
  } catch (exposureError) {
    console.error("❌ Error exponiendo timerManager globalmente:", exposureError);
  }
}

function AppContent() {
  // 🔥 Hook consolidado de UI (FUNCIONA BIEN)
  const {
    currentView,
    showSettings,
    showStats,
    showNavigation,
    showLocationPermissions,
    navigationTarget,
    locationPermissionGranted,
    globalError,
    setCurrentView,
    showSettingsHandler,
    hideSettingsHandler,
    showStatsHandler,
    hideStatsHandler,
    startNavigation,
    closeNavigation,
    handlePermissionGranted,
    handlePermissionDenied,
    setGlobalError,
    handleGlobalErrorDismiss,
  } = useUIState();

  // 🚨 VERIFICACIONES DE SEGURIDAD AL INICIO
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Estado de ubicación actual (único estado que queda aquí)
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // PWA hooks
  const { isOffline, hasUpdate, updateApp, dismissUpdate } = usePWA();

  // 🔥 VERIFICACIONES SEGURAS DE DEPENDENCIAS
  const { initialLocation, isLoading: locationLoading, updateLastKnownLocation } = useSmartLocation();

  // Hook de geolocalización con manejo seguro
  const geoHook = useGeolocation();
  const { latitude, longitude, loading: isGeoLoading, getCurrentPosition: getCurrentLocation } = geoHook;

  // 🔥 Hook consolidado de datos (CORREGIDO)
  const {
    // Estados
    locations,
    preferences,
    selectedLocationId,
    mapCenter,
    mapZoom,
    // Handlers principales
    handleLocationSaved,
    handleLocationUpdate,
    handleLocationDeleted,
    handleLocationSelected,
    // Handlers de timers
    handleTimerExtend,
    handleTimerCancel,
    // Handlers de mapa
    handleMapLocationClick,
    handleMapCenterChange,
    // Handlers de preferencias
    handlePreferencesChange,
    updateSortPreference,
    updateShowAllPreference,
  } = useAppData(currentLocation, updateLastKnownLocation);

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

  // 🚨 VERIFICACIÓN DE DEPENDENCIAS CRÍTICAS (sin notificaciones)
  useEffect(() => {
    const verifyDependencies = async () => {
      try {
        console.log("🔍 Verificando dependencias críticas...");

        if (!timerManager || typeof timerManager.scheduleTimer !== "function") {
          throw new Error("timerManager no está completamente disponible");
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

  // 🔥 LISTENER PARA NOTIFICACIONES DE RESPALDO (simplificado)
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

  // Handler de navegación (usa startNavigation del hook UI)
  const handleNavigateToLocation = useCallback(
    async (location: CarLocation) => {
      try {
        if (!currentLocation) {
          getCurrentLocation?.();
          setGlobalError("Obteniendo tu ubicación actual...");
          return;
        }
        startNavigation(location);
      } catch (error) {
        console.error("Error iniciando navegación:", error);
        setGlobalError("Error al iniciar la navegación");
      }
    },
    [currentLocation, getCurrentLocation, startNavigation, setGlobalError]
  );

  // ✅ Handler con toast para permisos denegados
  const handlePermissionDeniedWithToast = useCallback(() => {
    handlePermissionDenied();
    toast.error("Se necesitan permisos de ubicación para la navegación");
  }, [handlePermissionDenied]);

  // Handler para mostrar en mapa con referencia
  const handleShowOnMapWithRef = useCallback(
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

  // Props memoizados
  const headerProps = useMemo(
    () => ({
      currentView,
      onViewChange: setCurrentView,
      onShowSettings: showSettingsHandler,
      onShowStats: showStatsHandler,
      theme: preferences.theme,
    }),
    [currentView, setCurrentView, showSettingsHandler, showStatsHandler, preferences.theme]
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
      onLocationUpdated: handleLocationUpdate,
    }),
    [locations, handleLocationUpdate]
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
      onSortChange: updateSortPreference,
      onShowAllChange: updateShowAllPreference,
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
      preferences.sortBy,
      preferences.showAll,
      updateSortPreference,
      updateShowAllPreference,
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
            onShowOnMap={handleShowOnMapWithRef}
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
      handleShowOnMapWithRef,
      savedLocationsProps,
    ]
  );

  // 🚨 INICIALIZACIÓN PRINCIPAL CON MANEJO DE ERRORES MEJORADO (sin notificaciones)
  useEffect(() => {
    if (!isInitialized) return;

    let hasRun = false; // 🔥 AÑADIDO: Prevenir múltiples ejecuciones

    const initializeApp = async () => {
      if (hasRun) {
        console.log("⏳ Inicialización ya ejecutada, omitiendo...");
        return;
      }

      hasRun = true; // 🔥 MARCAR COMO EJECUTADO

      try {
        console.log("🚀 Iniciando aplicación (sin notificaciones push)...");

        // 1. Inicializar tema
        try {
          initializeTheme();
          console.log("✅ Tema inicializado");
        } catch (themeError) {
          console.error("❌ Error inicializando tema:", themeError);
        }

        // 🆕 CONFIGURAR CALLBACKS DEL TIMER PARA UI
        try {
          setupTimerCallbacks();
          console.log("✅ Callbacks de timer configurados");
        } catch (callbackError) {
          console.error("❌ Error configurando callbacks:", callbackError);
        }

        // 2. Sincronizar timers con ubicaciones del hook
        try {
          if (locations.length > 0) {
            console.log("⏰ Sincronizando timers...");
            await timerManager.syncWithSavedLocations(locations);
            console.log("✅ Timers sincronizados exitosamente");
          }
        } catch (timerError) {
          console.error("❌ Error sincronizando timers:", timerError);

          // Fallback seguro
          try {
            console.log("🔄 Intentando sincronización individual segura...");
            const activeLocations = locations.filter(
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

        // 3. Obtener ubicación actual
        try {
          if (getCurrentLocation) {
            getCurrentLocation();
          }
          checkLocationPermissions();
          console.log("📍 Geolocalización inicializada");
        } catch (geoError) {
          console.error("❌ Error con geolocalización:", geoError);
        }

        // 4. Configurar listeners móviles (simplificado)
        try {
          setupMobileEventListeners();
          console.log("📱 Event listeners configurados");
        } catch (listenerError) {
          console.error("❌ Error configurando listeners:", listenerError);
        }

        console.log("🎉 Aplicación inicializada completamente (sin notificaciones push)");
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
            if (locations.length > 0) {
              const activeLocations = locations.filter(
                (location) => location.expiryTime && location.expiryTime > Date.now()
              );

              if (activeLocations.length > 0) {
                console.log(`🔄 Re-sincronizando ${activeLocations.length} timers activos`);
                await timerManager.syncWithSavedLocations(locations);
              }
            }
          } catch (error) {
            console.error("❌ Error sincronizando al volver al foco:", error);
          }
        };

        // ELIMINADO: listeners de notificaciones
        // const handleNotificationClick = (event: any) => { ... }
        // const handleNotificationFailed = (event: any) => { ... }

        window.addEventListener("focus", handleFocus);
        // ELIMINADO: window.addEventListener("notificationClick", handleNotificationClick);
        // ELIMINADO: window.addEventListener("notificationFailed", handleNotificationFailed);

        console.log("📱 Event listeners móviles configurados");
      } catch (error) {
        console.error("❌ Error configurando listeners móviles:", error);
      }
    };

    const cleanup = () => {
      try {
        timerManager.cleanup();
        console.log("🧹 TimerManager limpiado");
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
  }, [isInitialized]); // 🔥 SIMPLIFICADO: Solo depende de isInitialized

  // useEffect para debug en desarrollo
  useEffect(() => {
    if (!isInitialized) return;

    if (process.env.NODE_ENV === "development") {
      const debugInterval = setInterval(() => {
        console.log("🔍 DEBUG - Estado de la aplicación:");
        console.log("  - Timers:", timerManager.getTimerInfo());
        console.log("  - Ubicaciones:", locations.length);
      }, 60000);

      return () => clearInterval(debugInterval);
    }
  }, [isInitialized, locations.length]);

  // Actualizar mapa cuando cambie initialLocation
  useEffect(() => {
    if (!isInitialized) return;

    if (initialLocation && !locationLoading) {
      // El mapa se actualiza a través del hook useAppData
      console.log("📍 Ubicación inicial disponible:", initialLocation);
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

      {/* ELIMINADO: <ErrorBoundary><NotificationSetup /></ErrorBoundary> */}

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
              onPermissionDenied={handlePermissionDeniedWithToast}
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

      {/* Toast notifications - MANTENIDAS para UI */}
      <Toaster
        position="top-center"
        expand={true}
        richColors={true}
        toastOptions={{
          duration: 4000,
          style: {
            background: "hsl(var(--background))",
            color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--border))",
          },
        }}
      />
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

// 🔥 FUNCIÓN DE TEST GLOBAL SEGURA (solo timers)
if (typeof window !== "undefined") {
  window.testTimerSystem = async () => {
    try {
      console.log("🧪 Iniciando test del sistema de timers");
      if (timerManager && typeof timerManager.testTimerSystem === "function") {
        await timerManager.testTimerSystem();
        alert("Tests de timers completados - revisa la consola para ver los resultados");
      } else {
        console.error("❌ timerManager.testTimerSystem no disponible");
        alert("Error: Sistema de test de timers no disponible");
      }
    } catch (error) {
      console.error("❌ Error en tests:", error);
      alert("Error en tests del sistema de timers");
    }
  };
}

export default App;
