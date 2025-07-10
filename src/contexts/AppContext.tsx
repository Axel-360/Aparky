// src/contexts/AppContext.tsx
import React, { createContext, useContext, useReducer, useEffect } from "react";
import type { ReactNode } from "react";
import type { CarLocation, UserPreferences } from "@/types/location";
import { getCarLocations, saveCarLocation, deleteCarLocation, updateCarLocation } from "@/utils/storage";
import { getUserPreferences, saveUserPreferences } from "@/utils/preferences";
import { timerManager } from "@/utils/timerManager";
import { toast } from "sonner";

interface AppState {
  locations: CarLocation[];
  preferences: UserPreferences;
  isLoading: boolean;
  error: string | null;
  mapCenter: [number, number];
  mapZoom: number;
  selectedLocationId?: string;
  currentView: "map" | "proximity";
}

type AppAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_LOCATIONS"; payload: CarLocation[] }
  | { type: "ADD_LOCATION"; payload: CarLocation }
  | { type: "UPDATE_LOCATION"; payload: { id: string; updates: Partial<CarLocation> } }
  | { type: "DELETE_LOCATION"; payload: string }
  | { type: "SET_PREFERENCES"; payload: Partial<UserPreferences> }
  | { type: "SET_MAP_STATE"; payload: { center?: [number, number]; zoom?: number; selectedId?: string } }
  | { type: "SET_VIEW"; payload: "map" | "proximity" }
  | { type: "INIT_APP"; payload: { locations: CarLocation[]; preferences: UserPreferences } };

