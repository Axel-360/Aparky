// src/hooks/useUIState.ts
import { useState, useCallback } from "react";
import type { CarLocation } from "@/types/location";

interface UIState {
  currentView: "map" | "proximity";

  showSettings: boolean;
  showStats: boolean;
  showNavigation: boolean;
  showLocationPermissions: boolean;

  navigationTarget: CarLocation | null;
  locationPermissionGranted: boolean;

  globalError: string | null;
}

export const useUIState = () => {
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

  const setCurrentView = useCallback((view: "map" | "proximity") => {
    setUIState((prev) => ({ ...prev, currentView: view }));
  }, []);

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

  const setGlobalError = useCallback((error: string | null) => {
    setUIState((prev) => ({ ...prev, globalError: error }));
  }, []);

  const handleGlobalErrorDismiss = useCallback(() => {
    setUIState((prev) => ({ ...prev, globalError: null }));
  }, []);

  const toggleSettings = useCallback(() => {
    setUIState((prev) => ({ ...prev, showSettings: !prev.showSettings }));
  }, []);

  const toggleStats = useCallback(() => {
    setUIState((prev) => ({ ...prev, showStats: !prev.showStats }));
  }, []);

  return {
    ...uiState,

    setCurrentView,

    showSettingsHandler,
    hideSettingsHandler,
    showStatsHandler,
    hideStatsHandler,
    toggleSettings,
    toggleStats,

    startNavigation,
    closeNavigation,
    handlePermissionGranted,
    handlePermissionDenied,

    setGlobalError,
    handleGlobalErrorDismiss,
  };
};
