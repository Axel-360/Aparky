// src/types/location.ts - ACTUALIZADO CON UBICACIONES MANUALES
export interface CarLocation {
  id: string;
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: number;
  note?: string;
  photos?: string[]; // URLs de las fotos en base64
  parkingType?: "Calle" | "Garaje" | "Parking" | "Otro";
  expiryTime?: number; // Timestamp cuando expira el parking
  cost?: number; // Costo del parking
  reminderMinutes?: number; // Minutos antes del vencimiento para recordar
  extensionCount?: number;
  accuracy?: number;
  isManualPlacement?: boolean; // NUEVO: Flag para ubicaciones marcadas manualmente
}

export interface LocationWithAccuracy {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

// Nuevos tipos para las mejoras
export interface UserPreferences {
  theme: "light" | "dark" | "system";
  sortBy: "date" | "note";
  showAll: boolean;
  mapType: "osm" | "satellite" | "terrain";
  autoSave: boolean;
  notifications: boolean;
  defaultReminderMinutes: number;
  maxPhotos: number;
  photoQuality: "low" | "medium" | "high";
}

export type DateFilter = "all" | "today" | "week" | "month";

export interface LocationStats {
  totalLocations: number;
  mostUsedHour: number;
  averageAccuracy: number;
  mostCommonArea: string;
  weeklyCount: number[];
  totalCost: number;
  averageCost: number;
  mostUsedParkingType: string;
}

export interface ParkingTimer {
  locationId: string;
  expiryTime: number;
  reminderTime: number;
  isActive: boolean;
}

export interface NavigationLocation extends LocationWithAccuracy {
  speed?: number;
  heading?: number;
}

// Constantes útiles para navegación
export const NAVIGATION_CONSTANTS = {
  DEFAULT_WALKING_SPEED: 1.39, // metros por segundo (5 km/h)
  HIGH_ACCURACY_THRESHOLD: 20, // metros
  LOW_ACCURACY_THRESHOLD: 100, // metros
  ARRIVAL_THRESHOLD: 15, // metros
  UPDATE_INTERVAL: 3000, // milisegundos
} as const;
