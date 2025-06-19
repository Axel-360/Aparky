// src/hooks/useGeolocation.ts
import { useState } from "react";
import type { GeolocationError } from "../types/location";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: GeolocationError | null;
  loading: boolean;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
  });

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
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false,
        });
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
        timeout: 15000, // Aumentado a 15 segundos
        maximumAge: 300000, // 5 minutos
      }
    );
  };

  return {
    ...state,
    getCurrentPosition,
  };
};
