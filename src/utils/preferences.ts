// src/utils/preferences.ts
import type { UserPreferences } from "../types/location";

const PREFERENCES_KEY = "user-preferences";

export const defaultPreferences: UserPreferences = {
  theme: "system",
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
    const saved = localStorage.getItem(PREFERENCES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge con defaults para asegurar que todas las propiedades existen
      return { ...defaultPreferences, ...parsed };
    }
  } catch (error) {
    console.error("Error loading preferences:", error);
  }
  return defaultPreferences;
};

export const saveUserPreferences = (preferences: Partial<UserPreferences>) => {
  try {
    const current = getUserPreferences();
    const updated = { ...current, ...preferences };
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));

    // Si se cambia el tema, aplicarlo inmediatamente
    if (preferences.theme) {
      applyTheme(preferences.theme);
    }
  } catch (error) {
    console.error("Error saving preferences:", error);
  }
};

export const applyTheme = (theme: "light" | "dark" | "system") => {
  const root = window.document.documentElement;

  // Remover clases existentes
  root.classList.remove("light", "dark");

  if (theme === "system") {
    // Detectar preferencia del sistema
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    root.classList.add(systemTheme);

    // Escuchar cambios en la preferencia del sistema
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      root.classList.remove("light", "dark");
      root.classList.add(e.matches ? "dark" : "light");
    };

    // Remover listener anterior si existe
    mediaQuery.removeEventListener("change", handleChange);
    mediaQuery.addEventListener("change", handleChange);
  } else {
    // Aplicar tema específico
    root.classList.add(theme);
  }

  // Actualizar meta theme-color para móviles
  updateMetaThemeColor(theme);
};

const updateMetaThemeColor = (theme: "light" | "dark" | "system") => {
  let themeColor = "#ffffff"; // light por defecto

  if (theme === "dark") {
    themeColor = "#0a0a0a"; // dark
  } else if (theme === "system") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    themeColor = isDark ? "#0a0a0a" : "#ffffff";
  }

  // Actualizar o crear meta tag
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (!metaThemeColor) {
    metaThemeColor = document.createElement("meta");
    metaThemeColor.setAttribute("name", "theme-color");
    document.head.appendChild(metaThemeColor);
  }
  metaThemeColor.setAttribute("content", themeColor);
};

// Inicializar tema al cargar
export const initializeTheme = () => {
  const preferences = getUserPreferences();
  applyTheme(preferences.theme);
};
