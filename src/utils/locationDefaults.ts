// utils/locationDefaults.ts
import React from "react";
import { toast } from "sonner";
import { Button, Input } from "@/shared/ui";
import type { CarLocation } from "@/types/location";
import { LocationUtils } from "./locationUtils";

const STORAGE_KEY_LAST_LOCATION = "user-last-known-location";
const STORAGE_KEY_USER_PREFERENCES_LOCATION = "user-preferred-default-location";

interface StoredLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
  source: "gps" | "manual" | "saved_location";
}

interface UserLocationPreference {
  latitude: number;
  longitude: number;
  name: string;
  address?: string;
  isDefault: boolean;
}

export class LocationManager {
  private static readonly MADRID_COORDS: [number, number] = [40.4168, -3.7038];
  private static readonly LOCATION_EXPIRE_TIME = 7 * 24 * 60 * 60 * 1000; // 7 días

  /**
   * Obtiene la mejor ubicación inicial basada en prioridades:
   * 1. Ubicación preferida del usuario
   * 2. Última ubicación conocida (si es reciente)
   * 3. Ubicación de la última ubicación guardada
   * 4. Ubicación actual del GPS (si está disponible)
   * 5. Madrid como fallback
   */
  static async getBestInitialLocation(savedLocations?: CarLocation[]): Promise<{
    coordinates: [number, number];
    source: string;
    zoom: number;
  }> {
    // 1. Ubicación preferida del usuario
    const preferredLocation = this.getUserPreferredLocation();
    if (preferredLocation && preferredLocation.isDefault) {
      return {
        coordinates: [preferredLocation.latitude, preferredLocation.longitude],
        source: `Ubicación preferida: ${preferredLocation.name}`,
        zoom: 13,
      };
    }

    // 2. Última ubicación conocida (si es reciente)
    const lastKnownLocation = this.getLastKnownLocation();
    if (lastKnownLocation && this.isLocationRecent(lastKnownLocation.timestamp)) {
      return {
        coordinates: [lastKnownLocation.latitude, lastKnownLocation.longitude],
        source: "Última ubicación conocida",
        zoom: 13,
      };
    }

    // 3. Ubicación de la última ubicación guardada
    if (savedLocations && savedLocations.length > 0) {
      const lastSaved = savedLocations[0]; // Ya están ordenadas por fecha
      return {
        coordinates: [lastSaved.latitude, lastSaved.longitude],
        source: "Última ubicación guardada",
        zoom: 15,
      };
    }

    // 4. Intentar obtener ubicación actual del GPS (con timeout corto)
    try {
      const currentLocation = await this.getCurrentLocationQuick();
      if (currentLocation) {
        // Guardar como última ubicación conocida
        this.saveLastKnownLocation(currentLocation.latitude, currentLocation.longitude, "gps");
        return {
          coordinates: [currentLocation.latitude, currentLocation.longitude],
          source: "Ubicación actual (GPS)",
          zoom: 15,
        };
      }
    } catch (error) {
      console.log("No se pudo obtener ubicación GPS rápidamente");
    }

    // 5. Fallback a Madrid
    return {
      coordinates: this.MADRID_COORDS,
      source: "Ubicación por defecto (Madrid)",
      zoom: 6, // Zoom más alejado para que sea más fácil navegar
    };
  }

