// src/utils/preferences.ts
import type { UserPreferences } from "../types/location";

const PREFERENCES_KEY = "user-preferences";

const defaultPreferences: UserPreferences = {
  theme: "light",
  sortBy: "date",
  showAll: false,
  mapType: "osm",
  autoSave: false,
  notifications: true,
  defaultReminderMinutes: 15,
  maxPhotos: 3,
  photoQuality: "medium",
};

export const getUserPreferences = (): UserPreferences => {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    return stored ? { ...defaultPreferences, ...JSON.parse(stored) } : defaultPreferences;
  } catch (error) {
    console.error("Error getting user preferences:", error);
    return defaultPreferences;
  }
};

export const saveUserPreferences = (preferences: Partial<UserPreferences>): void => {
  try {
    const current = getUserPreferences();
    const updated = { ...current, ...preferences };
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Error saving user preferences:", error);
  }
};

export const applyTheme = (theme: "light" | "dark"): void => {
  document.documentElement.setAttribute("data-theme", theme);
  document.body.className = theme === "dark" ? "dark-theme" : "";
};
