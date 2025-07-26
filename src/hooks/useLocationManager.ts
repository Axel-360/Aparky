// src/hooks/useLocationManager.ts
import { useState, useCallback, useMemo } from "react";
import type { CarLocation, UserPreferences } from "@/types/location";
import { deleteCarLocation, updateCarLocation } from "@/utils/storage";
import { copyToClipboard } from "@/utils/helpers";
import { timerManager } from "@/utils/timerManager";
import { Formatters } from "@/utils/formatters";
import { toast } from "sonner";
import { CloudSun, Warehouse, SquareParking, MapPinPlusInside, MapPin, Pointer, Target } from "lucide-react";

interface LocationManagerState {
  selectedLocationId?: string;
  editingLocation?: CarLocation;
  deletingLocation?: CarLocation;
}

interface LocationManagerActions {
  // Selección y navegación
  selectLocation: (location: CarLocation) => void;
  openInMaps: (location: CarLocation) => void;
  shareLocation: (location: CarLocation) => Promise<void>;

  // Edición
  startEditing: (location: CarLocation) => void;
  saveLocationEdits: (locationId: string, updates: Partial<CarLocation>) => Promise<void>;
  cancelEditing: () => void;

  // Eliminación
  startDeleting: (location: CarLocation) => void;
  confirmDelete: () => Promise<void>;
  cancelDelete: () => void;

  // Temporizadores
  extendTimer: (locationId: string, minutes: number) => Promise<void>;
  cancelTimer: (locationId: string) => Promise<void>;

  // Utilidades
  getParkingTypeInfo: (type?: string) => { icon: React.ElementType; name: string; color: string };
  getLocationAccuracyInfo: (location: CarLocation) => { icon: React.ElementType; text: string; description: string };
  formatLocationDate: (timestamp: number) => string;
}