  /**
   * Obtiene la ubicación actual del GPS con timeout corto
   */
  private static getCurrentLocationQuick(): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      const timeoutId = setTimeout(() => {
        resolve(null);
      }, 3000); // Timeout de 3 segundos

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          clearTimeout(timeoutId);
          resolve(null);
        },
        {
          enableHighAccuracy: false, // Más rápido
          timeout: 2500,
          maximumAge: 10 * 60 * 1000, // Aceptar ubicación de hace 10 minutos
        }
      );
    });
  }

  /**
   * Guarda la última ubicación conocida del usuario
   */
  static saveLastKnownLocation(latitude: number, longitude: number, source: "gps" | "manual" | "saved_location"): void {
    try {
      const location: StoredLocation = {
        latitude,
        longitude,
        timestamp: Date.now(),
        source,
      };
      localStorage.setItem(STORAGE_KEY_LAST_LOCATION, JSON.stringify(location));
    } catch (error) {
      console.error("Error saving last known location:", error);
    }
  }

  /**
   * Obtiene la última ubicación conocida del usuario
   */
  static getLastKnownLocation(): StoredLocation | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LAST_LOCATION);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredLocation;
        // Validar que los datos sean válidos
        if (
          typeof parsed.latitude === "number" &&
          typeof parsed.longitude === "number" &&
          parsed.latitude >= -90 &&
          parsed.latitude <= 90 &&
          parsed.longitude >= -180 &&
          parsed.longitude <= 180
        ) {
          return parsed;
        }
      }
    } catch (error) {
      console.error("Error getting last known location:", error);
    }
    return null;
  }

  /**
   * Verifica si una ubicación es reciente (menos de 7 días)
   */
  private static isLocationRecent(timestamp: number): boolean {
    return Date.now() - timestamp < this.LOCATION_EXPIRE_TIME;
  }

  /**
   * Guarda una ubicación como preferida del usuario
   */
  static saveUserPreferredLocation(
    latitude: number,
    longitude: number,
    name: string,
    address?: string,
    isDefault: boolean = true
  ): void {
    try {
      const preference: UserLocationPreference = {
        latitude,
        longitude,
        name,
        address,
        isDefault,
      };
      localStorage.setItem(STORAGE_KEY_USER_PREFERENCES_LOCATION, JSON.stringify(preference));
    } catch (error) {
      console.error("Error saving user preferred location:", error);
    }
  }

  /**
   * Obtiene la ubicación preferida del usuario
   */
  static getUserPreferredLocation(): UserLocationPreference | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER_PREFERENCES_LOCATION);
      if (stored) {
        const parsed = JSON.parse(stored) as UserLocationPreference;
        if (
          typeof parsed.latitude === "number" &&
          typeof parsed.longitude === "number" &&
          parsed.latitude >= -90 &&
          parsed.latitude <= 90 &&
          parsed.longitude >= -180 &&
          parsed.longitude <= 180
        ) {
          return parsed;
        }
      }
    } catch (error) {
      console.error("Error getting user preferred location:", error);
    }
    return null;
  }

  /**
   * Elimina la ubicación preferida del usuario
   */
  static clearUserPreferredLocation(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_USER_PREFERENCES_LOCATION);
    } catch (error) {
      console.error("Error clearing user preferred location:", error);
    }
  }

  /**
   * Actualiza la última ubicación conocida cuando el usuario interactúa con el mapa
   */
  static updateLastKnownLocationFromInteraction(latitude: number, longitude: number): void {
    // Solo actualizar si la nueva ubicación está a más de 1km de la anterior
    const lastKnown = this.getLastKnownLocation();
    if (!lastKnown || this.calculateDistance(lastKnown.latitude, lastKnown.longitude, latitude, longitude) > 1000) {
      this.saveLastKnownLocation(latitude, longitude, "manual");
    }
  }

  /**
   * Calcula la distancia entre dos puntos en metros
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Obtiene información sobre el origen de la ubicación actual
   */
  static getLocationSourceInfo(): { hasPreferred: boolean; hasRecent: boolean; hasSaved: boolean } {
    const preferred = this.getUserPreferredLocation();
    const lastKnown = this.getLastKnownLocation();
    const savedLocations = JSON.parse(localStorage.getItem("car-locations") || "[]");

    return {
      hasPreferred: !!(preferred && preferred.isDefault),
      hasRecent: !!(lastKnown && this.isLocationRecent(lastKnown.timestamp)),
      hasSaved: savedLocations.length > 0,
    };
  }
}

