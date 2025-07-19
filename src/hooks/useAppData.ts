// src/hooks/useAppData.ts
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
  const [locations, setLocations] = useState<CarLocation[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      return getUserPreferences();
    } catch (error) {
      console.error("Error cargando preferencias:", error);
      return {
        theme: "system",
        mapType: "osm",
        autoSave: false,
        sortBy: "date",
        showAll: false,
        notifications: true,
        defaultReminderMinutes: 5,
        maxPhotos: 3,
        photoQuality: "medium",
      } as UserPreferences;
    }
  });
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>();
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.4168, -3.7038]);
  const [mapZoom, setMapZoom] = useState<number>(13);

  useEffect(() => {
    let isMounted = true;

    const loadLocations = () => {
      try {
        console.log("📍 Cargando ubicaciones...");
        const savedLocations = getCarLocations();

        if (isMounted) {
          setLocations(savedLocations);

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
  }, []);
  const handleLocationSaved = useCallback(
    async (newLocation: CarLocation) => {
      try {
        console.log("💾 Guardando nueva ubicación:", newLocation);

        saveCarLocation(newLocation);

        setLocations((prev) => [newLocation, ...prev]);
        setMapCenter([newLocation.latitude, newLocation.longitude]);
        setMapZoom(15);
        setSelectedLocationId(newLocation.id);

        if (newLocation.expiryTime) {
          console.log("⏰ Programando temporizador para nueva ubicación");
          try {
            await timerManager.scheduleTimer(newLocation);
          } catch (timerError) {
            console.error("Error programando temporizador:", timerError);
          }
        }

        if (!newLocation.isManualPlacement && currentLocation && updateLastKnownLocation) {
          try {
            updateLastKnownLocation(currentLocation.latitude, currentLocation.longitude);
          } catch (error) {
            console.error("Error actualizando última ubicación:", error);
          }
        }
      } catch (error) {
        console.error("❌ Error saving location:", error);
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
            try {
              await timerManager.scheduleTimer(updatedLocation);
            } catch (timerError) {
              console.error("Error re-programando temporizador:", timerError);
            }
          }
        }
      } catch (error) {
        console.error("❌ Error updating location:", error);
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

        if (selectedLocationId === locationId) {
          setSelectedLocationId(undefined);
        }

        try {
          timerManager.cancelTimer(locationId);
        } catch (error) {
          console.error("Error cancelando temporizador:", error);
        }

        toast.success("Ubicación eliminada");
      } catch (error) {
        console.error("❌ Error deleting location:", error);
        toast.error("Error al eliminar la ubicación");
      }
    },
    [locations, selectedLocationId]
  );

  const handleLocationSelected = useCallback((location: CarLocation) => {
    setMapCenter([location.latitude, location.longitude]);
    setMapZoom(15);
    setSelectedLocationId(location.id);
  }, []);

  const handleMapLocationClick = useCallback((location: CarLocation) => {
    setSelectedLocationId(location.id);
  }, []);

  const handleMapCenterChange = useCallback((center: [number, number], zoom: number) => {
    setMapCenter(center);
    setMapZoom(zoom);
  }, []);

  const handlePreferencesChange = useCallback((newPreferences: UserPreferences) => {
    setPreferences(newPreferences);
  }, []);

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

  const handleTimerExtend = useCallback(
    async (locationId: string, minutes: number) => {
      try {
        console.log(`⏰ Extendiendo temporizador ${locationId} por ${minutes} minutos`);

        const location = locations.find((loc) => loc.id === locationId);
        if (!location || !location.expiryTime) {
          throw new Error("Ubicación no encontrada o sin temporizador");
        }

        const newExpiryTime = location.expiryTime + minutes * 60000;
        const newExtensionCount = (location.extensionCount || 0) + 1;

        const updates = {
          expiryTime: newExpiryTime,
          extensionCount: newExtensionCount,
        };

        await handleLocationUpdate(locationId, updates);

        try {
          const updatedLocation = { ...location, ...updates };
          await timerManager.scheduleTimer(updatedLocation);
        } catch (timerError) {
          console.error("Error en timer manager:", timerError);
        }

        toast.success(`Temporizador extendido ${minutes} minutos`);
        console.log("✅ Temporizador extendido exitosamente");
      } catch (error) {
        console.error("❌ Error extendiendo el temporizador:", error);
        toast.error("Error al extender el temporizador");
      }
    },
    [locations, handleLocationUpdate]
  );

  const handleTimerCancel = useCallback(
    async (locationId: string) => {
      try {
        console.log(`❌ Cancelando temporizador: ${locationId}`);

        try {
          timerManager.cancelTimer(locationId);
        } catch (error) {
          console.error("Error cancelando en timer manager:", error);
        }

        const updates = {
          expiryTime: undefined,
          reminderMinutes: undefined,
          extensionCount: undefined,
        };

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
    locations,
    preferences,
    selectedLocationId,
    mapCenter,
    mapZoom,

    handleLocationSaved,
    handleLocationUpdate,
    handleLocationDeleted,
    handleLocationSelected,

    handleTimerExtend,
    handleTimerCancel,

    handleMapLocationClick,
    handleMapCenterChange,

    handlePreferencesChange,
    updateSortPreference,
    updateShowAllPreference,

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
