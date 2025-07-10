// src/features/navigation/hooks/useNavigation.ts
import { useState, useEffect, useCallback, useRef } from "react";
import type { CarLocation, NavigationLocation } from "@/types/location";

export interface NavigationState {
  isNavigating: boolean;
  currentDistance: number;
  estimatedArrival: Date | null;
  direction: string;
  nextInstruction?: string;
  progress: number;
  speed?: number;
  currentLocation?: { latitude: number; longitude: number };
  accuracy?: number;
}

export interface NavigationOptions {
  enableVoiceGuidance?: boolean;
  updateInterval?: number;
  arrivalThreshold?: number;
  enableNotifications?: boolean;
  enableVibration?: boolean;
}

export const useNavigation = (targetLocation: CarLocation, options: NavigationOptions = {}) => {
  const {
    enableVoiceGuidance = false,
    arrivalThreshold = 15,
    enableNotifications = true,
    enableVibration = true,
  } = options;

  const [navigationState, setNavigationState] = useState<NavigationState>({
    isNavigating: false,
    currentDistance: 0,
    estimatedArrival: null,
    direction: "",
    progress: 0,
  });

  const [currentLocation, setCurrentLocation] = useState<NavigationLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasArrived, setHasArrived] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const initialDistanceRef = useRef<number | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  const lastNotificationDistanceRef = useRef<number>(Infinity);
  const consecutiveArrivalsRef = useRef<number>(0);

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }, []);

  const calculateBearing = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y, x);
    return ((θ * 180) / Math.PI + 360) % 360;
  }, []);

  const getCardinalDirection = useCallback((bearing: number): string => {
    const directions = [
      "Norte",
      "Norte-Noreste",
      "Noreste",
      "Este-Noreste",
      "Este",
      "Este-Sureste",
      "Sureste",
      "Sur-Sureste",
      "Sur",
      "Sur-Suroeste",
      "Suroeste",
      "Oeste-Suroeste",
      "Oeste",
      "Oeste-Noroeste",
      "Noroeste",
      "Norte-Noroeste",
    ];
    return directions[Math.round(bearing / 22.5) % 16];
  }, []);

  const calculateSpeed = useCallback(
    (
      currentPos: { lat: number; lng: number; timestamp: number },
      lastPos: { lat: number; lng: number; timestamp: number }
    ): number => {
      const distance = calculateDistance(currentPos.lat, currentPos.lng, lastPos.lat, lastPos.lng);
      const timeDiff = (currentPos.timestamp - lastPos.timestamp) / 1000;

      if (timeDiff === 0 || timeDiff > 30) return 0;

      const speed = distance / timeDiff;

      return speed > 15 ? 0 : speed;
    },
    [calculateDistance]
  );

  const speak = useCallback(
    (text: string) => {
      if (!enableVoiceGuidance || !speechSynthesisRef.current) return;

      try {
        speechSynthesisRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "es-ES";
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;

        speechSynthesisRef.current.speak(utterance);
      } catch (error) {
        console.warn("Error en síntesis de voz:", error);
      }
    },
    [enableVoiceGuidance]
  );

  const vibrate = useCallback(
    (pattern: number | number[] = 200) => {
      if (!enableVibration || !("vibrate" in navigator)) return;
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        console.warn("Error en vibración:", error);
      }
    },
    [enableVibration]
  );

  const generateNavigationInstruction = useCallback(
    (distance: number, direction: string, speed?: number, accuracy?: number): string => {
      const effectiveDistance = accuracy && accuracy > 10 ? Math.max(distance, accuracy) : distance;

      if (effectiveDistance <= arrivalThreshold) {
        return "¡Has llegado! Tu coche debería estar muy cerca.";
      }

      if (effectiveDistance <= 20) {
        return `Tu coche está a solo ${Math.round(
          effectiveDistance
        )} metros. Búscalo hacia el ${direction.toLowerCase()}.`;
      }

      if (effectiveDistance <= 50) {
        return `Muy cerca. Continúa ${Math.round(effectiveDistance)} metros hacia el ${direction.toLowerCase()}.`;
      }

      if (effectiveDistance <= 100) {
        return `Estás cerca. Sigue ${Math.round(effectiveDistance)} metros hacia el ${direction.toLowerCase()}.`;
      }

      if (effectiveDistance <= 500) {
        return `Sigue hacia el ${direction.toLowerCase()} por ${Math.round(effectiveDistance)} metros más.`;
      }

      const walkingSpeed = speed && speed > 0.5 && speed < 3 ? speed : 1.39;
      const timeEstimate = Math.round(effectiveDistance / walkingSpeed / 60);

      return `Dirígete hacia el ${direction.toLowerCase()}. Distancia: ${Math.round(
        effectiveDistance
      )}m (≈${timeEstimate} min)`;
    },
    [arrivalThreshold]
  );

  const handleProximityNotifications = useCallback(
    (distance: number, accuracy?: number) => {
      if (!enableNotifications || Notification.permission !== "granted") return;

      const effectiveDistance = accuracy && accuracy > 10 ? Math.max(distance, accuracy) : distance;
      const thresholds = [100, 50, 20];

      for (const threshold of thresholds) {
        if (effectiveDistance <= threshold && lastNotificationDistanceRef.current > threshold) {
          let message = "";
          let vibrationPattern: number[] = [200];

          switch (threshold) {
            case 100:
              message = "Te estás acercando a tu coche (100m)";
              vibrationPattern = [100];
              break;
            case 50:
              message = "Muy cerca de tu coche (50m)";
              vibrationPattern = [200, 100, 200];
              break;
            case 20:
              message = "¡Tu coche está muy cerca! (20m)";
              vibrationPattern = [300, 100, 300, 100, 300];
              break;
          }

          new Notification("🎯 Navegación", {
            body: message,
            icon: "/favicon.ico",
            tag: `navigation-${threshold}`,
            silent: false,
          });

          vibrate(vibrationPattern);
          speak(message);
          break;
        }
      }

      lastNotificationDistanceRef.current = effectiveDistance;
    },
    [enableNotifications, vibrate, speak]
  );

  const updatePosition = useCallback(
    (position: GeolocationPosition) => {
      const timestamp = Date.now();
      const newLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp,
      };

      setCurrentLocation(newLocation);
      setError(null);

      if (!targetLocation) return;

      const distance = calculateDistance(
        newLocation.latitude,
        newLocation.longitude,
        targetLocation.latitude,
        targetLocation.longitude
      );

      const bearing = calculateBearing(
        newLocation.latitude,
        newLocation.longitude,
        targetLocation.latitude,
        targetLocation.longitude
      );

      const direction = getCardinalDirection(bearing);

      let speed: number | undefined;
      if (lastPositionRef.current) {
        speed = calculateSpeed(
          { lat: newLocation.latitude, lng: newLocation.longitude, timestamp },
          lastPositionRef.current
        );
      }

      lastPositionRef.current = {
        lat: newLocation.latitude,
        lng: newLocation.longitude,
        timestamp,
      };

      if (initialDistanceRef.current === null) {
        initialDistanceRef.current = distance;
      }

      const progress = Math.max(
        0,
        Math.min(100, ((initialDistanceRef.current - distance) / initialDistanceRef.current) * 100)
      );

      const walkingSpeedMs = speed && speed > 0.5 && speed < 3 ? speed : 1.39;
      const estimatedSeconds = distance / walkingSpeedMs;
      const estimatedArrival = new Date(Date.now() + estimatedSeconds * 1000);

      const nextInstruction = generateNavigationInstruction(distance, direction, speed, newLocation.accuracy);

      setNavigationState((prev) => ({
        ...prev,
        currentDistance: distance,
        direction,
        nextInstruction,
        progress,
        estimatedArrival,
        speed,
        accuracy: newLocation.accuracy,
        currentLocation: { latitude: newLocation.latitude, longitude: newLocation.longitude },
      }));

      handleProximityNotifications(distance, newLocation.accuracy);

      const effectiveThreshold =
        newLocation.accuracy && newLocation.accuracy > arrivalThreshold ? newLocation.accuracy * 1.5 : arrivalThreshold;

      if (distance <= effectiveThreshold) {
        consecutiveArrivalsRef.current += 1;
        if (consecutiveArrivalsRef.current >= 2 && !hasArrived) {
          setHasArrived(true);
          onArrival();
        }
      } else {
        consecutiveArrivalsRef.current = 0;
      }
    },
    [
      targetLocation,
      calculateDistance,
      calculateBearing,
      getCardinalDirection,
      calculateSpeed,
      generateNavigationInstruction,
      handleProximityNotifications,
      arrivalThreshold,
      hasArrived,
    ]
  );

  const onArrival = useCallback(() => {
    speak("¡Has llegado a tu destino! Tu coche debería estar muy cerca.");

    if (enableNotifications && Notification.permission === "granted") {
      new Notification("🎉 ¡Has llegado!", {
        body: "Tu coche debería estar visible desde aquí",
        icon: "/favicon.ico",
        requireInteraction: true,
        tag: "navigation-arrived",
      });
    }

    vibrate([500, 200, 500, 200, 500]);

    setTimeout(() => {
      stopNavigation(true);
    }, 3000);
  }, [speak, enableNotifications, vibrate]);

  const handleGeolocationError = useCallback(
    (error: GeolocationPositionError) => {
      let errorMessage = "Error desconocido de geolocalización";

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Permiso de ubicación denegado. Por favor, permite el acceso a la ubicación en tu navegador.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Ubicación no disponible. Verifica que el GPS esté activado y tengas buena señal.";
          break;
        case error.TIMEOUT:
          errorMessage = "Tiempo de espera agotado obteniendo ubicación. Intentando de nuevo...";
          break;
      }

      setError(errorMessage);
      console.error("Geolocation error:", error);

      if (error.code === error.TIMEOUT && navigationState.isNavigating) {
        setTimeout(() => {
          if (navigator.geolocation && navigationState.isNavigating) {
            const fallbackOptions: PositionOptions = {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 60000,
            };

            navigator.geolocation.getCurrentPosition(updatePosition, handleGeolocationError, fallbackOptions);
          }
        }, 2000);
      }
    },
    [navigationState.isNavigating, updatePosition]
  );

  useEffect(() => {
    if (enableVoiceGuidance && "speechSynthesis" in window) {
      speechSynthesisRef.current = window.speechSynthesis;
    }
  }, [enableVoiceGuidance]);

  const startNavigation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocalización no disponible en este dispositivo");
      return;
    }

    setError(null);
    setHasArrived(false);
    initialDistanceRef.current = null;
    lastPositionRef.current = null;
    lastNotificationDistanceRef.current = Infinity;
    consecutiveArrivalsRef.current = 0;

    const watchOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 3000,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updatePosition(position);

        const watchId = navigator.geolocation.watchPosition(updatePosition, handleGeolocationError, watchOptions);

        watchIdRef.current = watchId;

        setNavigationState((prev) => ({
          ...prev,
          isNavigating: true,
        }));

        speak("Navegación iniciada hacia tu coche");

        if (enableNotifications && Notification.permission === "default") {
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
              new Notification("🎯 Navegación activa", {
                body: "Te notificaremos cuando te acerques a tu coche",
                icon: "/favicon.ico",
                tag: "navigation-started",
              });
            }
          });
        }
      },
      handleGeolocationError,
      { ...watchOptions, timeout: 10000 }
    );
  }, [updatePosition, handleGeolocationError, speak, enableNotifications]);

  const stopNavigation = useCallback(
    (silent: boolean = false) => {
      const wasNavigating = navigationState.isNavigating;

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }

      setNavigationState((prev) => ({
        ...prev,
        isNavigating: false,
        nextInstruction: undefined,
      }));

      lastNotificationDistanceRef.current = Infinity;
      consecutiveArrivalsRef.current = 0;

      if (wasNavigating && !silent) {
        speak("Navegación detenida");
      }
    },
    [navigationState.isNavigating, speak]
  );

  const toggleNavigation = useCallback(() => {
    if (navigationState.isNavigating) {
      stopNavigation(false);
    } else {
      startNavigation();
    }
  }, [navigationState.isNavigating, stopNavigation, startNavigation]);

  const repeatInstruction = useCallback(() => {
    if (hasArrived) {
      speak("Has llegado a tu destino. Tu coche debería estar muy cerca.");
      return;
    }

    if (navigationState.nextInstruction) {
      speak(navigationState.nextInstruction);
    } else if (navigationState.currentDistance > 0) {
      const distance = Math.round(navigationState.currentDistance);
      const direction = navigationState.direction.toLowerCase();
      speak(`Tu coche está a ${distance} metros hacia el ${direction}`);
    } else {
      speak("Obteniendo tu ubicación para calcular la ruta hacia tu coche");
    }
  }, [hasArrived, navigationState.nextInstruction, navigationState.currentDistance, navigationState.direction, speak]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
    };
  }, []);

  return {
    navigationState,
    currentLocation,
    error,
    hasArrived,
    startNavigation,
    stopNavigation,
    toggleNavigation,
    repeatInstruction,
    speak,
  };
};