export const useLocationManager = (
  locations: CarLocation[],
  onLocationUpdated?: (locationId: string, updates: Partial<CarLocation>) => void,
  onLocationDeleted?: (locationId: string) => void,
  onLocationSelected?: (location: CarLocation) => void,
  _preferences?: UserPreferences
): LocationManagerState & LocationManagerActions => {
  const [state, setState] = useState<LocationManagerState>({});

  // Información de tipos de parking (centralizada) - SIN EMOJIS
  const parkingTypeInfo = useMemo(
    () => ({
      Calle: { icon: CloudSun, name: "Calle", color: "text-blue-600 bg-blue-50 border-blue-200" },
      Garaje: { icon: Warehouse, name: "Garaje", color: "text-gray-600 bg-gray-50 border-gray-200" },
      Parking: { icon: SquareParking, name: "Aparcamiento", color: "text-green-600 bg-green-50 border-green-200" },
      Otro: { icon: MapPinPlusInside, name: "Otro", color: "text-purple-600 bg-purple-50 border-purple-200" },
    }),
    []
  );

  // ========== ACCIONES DE SELECCIÓN ==========
  const selectLocation = useCallback(
    (location: CarLocation) => {
      setState((prev) => ({ ...prev, selectedLocationId: location.id }));
      onLocationSelected?.(location);
    },
    [onLocationSelected]
  );

  const openInMaps = useCallback((location: CarLocation) => {
    const query = location.address
      ? encodeURIComponent(location.address)
      : `${location.latitude},${location.longitude}`;

    const urls = {
      google: `https://www.google.com/maps/search/?api=1&query=${query}`,
      apple: `http://maps.apple.com/?q=${query}`,
      openstreet: `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}&zoom=16`,
    };

    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    let mapUrl = urls.google;
    if (isMobile && isIOS) {
      mapUrl = urls.apple;
    }

    window.open(mapUrl, "_blank");
    toast.success("Abriendo en aplicación de mapas");
  }, []);

  const shareLocation = useCallback(async (location: CarLocation) => {
    const shareText = `Mi coche está aparcado aquí: ${
      location.address || `${location.latitude}, ${location.longitude}`
    }`;
    const shareUrl = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Ubicación de mi coche",
          text: shareText,
          url: shareUrl,
        });
        toast.success("Ubicación compartida");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          await copyToClipboard(`${shareText}\n${shareUrl}`);
          toast.success("Enlace copiado al portapapeles");
        }
      }
    } else {
      await copyToClipboard(`${shareText}\n${shareUrl}`);
      toast.success("Enlace copiado al portapapeles");
    }
  }, []);

  // ========== ACCIONES DE EDICIÓN ==========
  const startEditing = useCallback((location: CarLocation) => {
    setState((prev) => ({ ...prev, editingLocation: location }));
  }, []);

  const saveLocationEdits = useCallback(
    async (locationId: string, updates: Partial<CarLocation>) => {
      try {
        await updateCarLocation(locationId, updates);
        onLocationUpdated?.(locationId, updates);
        setState((prev) => ({ ...prev, editingLocation: undefined }));
        toast.success("Ubicación actualizada correctamente");
      } catch (error) {
        console.error("Error updating location:", error);
        toast.error("Error al actualizar la ubicación");
        throw error;
      }
    },
    [onLocationUpdated]
  );

  const cancelEditing = useCallback(() => {
    setState((prev) => ({ ...prev, editingLocation: undefined }));
  }, []);

  // ========== ACCIONES DE ELIMINACIÓN ==========
  const startDeleting = useCallback((location: CarLocation) => {
    setState((prev) => ({ ...prev, deletingLocation: location }));
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!state.deletingLocation) return;

    try {
      const id = state.deletingLocation.id;

      // Cancelar timer si existe
      try {
        timerManager.cancelTimer(id);
      } catch (error) {
        console.log("No timer to cancel for location:", id);
      }

      await deleteCarLocation(id);
      onLocationDeleted?.(id);
      setState((prev) => ({
        ...prev,
        deletingLocation: undefined,
        selectedLocationId: prev.selectedLocationId === id ? undefined : prev.selectedLocationId,
      }));

      toast.success("Ubicación eliminada correctamente");
    } catch (error) {
      console.error("Error deleting location:", error);
      toast.error("Error al eliminar la ubicación");
      throw error;
    }
  }, [state.deletingLocation, onLocationDeleted]);

  const cancelDelete = useCallback(() => {
    setState((prev) => ({ ...prev, deletingLocation: undefined }));
  }, []);

  // ========== ACCIONES DE TEMPORIZADORES ==========
  const extendTimer = useCallback(
    async (locationId: string, minutes: number) => {
      try {
        const location = locations.find((loc) => loc.id === locationId);
        if (!location?.expiryTime) throw new Error("Timer no encontrado");

        const newExpiryTime = location.expiryTime + minutes * 60000;
        const newExtensionCount = (location.extensionCount || 0) + 1;

        const updates = { expiryTime: newExpiryTime, extensionCount: newExtensionCount };

        await saveLocationEdits(locationId, updates);
        await timerManager.scheduleTimer({ ...location, ...updates });

        toast.success(`Temporizador extendido ${minutes} minutos`);
      } catch (error) {
        console.error("Error extending timer:", error);
        toast.error("Error al extender el temporizador");
        throw error;
      }
    },
    [locations, saveLocationEdits]
  );

  const cancelTimer = useCallback(
    async (locationId: string) => {
      try {
        timerManager.cancelTimer(locationId);
        await saveLocationEdits(locationId, {
          expiryTime: undefined,
          reminderMinutes: undefined,
          extensionCount: 0,
        });
        toast.success("Temporizador cancelado");
      } catch (error) {
        console.error("Error canceling timer:", error);
        toast.error("Error al cancelar el temporizador");
        throw error;
      }
    },
    [saveLocationEdits]
  );

  // ========== UTILIDADES ==========
  const getParkingTypeInfo = useCallback(
    (type?: string) => {
      return parkingTypeInfo[type as keyof typeof parkingTypeInfo] || parkingTypeInfo.Calle;
    },
    [parkingTypeInfo]
  );

  const getLocationAccuracyInfo = useCallback((location: CarLocation) => {
    if (location.isManualPlacement) {
      return {
        icon: Pointer,
        text: "Ubicación editada manualmente",
        description: "Coordenadas modificadas",
      };
    }

    if (location.accuracy && location.accuracy <= 10) {
      return {
        icon: Target,
        text: "GPS de alta precisión",
        description: `±${Math.round(location.accuracy)}m`,
      };
    }

    return {
      icon: MapPin,
      text: "GPS automático",
      description: location.accuracy ? `±${Math.round(location.accuracy)}m` : "Ubicación GPS",
    };
  }, []);

  const formatLocationDate = useCallback((timestamp: number) => {
    return Formatters.formatDateTime(timestamp).relative;
  }, []);

  return {
    ...state,
    selectLocation,
    openInMaps,
    shareLocation,
    startEditing,
    saveLocationEdits,
    cancelEditing,
    startDeleting,
    confirmDelete,
    cancelDelete,
    extendTimer,
    cancelTimer,
    getParkingTypeInfo,
    getLocationAccuracyInfo,
    formatLocationDate,
  };
};
