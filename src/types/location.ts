// src/types/location.ts
export interface CarLocation {
  id: string;
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: number;
  note?: string;
  photos?: string[];
  parkingType?: "Calle" | "Garaje" | "Parking" | "Otro";
  expiryTime?: number;
  cost?: number;
  reminderMinutes?: number;
  extensionCount?: number;
  accuracy?: number;
  isManualPlacement?: boolean;
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

export const NAVIGATION_CONSTANTS = {
  DEFAULT_WALKING_SPEED: 1.39,
  HIGH_ACCURACY_THRESHOLD: 20,
  LOW_ACCURACY_THRESHOLD: 100,
  ARRIVAL_THRESHOLD: 15,
  UPDATE_INTERVAL: 3000,
} as const;
