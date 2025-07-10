// src/hooks/useAppData.ts - VERSIÓN CORREGIDA Y SIMPLIFICADA
import { useState, useCallback, useEffect } from "react";
import type { CarLocation, UserPreferences } from "@/types/location";
import { getCarLocations, updateCarLocation, saveCarLocation, deleteCarLocation } from "@/utils/storage";
import { getUserPreferences } from "@/utils/preferences";
import { timerManager } from "@/utils/timerManager";
import { toast } from "sonner";

export const useAppData = (
  currentLocation: { latitude: number; longitude: number } | null,
  updateLastKnownLocation?: (lat: number, lng: number) => void
) => {
  // 🔥 SIMPLIFICADO: Estados individuales en lugar de objeto complejo
  const [locations, setLocations] = useState<CarLocation[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      return getUserPreferences();
    } catch (error) {
      console.error("Error cargando preferencias:", error);
      // ✅ CORREGIDO: photoQuality con valor válido
      return {
        theme: "system",
        mapType: "osm",
        autoSave: false,
        sortBy: "date",
        showAll: true,
        notifications: true,
        defaultReminderMinutes: 5,
        maxPhotos: 3,
        photoQuality: "medium", // ✅ Cambio: 0.8 → "medium"
      } as UserPreferences;
    }
  });
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>();
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.4168, -3.7038]);
  const [mapZoom, setMapZoom] = useState<number>(13);

  // 🔥 CORREGIDO: Cargar ubicaciones de forma segura
  useEffect(() => {
    let isMounted = true; // Evitar setState en componente desmontado

    const loadLocations = () => {
      try {
        console.log("📍 Cargando ubicaciones...");
        const savedLocations = getCarLocations();

        if (isMounted) {
          setLocations(savedLocations);

          // Centrar mapa en primera ubicación si existe
          if (savedLocations.length > 0) {
            const firstLocation = savedLocations[0];
            setMapCenter([firstLocation.latitude, firstLocation.longitude]);
            setMapZoom(15);
          }

          console.log(`✅ Cargadas ${savedLocations.length} ubicaciones`);
        }
      } catch (error) {
        console.error("❌ Error cargando ubicaciones:", error);
        if (isMounted) {
          toast.error("Error al cargar ubicaciones guardadas");
        }
      }
    };

    loadLocations();

    return () => {
      isMounted = false;
    };
  }, []); // Solo ejecutar una vez al montar

  // Handler para guardar nueva ubicación
  const handleLocationSaved = useCallback(
    async (newLocation: CarLocation) => {
      try {
        console.log("💾 Guardando nueva ubicación:", newLocation);

        // Guardar en storage
        saveCarLocation(newLocation);

        // Actualizar estado local
        setLocations((prev) => [newLocation, ...prev]);
        setMapCenter([newLocation.latitude, newLocation.longitude]);
        setMapZoom(15);
        setSelectedLocationId(newLocation.id);

        // Programar timer si es necesario
        if (newLocation.expiryTime) {
          console.log("⏰ Programando timer para nueva ubicación");
          try {
            await timerManager.scheduleTimer(newLocation);
          } catch (timerError) {
            console.error("Error programando timer:", timerError);
            // No fallar por error de timer
          }
        }

        // Actualizar última ubicación conocida
        if (!newLocation.isManualPlacement && currentLocation && updateLastKnownLocation) {
          try {
            updateLastKnownLocation(currentLocation.latitude, currentLocation.longitude);
          } catch (error) {
            console.error("Error actualizando última ubicación:", error);
            // No fallar por esto
          }
        }
      } catch (error) {
        console.error("❌ Error saving location:", error);
        toast.error("Error al guardar la ubicación");
      }
    },
    [currentLocation, updateLastKnownLocation]
  );

  // Handler para actualizar ubicación existente
  const handleLocationUpdate = useCallback(
    async (id: string, updates: Partial<CarLocation>) => {
      try {
        console.log(`📝 Actualizando ubicación ${id}:`, updates);

        // Actualizar en storage
        updateCarLocation(id, updates);

        // Actualizar estado local
        setLocations((prev) => prev.map((loc) => (loc.id === id ? { ...loc, ...updates } : loc)));

        // Re-programar timer si se actualiza el tiempo de expiración
        if (updates.expiryTime) {
          const location = locations.find((loc) => loc.id === id);
          if (location) {
            const updatedLocation = { ...location, ...updates };
            try {
              await timerManager.scheduleTimer(updatedLocation);
            } catch (timerError) {
              console.error("Error re-programando timer:", timerError);
              // No fallar por error de timer
            }
          }
        }

        // toast.success("Ubicación actualizada");
      } catch (error) {
        console.error("❌ Error updating location:", error);
        toast.error("Error al actualizar la ubicación");
      }
    },
    [locations] // Dependencia necesaria para encontrar la ubicación
  );

  // Handler para eliminar ubicación
  const handleLocationDeleted = useCallback(
    (locationId: string) => {
      try {
        const location = locations.find((loc) => loc.id === locationId);
        if (!location) {
          console.error("Ubicación no encontrada:", locationId);
          return;
        }

        // Eliminar de storage
        deleteCarLocation(locationId);

        // Actualizar estado local
        setLocations((prev) => prev.filter((loc) => loc.id !== locationId));

        // Limpiar selección si era la ubicación seleccionada
        if (selectedLocationId === locationId) {
          setSelectedLocationId(undefined);
        }

        // Cancelar timer asociado
        try {
          timerManager.cancelTimer(locationId);
        } catch (error) {
          console.error("Error cancelando timer:", error);
          // No fallar por esto
        }

        toast.success("Ubicación eliminada");
      } catch (error) {
        console.error("❌ Error deleting location:", error);
        toast.error("Error al eliminar la ubicación");
      }
    },
    [locations, selectedLocationId]
  );

  // Handler para seleccionar ubicación en el mapa
  const handleLocationSelected = useCallback((location: CarLocation) => {
    setMapCenter([location.latitude, location.longitude]);
    setMapZoom(15);
    setSelectedLocationId(location.id);
  }, []);

  // Handlers para el mapa
  const handleMapLocationClick = useCallback((location: CarLocation) => {
    setSelectedLocationId(location.id);
  }, []);

  const handleMapCenterChange = useCallback((center: [number, number], zoom: number) => {
    setMapCenter(center);
    setMapZoom(zoom);
  }, []);

  // Handler para cambios de preferencias
  const handlePreferencesChange = useCallback((newPreferences: UserPreferences) => {
    setPreferences(newPreferences);
  }, []);

  // Helpers para preferences específicas
  const updateSortPreference = useCallback(
    (sortBy: "date" | "note") => {
      const newPrefs = { ...preferences, sortBy };
      setPreferences(newPrefs);
      handlePreferencesChange(newPrefs);
    },
    [preferences, handlePreferencesChange]
  );

  const updateShowAllPreference = useCallback(
    (showAll: boolean) => {
      const newPrefs = { ...preferences, showAll };
      setPreferences(newPrefs);
      handlePreferencesChange(newPrefs);
    },
    [preferences, handlePreferencesChange]
  );

  // 🔥 SIMPLIFICADO: Handlers de timer sin complicaciones
  const handleTimerExtend = useCallback(
    async (locationId: string, minutes: number) => {
      try {
        console.log(`⏰ Extendiendo timer ${locationId} por ${minutes} minutos`);

        const location = locations.find((loc) => loc.id === locationId);
        if (!location || !location.expiryTime) {
          throw new Error("Ubicación no encontrada o sin timer");
        }

        // Calcular nuevos valores
        const newExpiryTime = location.expiryTime + minutes * 60000;
        const newExtensionCount = (location.extensionCount || 0) + 1;

        const updates = {
          expiryTime: newExpiryTime,
          extensionCount: newExtensionCount,
        };

        // Usar el handler de actualización existente
        await handleLocationUpdate(locationId, updates);

        // Extender en timer manager
        try {
          const updatedLocation = { ...location, ...updates };
          await timerManager.scheduleTimer(updatedLocation);
        } catch (timerError) {
          console.error("Error en timer manager:", timerError);
          // No fallar por esto, la ubicación ya se actualizó
        }

        toast.success(`Timer extendido ${minutes} minutos`);
        console.log("✅ Timer extendido exitosamente");
      } catch (error) {
        console.error("❌ Error extendiendo timer:", error);
        toast.error("Error al extender el timer");
      }
    },
    [locations, handleLocationUpdate]
  );

  const handleTimerCancel = useCallback(
    async (locationId: string) => {
      try {
        console.log(`❌ Cancelando timer: ${locationId}`);

        // Cancelar en timer manager primero
        try {
          timerManager.cancelTimer(locationId);
        } catch (error) {
          console.error("Error cancelando en timer manager:", error);
          // Continuar con la actualización de la ubicación
        }

        // Limpiar propiedades de timer
        const updates = {
          expiryTime: undefined,
          reminderMinutes: undefined,
          extensionCount: undefined,
        };

        // Actualizar ubicación
        await handleLocationUpdate(locationId, updates);

        toast.success("⏰ Temporizador cancelado");
        console.log("✅ Timer cancelado exitosamente");
      } catch (error) {
        console.error("❌ Error cancelando timer:", error);
        toast.error("Error al cancelar el timer");
      }
    },
    [handleLocationUpdate]
  );

  return {
    // Estados
    locations,
    preferences,
    selectedLocationId,
    mapCenter,
    mapZoom,

    // Handlers principales de ubicaciones
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

    // Helper para recargar datos
    reloadLocations: useCallback(() => {
      try {
        const savedLocations = getCarLocations();
        setLocations(savedLocations);
        console.log("🔄 Ubicaciones recargadas");
      } catch (error) {
        console.error("Error recargando ubicaciones:", error);
        toast.error("Error al recargar ubicaciones");
      }
    }, []),
  };
};
