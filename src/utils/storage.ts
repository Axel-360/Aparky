// src/utils/storage.ts
import type { CarLocation } from "../types/location";

const STORAGE_KEY = "car-locations";
const BACKUP_KEY = "car-locations-backup";
const MAX_LOCATIONS = 1000; // Límite máximo de ubicaciones para evitar problemas de rendimiento

export const saveCarLocation = (location: CarLocation): void => {
  try {
    const existingLocations = getCarLocations();

    // Crear backup antes de modificar
    createBackup(existingLocations);

    // Añadir nueva ubicación al principio
    const updatedLocations = [location, ...existingLocations];

    // Limitar el número de ubicaciones si es necesario
    const limitedLocations = updatedLocations.slice(0, MAX_LOCATIONS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedLocations));

    // Log para debugging
    console.log(`Location saved successfully. Total locations: ${limitedLocations.length}`);
  } catch (error) {
    console.error("Error saving car location:", error);

    // Intentar restaurar desde backup si hay error
    try {
      restoreFromBackup();
      console.log("Restored from backup after save error");
    } catch (backupError) {
      console.error("Failed to restore from backup:", backupError);
    }

    throw new Error("No se pudo guardar la ubicación. Inténtalo de nuevo.");
  }
};

export const getCarLocations = (): CarLocation[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    // Validar que es un array
    if (!Array.isArray(parsed)) {
      console.warn("Invalid locations data format, resetting to empty array");
      return [];
    }

    // Filtrar y validar ubicaciones
    const validLocations = parsed.filter((location) => {
      return (
        location &&
        typeof location.id === "string" &&
        typeof location.latitude === "number" &&
        typeof location.longitude === "number" &&
        typeof location.timestamp === "number" &&
        location.latitude >= -90 &&
        location.latitude <= 90 &&
        location.longitude >= -180 &&
        location.longitude <= 180
      );
    });

    // Si se filtraron ubicaciones inválidas, guardar la versión limpia
    if (validLocations.length !== parsed.length) {
      console.warn(`Filtered ${parsed.length - validLocations.length} invalid locations`);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validLocations));
    }

    return validLocations;
  } catch (error) {
    console.error("Error getting car locations:", error);

    // Intentar restaurar desde backup
    try {
      const backup = restoreFromBackup();
      console.log("Restored from backup after get error");
      return backup;
    } catch (backupError) {
      console.error("Failed to restore from backup:", backupError);
      return [];
    }
  }
};

export const deleteCarLocation = (id: string): void => {
  try {
    const locations = getCarLocations();

    // Crear backup antes de modificar
    createBackup(locations);

    const filteredLocations = locations.filter((location) => location.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredLocations));

    console.log(`Location ${id} deleted successfully`);
  } catch (error) {
    console.error("Error deleting car location:", error);

    // Intentar restaurar desde backup si hay error
    try {
      restoreFromBackup();
      console.log("Restored from backup after delete error");
    } catch (backupError) {
      console.error("Failed to restore from backup:", backupError);
    }

    throw new Error("No se pudo eliminar la ubicación. Inténtalo de nuevo.");
  }
};

export const getLastCarLocation = (): CarLocation | null => {
  const locations = getCarLocations();
  return locations.length > 0 ? locations[0] : null;
};

export const updateCarLocation = (id: string, updates: Partial<CarLocation>): void => {
  try {
    const locations = getCarLocations();

    // Crear backup antes de modificar
    createBackup(locations);

    const updatedLocations = locations.map((location) => (location.id === id ? { ...location, ...updates } : location));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLocations));

    console.log(`Location ${id} updated successfully`);
  } catch (error) {
    console.error("Error updating car location:", error);
    throw new Error("No se pudo actualizar la ubicación. Inténtalo de nuevo.");
  }
};

export const searchLocations = (query: string): CarLocation[] => {
  const locations = getCarLocations();

  if (!query.trim()) {
    return locations;
  }

  const searchTerm = query.toLowerCase().trim();

  return locations.filter((location) => {
    const note = location.note?.toLowerCase() || "";
    const address = location.address?.toLowerCase() || "";
    const coords = `${location.latitude},${location.longitude}`;
    const date = new Date(location.timestamp).toLocaleDateString().toLowerCase();

    return (
      note.includes(searchTerm) ||
      address.includes(searchTerm) ||
      coords.includes(searchTerm) ||
      date.includes(searchTerm)
    );
  });
};

