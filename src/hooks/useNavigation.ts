// src/hooks/useNavigation.ts
import { useState, useEffect, useCallback, useRef } from "react";
import type { CarLocation, NavigationLocation } from "../types/location";

export interface NavigationState {
  isNavigating: boolean;
  currentDistance: number;
  estimatedArrival: Date | null;
  direction: string;
  nextInstruction?: string;
  progress: number; // 0-100
  speed?: number; // metros por segundo
}

export interface NavigationOptions {
  enableVoiceGuidance?: boolean;
  updateInterval?: number;
  arrivalThreshold?: number; // metros para considerar llegada
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

  // Referencias para limpiar efectos
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialDistanceRef = useRef<number | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  const lastNotificationDistanceRef = useRef<number>(Infinity);

  // Calcular distancia haversine
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }, []);

  // Calcular bearing (dirección)
  const calculateBearing = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y, x);
    return ((θ * 180) / Math.PI + 360) % 360;
  }, []);

  // Convertir bearing a dirección cardinal
  const getCardinalDirection = useCallback((bearing: number): string => {
    const directions = ["Norte", "Noreste", "Este", "Sureste", "Sur", "Suroeste", "Oeste", "Noroeste"];
    return directions[Math.round(bearing / 45) % 8];
  }, []);

  // Calcular velocidad
  const calculateSpeed = useCallback(
    (
      currentPos: { lat: number; lng: number; timestamp: number },
      lastPos: { lat: number; lng: number; timestamp: number }
    ): number => {
      const distance = calculateDistance(currentPos.lat, currentPos.lng, lastPos.lat, lastPos.lng);
      const timeDiff = (currentPos.timestamp - lastPos.timestamp) / 1000; // segundos

      if (timeDiff === 0) return 0;
      return distance / timeDiff; // metros por segundo
    },
    [calculateDistance]
  );

  // Texto a voz
  const speak = useCallback(
    (text: string) => {
      if (!enableVoiceGuidance || !speechSynthesisRef.current) return;

      // Cancelar habla anterior
      speechSynthesisRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "es-ES";
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;

      speechSynthesisRef.current.speak(utterance);
    },
    [enableVoiceGuidance]
  );

  // Vibrar dispositivo
  const vibrate = useCallback(
    (pattern: number | number[] = 200) => {
      if (!enableVibration || !("vibrate" in navigator)) return;
      navigator.vibrate(pattern);
    },
    [enableVibration]
  );

  // Generar instrucción de navegación
  const generateNavigationInstruction = useCallback(
    (distance: number, direction: string, speed?: number): string => {
      if (distance <= arrivalThreshold) {
        return "¡Ya has llegado! Tu coche debería estar muy cerca.";
      }

      if (distance <= 20) {
        return `Tu coche está a solo ${Math.round(distance)} metros. Búscalo hacia el ${direction.toLowerCase()}.`;
      }

      if (distance <= 100) {
        return `Estás muy cerca. Continúa ${Math.round(distance)} metros hacia el ${direction.toLowerCase()}.`;
      }

      if (distance <= 500) {
        return `Sigue hacia el ${direction.toLowerCase()} por ${Math.round(distance)} metros más.`;
      }

      const timeEstimate = speed && speed > 0 ? Math.round(distance / speed / 60) : Math.round(distance / 83.33);
      return `Dirígete hacia el ${direction.toLowerCase()}. Distancia: ${Math.round(distance)}m (≈${timeEstimate} min)`;
    },
    [arrivalThreshold]
  );

  // Manejar notificaciones de proximidad
  const handleProximityNotifications = useCallback(
    (distance: number) => {
      if (!enableNotifications || Notification.permission !== "granted") return;

      const thresholds = [100, 50, 20];

      for (const threshold of thresholds) {
        if (distance <= threshold && lastNotificationDistanceRef.current > threshold) {
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
            icon: "🚗",
            tag: `navigation-${threshold}`,
            silent: false,
          });

          vibrate(vibrationPattern);
          speak(message);
          break;
        }
      }

      lastNotificationDistanceRef.current = distance;
    },
    [enableNotifications, vibrate, speak]
  );

  // Actualizar posición y navegación
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

      // Calcular velocidad si tenemos posición anterior
      let speed: number | undefined;
      if (lastPositionRef.current) {
        speed = calculateSpeed(
          { lat: newLocation.latitude, lng: newLocation.longitude, timestamp },
          lastPositionRef.current
        );
      }

      // Guardar posición actual para próximo cálculo
      lastPositionRef.current = {
        lat: newLocation.latitude,
        lng: newLocation.longitude,
        timestamp,
      };

      // Calcular progreso
      if (initialDistanceRef.current === null) {
        initialDistanceRef.current = distance;
      }

      const progress = Math.max(
        0,
        Math.min(100, ((initialDistanceRef.current - distance) / initialDistanceRef.current) * 100)
      );

      // Estimar tiempo de llegada
      const walkingSpeedMs = speed && speed > 0.5 ? speed : 1.39; // velocidad promedio caminando
      const estimatedSeconds = distance / walkingSpeedMs;
      const estimatedArrival = new Date(Date.now() + estimatedSeconds * 1000);

      // Generar instrucción
      const nextInstruction = generateNavigationInstruction(distance, direction, speed);

      setNavigationState((prev) => ({
        ...prev,
        currentDistance: distance,
        direction,
        nextInstruction,
        progress,
        estimatedArrival,
        speed,
      }));

      // Manejar notificaciones de proximidad
      handleProximityNotifications(distance);

      // Comprobar llegada
      if (distance <= arrivalThreshold && !hasArrived) {
        setHasArrived(true);
        onArrival();
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

  // Manejar llegada
  const onArrival = useCallback(() => {
    speak("¡Has llegado a tu destino! Tu coche debería estar muy cerca.");

    if (enableNotifications && Notification.permission === "granted") {
      new Notification("🎉 ¡Has llegado!", {
        body: "Tu coche debería estar visible desde aquí",
        icon: "🚗",
        requireInteraction: true,
        tag: "navigation-arrived",
      });
    }

    // Vibración de llegada
    vibrate([500, 200, 500, 200, 500]);

    // Detener navegación automáticamente (silencioso porque ya habló de llegada)
    setTimeout(() => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
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
    }, 2000);
  }, [speak, enableNotifications, vibrate]);

  // Manejar errores de geolocalización
  const handleGeolocationError = useCallback(
    (error: GeolocationPositionError) => {
      let errorMessage = "Error desconocido de geolocalización";

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Permiso de ubicación denegado. Por favor, permite el acceso a la ubicación.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Ubicación no disponible. Verifica tu conexión GPS.";
          break;
        case error.TIMEOUT:
          errorMessage = "Tiempo de espera agotado. Intentando de nuevo...";
          break;
      }

      setError(errorMessage);
      console.error("Geolocation error:", error);

      // Para timeout, intentar de nuevo
      if (error.code === error.TIMEOUT && navigationState.isNavigating) {
        setTimeout(() => {
          if (navigator.geolocation && watchIdRef.current === null) {
            startNavigation();
          }
        }, 3000);
      }
    },
    [navigationState.isNavigating]
  );

  // Inicializar Speech Synthesis
  useEffect(() => {
    if (enableVoiceGuidance && "speechSynthesis" in window) {
      speechSynthesisRef.current = window.speechSynthesis;
    }
  }, [enableVoiceGuidance]);

  // Iniciar navegación
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

    // Configurar opciones de geolocalización
    const watchOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
    };

    // Obtener posición inicial
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updatePosition(position);

        // Iniciar seguimiento continuo
        const watchId = navigator.geolocation.watchPosition(updatePosition, handleGeolocationError, watchOptions);

        watchIdRef.current = watchId;

        setNavigationState((prev) => ({
          ...prev,
          isNavigating: true,
        }));

        speak("Navegación iniciada hacia tu coche");

        // Solicitar permisos de notificación si no están concedidos
        if (enableNotifications && Notification.permission === "default") {
          Notification.requestPermission();
        }
      },
      handleGeolocationError,
      { ...watchOptions, timeout: 10000 }
    );
  }, [updatePosition, handleGeolocationError, speak, enableNotifications]);

  // Detener navegación
  const stopNavigation = useCallback(
    (silent: boolean = false) => {
      const wasNavigating = navigationState.isNavigating;

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
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

      // Solo hablar si realmente estaba navegando y no es un cierre silencioso
      if (wasNavigating && !silent) {
        speak("Navegación detenida");
      }
    },
    [navigationState.isNavigating, speak]
  );

  // Pausar/reanudar navegación
  const toggleNavigation = useCallback(() => {
    if (navigationState.isNavigating) {
      stopNavigation(false); // Con sonido porque es intencional
    } else {
      startNavigation();
    }
  }, [navigationState.isNavigating, stopNavigation, startNavigation]);

  // Función para detener silenciosamente (para usar al cerrar modal)
  const stopNavigationSilent = useCallback(() => {
    stopNavigation(true);
  }, [stopNavigation]);

  // Repetir última instrucción
  const repeatInstruction = useCallback(() => {
    if (navigationState.nextInstruction) {
      speak(navigationState.nextInstruction);
    } else if (navigationState.currentDistance > 0) {
      speak(
        `Tu coche está a ${Math.round(
          navigationState.currentDistance
        )} metros hacia el ${navigationState.direction.toLowerCase()}`
      );
    }
  }, [navigationState.nextInstruction, navigationState.currentDistance, navigationState.direction, speak]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }

      setNavigationState((prev) => ({
        ...prev,
        isNavigating: false,
        nextInstruction: undefined,
      }));
    };
  }, []);

  return {
    navigationState,
    currentLocation,
    error,
    hasArrived,
    startNavigation,
    stopNavigation,
    stopNavigationSilent,
    toggleNavigation,
    repeatInstruction,
    speak,
  };
};