const initialState: AppState = {
  locations: [],
  preferences: getUserPreferences(),
  isLoading: true,
  error: null,
  mapCenter: [40.4168, -3.7038],
  mapZoom: 13,
  selectedLocationId: undefined,
  currentView: "map",
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "SET_LOCATIONS":
      return { ...state, locations: action.payload };

    case "ADD_LOCATION":
      return {
        ...state,
        locations: [action.payload, ...state.locations],
        mapCenter: [action.payload.latitude, action.payload.longitude],
        mapZoom: 15,
        selectedLocationId: action.payload.id,
      };

    case "UPDATE_LOCATION":
      return {
        ...state,
        locations: state.locations.map((loc) =>
          loc.id === action.payload.id ? { ...loc, ...action.payload.updates } : loc
        ),
      };

    case "DELETE_LOCATION":
      return {
        ...state,
        locations: state.locations.filter((loc) => loc.id !== action.payload),
        selectedLocationId: state.selectedLocationId === action.payload ? undefined : state.selectedLocationId,
      };

    case "SET_PREFERENCES":
      const newPreferences = { ...state.preferences, ...action.payload };
      return { ...state, preferences: newPreferences };

    case "SET_MAP_STATE":
      return {
        ...state,
        mapCenter: action.payload.center || state.mapCenter,
        mapZoom: action.payload.zoom || state.mapZoom,
        selectedLocationId:
          action.payload.selectedId !== undefined ? action.payload.selectedId : state.selectedLocationId,
      };

    case "SET_VIEW":
      return { ...state, currentView: action.payload };

    case "INIT_APP":
      const firstLocation = action.payload.locations[0];
      return {
        ...state,
        locations: action.payload.locations,
        preferences: action.payload.preferences,
        isLoading: false,
        mapCenter: firstLocation ? [firstLocation.latitude, firstLocation.longitude] : state.mapCenter,
        mapZoom: firstLocation ? 15 : state.mapZoom,
      };

    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  actions: {
    saveLocation: (location: CarLocation) => Promise<void>;
    updateLocation: (id: string, updates: Partial<CarLocation>) => Promise<void>;
    deleteLocation: (id: string) => Promise<void>;
    selectLocation: (location: CarLocation) => void;

    updatePreferences: (preferences: Partial<UserPreferences>) => void;

    setMapState: (center?: [number, number], zoom?: number, selectedId?: string) => void;
    setView: (view: "map" | "proximity") => void;
    setError: (error: string | null) => void;

    extendTimer: (locationId: string, minutes: number) => Promise<void>;
    cancelTimer: (locationId: string) => Promise<void>;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        dispatch({ type: "SET_LOADING", payload: true });

        const locations = getCarLocations();
        const preferences = getUserPreferences();

        locations.forEach((location) => {
          if (location.expiryTime && location.expiryTime > Date.now()) {
            timerManager.scheduleTimer(location);
          }
        });

        dispatch({ type: "INIT_APP", payload: { locations, preferences } });
      } catch (error) {
        console.error("Error initializing app:", error);
        dispatch({ type: "SET_ERROR", payload: "Error al cargar la aplicación" });
      }
    };

    initializeApp();
  }, []);

  const saveLocation = async (location: CarLocation) => {
    try {
      saveCarLocation(location);
      dispatch({ type: "ADD_LOCATION", payload: location });

      if (location.expiryTime && location.expiryTime > Date.now()) {
        timerManager.scheduleTimer(location);
      }

      toast.success("Ubicación guardada correctamente");
    } catch (error) {
      console.error("Error saving location:", error);
      dispatch({ type: "SET_ERROR", payload: "No se pudo guardar la ubicación" });
      toast.error("Error al guardar la ubicación");
    }
  };

  const updateLocationAction = async (id: string, updates: Partial<CarLocation>) => {
    try {
      updateCarLocation(id, updates);
      dispatch({ type: "UPDATE_LOCATION", payload: { id, updates } });

      const updatedLocation = state.locations.find((loc) => loc.id === id);
      if (updatedLocation && updates.expiryTime) {
        const newLocation = { ...updatedLocation, ...updates };
        timerManager.scheduleTimer(newLocation);
      }

      toast.success("Ubicación actualizada");
    } catch (error) {
      console.error("Error updating location:", error);
      dispatch({ type: "SET_ERROR", payload: "No se pudo actualizar la ubicación" });
      toast.error("Error al actualizar la ubicación");
    }
  };

  const deleteLocationAction = async (id: string) => {
    try {
      deleteCarLocation(id);
      dispatch({ type: "DELETE_LOCATION", payload: id });
      timerManager.cancelTimer(id);
      toast.success("Ubicación eliminada");
    } catch (error) {
      console.error("Error deleting location:", error);
      dispatch({ type: "SET_ERROR", payload: "No se pudo eliminar la ubicación" });
      toast.error("Error al eliminar la ubicación");
    }
  };

  const selectLocation = (location: CarLocation) => {
    dispatch({
      type: "SET_MAP_STATE",
      payload: {
        center: [location.latitude, location.longitude],
        zoom: 15,
        selectedId: location.id,
      },
    });
    dispatch({ type: "SET_VIEW", payload: "map" });
  };

  const updatePreferences = (preferences: Partial<UserPreferences>) => {
    try {
      saveUserPreferences(preferences);
      dispatch({ type: "SET_PREFERENCES", payload: preferences });
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast.error("Error al guardar las preferencias");
    }
  };

  const setMapState = (center?: [number, number], zoom?: number, selectedId?: string) => {
    dispatch({ type: "SET_MAP_STATE", payload: { center, zoom, selectedId } });
  };

  const setView = (view: "map" | "proximity") => {
    dispatch({ type: "SET_VIEW", payload: view });
  };

  const setError = (error: string | null) => {
    dispatch({ type: "SET_ERROR", payload: error });
  };

  const extendTimer = async (locationId: string, minutes: number) => {
    try {
      const location = state.locations.find((loc) => loc.id === locationId);
      if (!location || !location.expiryTime) return;

      const newExpiryTime = location.expiryTime + minutes * 60 * 1000;
      const newExtensionCount = (location.extensionCount || 0) + 1;
      const updates = { expiryTime: newExpiryTime, extensionCount: newExtensionCount };

      await updateLocationAction(locationId, updates);

      const updatedLocation = { ...location, ...updates };
      timerManager.scheduleTimer(updatedLocation);

      toast.success(`Temporizador extendido ${minutes} minutos`);
    } catch (error) {
      console.error("Error extending timer:", error);
      toast.error("Error al extender el Temporizador");
    }
  };

  const cancelTimer = async (locationId: string) => {
    try {
      const updates = {
        expiryTime: undefined,
        reminderMinutes: undefined,
        extensionCount: undefined,
      };

      await updateLocationAction(locationId, updates);
      timerManager.cancelTimer(locationId);

      toast.success("Temporizador cancelado");
    } catch (error) {
      console.error("Error canceling timer:", error);
      toast.error("Error al cancelar el temporizador");
    }
  };

  const contextValue: AppContextType = {
    state,
    actions: {
      saveLocation,
      updateLocation: updateLocationAction,
      deleteLocation: deleteLocationAction,
      selectLocation,
      updatePreferences,
      setMapState,
      setView,
      setError,
      extendTimer,
      cancelTimer,
    },
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useLocations = () => {
  const { state, actions } = useAppContext();
  return {
    locations: state.locations,
    isLoading: state.isLoading,
    saveLocation: actions.saveLocation,
    updateLocation: actions.updateLocation,
    deleteLocation: actions.deleteLocation,
    selectLocation: actions.selectLocation,
  };
};

export const usePreferences = () => {
  const { state, actions } = useAppContext();
  return {
    preferences: state.preferences,
    updatePreferences: actions.updatePreferences,
  };
};

export const useMapState = () => {
  const { state, actions } = useAppContext();
  return {
    mapCenter: state.mapCenter,
    mapZoom: state.mapZoom,
    selectedLocationId: state.selectedLocationId,
    setMapState: actions.setMapState,
  };
};

export const useCurrentView = () => {
  const { state, actions } = useAppContext();
  return {
    currentView: state.currentView,
    setView: actions.setView,
  };
};

export const useTimers = () => {
  const { actions } = useAppContext();
  return {
    extendTimer: actions.extendTimer,
    cancelTimer: actions.cancelTimer,
  };
};
