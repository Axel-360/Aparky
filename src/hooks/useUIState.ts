// src/hooks/useUIState.ts
import { useState, useCallback } from "react";
import type { CarLocation } from "@/types/location";

interface UIState {
  // Estados de vista
  currentView: "map" | "proximity";

  // Estados de modales
  showSettings: boolean;
  showStats: boolean;
  showNavigation: boolean;
  showLocationPermissions: boolean;

  // Estados de navegación
  navigationTarget: CarLocation | null;
  locationPermissionGranted: boolean;

  // Estados de error global
  globalError: string | null;
}

export const useUIState = () => {
  // Estado consolidado
  const [uiState, setUIState] = useState<UIState>({
    currentView: "map",
    showSettings: false,
    showStats: false,
    showNavigation: false,
    showLocationPermissions: false,
    navigationTarget: null,
    locationPermissionGranted: false,
    globalError: null,
  });

  // Handlers de vista
  const setCurrentView = useCallback((view: "map" | "proximity") => {
    setUIState((prev) => ({ ...prev, currentView: view }));
  }, []);

  // Handlers de modales - Simplificados
  const showSettingsHandler = useCallback(() => {
    setUIState((prev) => ({ ...prev, showSettings: true }));
  }, []);

  const hideSettingsHandler = useCallback(() => {
    setUIState((prev) => ({ ...prev, showSettings: false }));
  }, []);

  const showStatsHandler = useCallback(() => {
    setUIState((prev) => ({ ...prev, showStats: true }));
  }, []);

  const hideStatsHandler = useCallback(() => {
    setUIState((prev) => ({ ...prev, showStats: false }));
  }, []);

  // Handlers de navegación
  const startNavigation = useCallback((target: CarLocation) => {
    setUIState((prev) => ({
      ...prev,
      navigationTarget: target,
      showLocationPermissions: true,
      showNavigation: false,
    }));
  }, []);

  const closeNavigation = useCallback(() => {
    setUIState((prev) => ({
      ...prev,
      showNavigation: false,
      navigationTarget: null,
    }));
  }, []);

  const handlePermissionGranted = useCallback(() => {
    setUIState((prev) => ({
      ...prev,
      locationPermissionGranted: true,
      showLocationPermissions: false,
      showNavigation: true,
    }));
  }, []);

  const handlePermissionDenied = useCallback(() => {
    setUIState((prev) => ({
      ...prev,
      showLocationPermissions: false,
      navigationTarget: null,
      locationPermissionGranted: false,
    }));
  }, []);

  // Handler de error global
  const setGlobalError = useCallback((error: string | null) => {
    setUIState((prev) => ({ ...prev, globalError: error }));
  }, []);

  const handleGlobalErrorDismiss = useCallback(() => {
    setUIState((prev) => ({ ...prev, globalError: null }));
  }, []);

  // Handlers de toggle (útiles para algunos casos)
  const toggleSettings = useCallback(() => {
    setUIState((prev) => ({ ...prev, showSettings: !prev.showSettings }));
  }, []);

  const toggleStats = useCallback(() => {
    setUIState((prev) => ({ ...prev, showStats: !prev.showStats }));
  }, []);

  return {
    // Estados
    ...uiState,

    // Handlers de vista
    setCurrentView,

    // Handlers de modales
    showSettingsHandler,
    hideSettingsHandler,
    showStatsHandler,
    hideStatsHandler,
    toggleSettings,
    toggleStats,

    // Handlers de navegación
    startNavigation,
    closeNavigation,
    handlePermissionGranted,
    handlePermissionDenied,

    // Handlers de error
    setGlobalError,
    handleGlobalErrorDismiss,
  };
};
