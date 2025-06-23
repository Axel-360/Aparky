// src/hooks/useGeolocation.ts
import { useState, useEffect, useRef } from "react";
import type { GeolocationError } from "../types/location";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: GeolocationError | null;
  loading: boolean;
  isWatching: boolean;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
    isWatching: false,
  });

  const watchId = useRef<number | null>(null);

  const getErrorMessage = (code: number): string => {
    switch (code) {
      case 1:
        return "Acceso a la ubicación denegado. Por favor, permite el acceso en tu navegador.";
      case 2:
        return "No se pudo obtener la ubicación. Verifica tu conexión a internet.";
      case 3:
        return "Tiempo agotado al obtener la ubicación. Inténtalo de nuevo.";
      default:
        return "Error desconocido al obtener la ubicación.";
    }
  };

  const getCurrentPosition = () => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: {
          code: 0,
          message: "Geolocalización no soportada por este navegador",
        },
        loading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false,
        }));
      },
      (error) => {
        setState((prev) => ({
          ...prev,
          error: {
            code: error.code,
            message: getErrorMessage(error.code),
          },
          loading: false,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000,
      }
    );
  };

  const startWatching = () => {
    if (!navigator.geolocation || state.isWatching) return;

    setState((prev) => ({ ...prev, isWatching: true, error: null }));

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        setState((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false,
        }));
      },
      (error) => {
        setState((prev) => ({
          ...prev,
          error: {
            code: error.code,
            message: getErrorMessage(error.code),
          },
          loading: false,
        }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 10000,
      }
    );
  };

  const stopWatching = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setState((prev) => ({ ...prev, isWatching: false }));
  };

  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  return {
    ...state,
    getCurrentPosition,
    startWatching,
    stopWatching,
  };
};