export const useSmartLocation = () => {
  const [initialLocation, setInitialLocation] = React.useState<{
    coordinates: [number, number];
    source: string;
    zoom: number;
  } | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadInitialLocation = async () => {
      try {
        const savedLocations = JSON.parse(localStorage.getItem("car-locations") || "[]");
        const location = await LocationManager.getBestInitialLocation(savedLocations);
        setInitialLocation(location);
      } catch (error) {
        console.error("Error loading initial location:", error);
        setInitialLocation({
          coordinates: [40.4168, -3.7038],
          source: "Ubicación por defecto (error)",
          zoom: 6,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialLocation();
  }, []);

  const updateLastKnownLocation = React.useCallback((lat: number, lng: number) => {
    LocationManager.updateLastKnownLocationFromInteraction(lat, lng);
  }, []);

  const setPreferredLocation = React.useCallback((lat: number, lng: number, name: string) => {
    LocationManager.saveUserPreferredLocation(lat, lng, name, undefined, true);
  }, []);

  return {
    initialLocation,
    isLoading,
    updateLastKnownLocation,
    setPreferredLocation,
    locationSourceInfo: LocationManager.getLocationSourceInfo(),
  };
};

export const LocationPreferenceSettings: React.FC<{
  onPreferenceSet: (lat: number, lng: number, name: string) => void;
}> = ({ onPreferenceSet }) => {
  const [isSettingLocation, setIsSettingLocation] = React.useState(false);
  const [locationName, setLocationName] = React.useState("");
  const [pendingLocation, setPendingLocation] = React.useState<[number, number] | null>(null);
  const [pendingAddress, setPendingAddress] = React.useState<string | null>(null);
  const [isGettingAddress, setIsGettingAddress] = React.useState(false);

  //  Estado local para la preferencia actual
  const [currentPreference, setCurrentPreference] = React.useState<UserLocationPreference | null>(() =>
    LocationManager.getUserPreferredLocation()
  );

  //  useEffect para sincronizar el estado local con localStorage
  React.useEffect(() => {
    const updatePreference = () => {
      const preference = LocationManager.getUserPreferredLocation();
      setCurrentPreference(preference);
    };

    // Actualizar al montar
    updatePreference();

    // Escuchar cambios en localStorage (si la página está abierta en múltiples tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user-preferred-default-location") {
        updatePreference();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const getAddressFromCoordinates = React.useCallback(async (lat: number, lng: number) => {
    setIsGettingAddress(true);
    try {
      // Pequeña pausa para no saturar la API
      await new Promise((resolve) => setTimeout(resolve, 300));
      const address = await LocationUtils.reverseGeocode(lat, lng);
      setPendingAddress(address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } catch (error) {
      console.error("Error obteniendo dirección:", error);
      setPendingAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } finally {
      setIsGettingAddress(false);
    }
  }, []);

  const handleGetCurrentLocation = () => {
    setIsSettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setPendingLocation([lat, lng]);

        // Solo establecer nombre por defecto si el usuario no escribió nada
        if (!locationName.trim()) {
          setLocationName("Mi ubicación actual");
        }

        setIsSettingLocation(false);

        // Obtener la dirección de las coordenadas
        getAddressFromCoordinates(lat, lng);
      },
      (error) => {
        console.error("Error getting location:", error);
        toast.error("No se pudo obtener tu ubicación");
        setIsSettingLocation(false);
      }
    );
  };

  const handleSavePreference = () => {
    if (pendingLocation && locationName.trim()) {
      //  Guardar con la dirección incluida
      LocationManager.saveUserPreferredLocation(
        pendingLocation[0],
        pendingLocation[1],
        locationName.trim(),
        pendingAddress || undefined,
        true
      );

      //  Actualizar el estado local inmediatamente
      setCurrentPreference({
        latitude: pendingLocation[0],
        longitude: pendingLocation[1],
        name: locationName.trim(),
        address: pendingAddress || undefined,
        isDefault: true,
      });

      onPreferenceSet(pendingLocation[0], pendingLocation[1], locationName.trim());
      setPendingLocation(null);
      setPendingAddress(null);
      setLocationName("");
      toast.success("Ubicación preferida guardada");
    }
  };

  const handleClearPreference = () => {
    LocationManager.clearUserPreferredLocation();

    //  Actualizar el estado local inmediatamente
    setCurrentPreference(null);

    toast.success("Ubicación preferida eliminada");
  };

  return React.createElement(
    "div",
    { className: "space-y-4" },
    React.createElement(
      "div",
      null,
      React.createElement("h4", { className: "font-medium" }, "Ubicación inicial preferida"),
      React.createElement(
        "p",
        { className: "text-sm text-muted-foreground" },
        "La app se centrará aquí al abrir por primera vez"
      )
    ),
    currentPreference
      ? React.createElement(
          "div",
          {
            className: "p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg",
          },
          React.createElement(
            "div",
            { className: "flex items-start justify-between gap-3" },
            React.createElement(
              "div",
              { className: "flex-1 min-w-0" },
              React.createElement(
                "p",
                { className: "font-medium text-green-800 dark:text-green-200 truncate" },
                currentPreference.name
              ),
              //  MOSTRAR LA DIRECCIÓN SI EXISTE, SINO LAS COORDENADAS
              currentPreference.address
                ? React.createElement(
                    "p",
                    { className: "text-sm text-green-600 dark:text-green-400 break-words" },
                    currentPreference.address
                  )
                : React.createElement(
                    "p",
                    { className: "text-xs text-green-600 dark:text-green-400" },
                    `${currentPreference.latitude.toFixed(4)}, ${currentPreference.longitude.toFixed(4)}`
                  )
            ),
            React.createElement(
              Button,
              {
                variant: "outline",
                size: "sm",
                onClick: handleClearPreference,
                className: "shrink-0",
              },
              "Eliminar"
            )
          )
        )
      : React.createElement(
          "div",
          { className: "space-y-3" },
          React.createElement(
            "div",
            { className: "flex gap-2" },
            React.createElement(Input, {
              placeholder: "Nombre de la ubicación (ej: Mi casa)",
              value: locationName,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => setLocationName(e.target.value),
              className: "flex-1",
            }),
            React.createElement(
              Button,
              { variant: "outline", onClick: handleGetCurrentLocation, disabled: isSettingLocation },
              isSettingLocation ? "Obteniendo..." : "Usar actual"
            )
          ),
          pendingLocation &&
            React.createElement(
              "div",
              {
                className:
                  "p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2",
              },
              React.createElement(
                "div",
                { className: "flex items-start gap-2" },
                React.createElement("div", { className: "text-blue-600 dark:text-blue-400 text-lg" }, "📍"),
                React.createElement(
                  "div",
                  { className: "flex-1 min-w-0" },
                  isGettingAddress
                    ? React.createElement(
                        "div",
                        { className: "flex items-center gap-2" },
                        React.createElement("div", {
                          className: "animate-spin h-3 w-3 border border-blue-600 border-t-transparent rounded-full",
                        }),
                        React.createElement(
                          "span",
                          { className: "text-sm text-blue-700 dark:text-blue-300" },
                          "Obteniendo dirección..."
                        )
                      )
                    : React.createElement(
                        "div",
                        null,
                        pendingAddress &&
                          React.createElement(
                            "p",
                            { className: "text-sm font-medium text-blue-800 dark:text-blue-200 mb-1" },
                            pendingAddress
                          ),
                        React.createElement(
                          "p",
                          { className: "text-xs text-blue-600 dark:text-blue-400 opacity-75" },
                          `${pendingLocation[0].toFixed(4)}, ${pendingLocation[1].toFixed(4)}`
                        )
                      )
                )
              ),
              React.createElement(
                Button,
                {
                  size: "sm",
                  onClick: handleSavePreference,
                  className: "w-full",
                  disabled: !locationName.trim() || isGettingAddress,
                },
                "Guardar como preferida"
              )
            )
        )
  );
};
