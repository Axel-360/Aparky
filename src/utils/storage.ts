// src/utils/storage.ts
import type { CarLocation } from "../types/location";

const STORAGE_KEY = "car-locations";

export const saveCarLocation = (location: CarLocation): void => {
  try {
    const existingLocations = getCarLocations();
    const updatedLocations = [location, ...existingLocations];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLocations));
  } catch (error) {
    console.error("Error saving car location:", error);
  }
};

export const getCarLocations = (): CarLocation[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error getting car locations:", error);
    return [];
  }
};

export const deleteCarLocation = (id: string): void => {
  try {
    const locations = getCarLocations();
    const filteredLocations = locations.filter((location) => location.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredLocations));
  } catch (error) {
    console.error("Error deleting car location:", error);
  }
};

export const getLastCarLocation = (): CarLocation | null => {
  const locations = getCarLocations();
  return locations.length > 0 ? locations[0] : null;
};