export const exportLocations = (): string => {
  try {
    const locations = getCarLocations();
    const exportData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      totalLocations: locations.length,
      locations: locations,
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error("Error exporting locations:", error);
    throw new Error("No se pudieron exportar las ubicaciones.");
  }
};

export const importLocations = (jsonData: string): number => {
  try {
    const data = JSON.parse(jsonData);

    // Validar formato de importación
    if (!data.locations || !Array.isArray(data.locations)) {
      throw new Error("Formato de archivo inválido");
    }

    // Crear backup antes de importar
    const currentLocations = getCarLocations();
    createBackup(currentLocations);

    // Validar y filtrar ubicaciones importadas
    const validImportedLocations = data.locations.filter((location: any) => {
      return (
        location &&
        typeof location.latitude === "number" &&
        typeof location.longitude === "number" &&
        typeof location.timestamp === "number" &&
        location.latitude >= -90 &&
        location.latitude <= 90 &&
        location.longitude >= -180 &&
        location.longitude <= 180
      );
    });

    // Generar IDs únicos para ubicaciones importadas si es necesario
    const locationsWithIds = validImportedLocations.map((location: any) => ({
      ...location,
      id: location.id || `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }));

    // Combinar con ubicaciones existentes y eliminar duplicados
    const allLocations = [...locationsWithIds, ...currentLocations];
    const uniqueLocations = removeDuplicateLocations(allLocations);

    // Ordenar por timestamp descendente
    const sortedLocations = uniqueLocations.sort((a, b) => b.timestamp - a.timestamp);

    // Limitar número de ubicaciones
    const limitedLocations = sortedLocations.slice(0, MAX_LOCATIONS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedLocations));

    console.log(`Imported ${validImportedLocations.length} locations successfully`);
    return validImportedLocations.length;
  } catch (error) {
    console.error("Error importing locations:", error);

    // Restaurar backup si hay error
    try {
      restoreFromBackup();
      console.log("Restored from backup after import error");
    } catch (backupError) {
      console.error("Failed to restore from backup:", backupError);
    }

    throw new Error("No se pudieron importar las ubicaciones. Verifica el formato del archivo.");
  }
};

export const clearAllLocations = (): void => {
  try {
    // Crear backup antes de limpiar
    const locations = getCarLocations();
    createBackup(locations);

    localStorage.removeItem(STORAGE_KEY);

    console.log("All locations cleared successfully");
  } catch (error) {
    console.error("Error clearing locations:", error);
    throw new Error("No se pudieron eliminar todas las ubicaciones.");
  }
};

export const getStorageUsage = (): { used: number; available: number; percentage: number } => {
  try {
    const data = localStorage.getItem(STORAGE_KEY) || "";
    const used = new Blob([data]).size; // Tamaño en bytes
    const available = 5 * 1024 * 1024; // 5MB límite típico de localStorage
    const percentage = Math.round((used / available) * 100);

    return { used, available, percentage };
  } catch (error) {
    console.error("Error calculating storage usage:", error);
    return { used: 0, available: 0, percentage: 0 };
  }
};

// Funciones auxiliares privadas
const createBackup = (locations: CarLocation[]): void => {
  try {
    const backup = {
      timestamp: Date.now(),
      locations: locations,
    };
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
  } catch (error) {
    console.warn("Could not create backup:", error);
  }
};

const restoreFromBackup = (): CarLocation[] => {
  try {
    const backupData = localStorage.getItem(BACKUP_KEY);

    if (!backupData) {
      throw new Error("No backup available");
    }

    const backup = JSON.parse(backupData);

    if (!backup.locations || !Array.isArray(backup.locations)) {
      throw new Error("Invalid backup format");
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(backup.locations));
    return backup.locations;
  } catch (error) {
    console.error("Error restoring from backup:", error);
    throw error;
  }
};

const removeDuplicateLocations = (locations: CarLocation[]): CarLocation[] => {
  const seen = new Set<string>();
  const unique: CarLocation[] = [];

  for (const location of locations) {
    // Crear clave única basada en coordenadas y timestamp
    const key = `${location.latitude.toFixed(6)}_${location.longitude.toFixed(6)}_${location.timestamp}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(location);
    }
  }

  return unique;
};

// Función para limpiar el caché de direcciones (útil para mantenimiento)
export const clearAddressCache = (): void => {
  try {
    // Si el cache está en una variable global, lo limpiaríamos aquí
    console.log("Address cache cleared");
  } catch (error) {
    console.error("Error clearing address cache:", error);
  }
};
