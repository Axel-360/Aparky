// src/features/navigation/hooks/useNavigation.ts
import { useState, useEffect, useCallback, useRef } from "react";
import type { CarLocation, NavigationLocation } from "@/types/location";

export interface NavigationState {
  isNavigating: boolean;
  currentDistance: number;
  estimatedArrival: Date | null;
  direction: string;
  nextInstruction?: string;
  progress: number; // 0-100
  speed?: number; // metros por segundo
  currentLocation?: { latitude: number; longitude: number };
  accuracy?: number;
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
  const initialDistanceRef = useRef<number | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  const lastNotificationDistanceRef = useRef<number>(Infinity);
  const consecutiveArrivalsRef = useRef<number>(0); // Para evitar falsas llegadas

  // Calcular distancia haversine con mayor precisión
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

  // Calcular bearing (dirección) mejorado
  const calculateBearing = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y, x);
    return ((θ * 180) / Math.PI + 360) % 360;
  }, []);

  // Convertir bearing a dirección cardinal más precisa
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

  // Calcular velocidad con filtrado
  const calculateSpeed = useCallback(
    (
      currentPos: { lat: number; lng: number; timestamp: number },
      lastPos: { lat: number; lng: number; timestamp: number }
    ): number => {
      const distance = calculateDistance(currentPos.lat, currentPos.lng, lastPos.lat, lastPos.lng);
      const timeDiff = (currentPos.timestamp - lastPos.timestamp) / 1000; // segundos

      if (timeDiff === 0 || timeDiff > 30) return 0; // Ignorar cálculos con tiempos muy largos

      const speed = distance / timeDiff;

      // Filtrar velocidades irrealmente altas (más de 15 m/s = 54 km/h caminando)
      return speed > 15 ? 0 : speed;
    },
    [calculateDistance]
  );

  // Texto a voz mejorado
  const speak = useCallback(
    (text: string) => {
      if (!enableVoiceGuidance || !speechSynthesisRef.current) return;

      try {
        // Cancelar habla anterior
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

  // Vibrar dispositivo
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

  // Generar instrucción de navegación mejorada
  const generateNavigationInstruction = useCallback(
    (distance: number, direction: string, speed?: number, accuracy?: number): string => {
      // Considerar precisión del GPS
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

      // Estimar tiempo de llegada más preciso
      const walkingSpeed = speed && speed > 0.5 && speed < 3 ? speed : 1.39; // 1.39 m/s = 5 km/h
      const timeEstimate = Math.round(effectiveDistance / walkingSpeed / 60);

      return `Dirígete hacia el ${direction.toLowerCase()}. Distancia: ${Math.round(
        effectiveDistance
      )}m (≈${timeEstimate} min)`;
    },
    [arrivalThreshold]
  );

  // Manejar notificaciones de proximidad
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

  // Actualizar posición y navegación mejorado
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
      const walkingSpeedMs = speed && speed > 0.5 && speed < 3 ? speed : 1.39;
      const estimatedSeconds = distance / walkingSpeedMs;
      const estimatedArrival = new Date(Date.now() + estimatedSeconds * 1000);

      // Generar instrucción
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

      // Manejar notificaciones de proximidad
      handleProximityNotifications(distance, newLocation.accuracy);

      // Comprobar llegada con lógica mejorada
      const effectiveThreshold =
        newLocation.accuracy && newLocation.accuracy > arrivalThreshold ? newLocation.accuracy * 1.5 : arrivalThreshold;

      if (distance <= effectiveThreshold) {
        consecutiveArrivalsRef.current += 1;
        // Necesitar 2 lecturas consecutivas para confirmar llegada
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

  // Manejar llegada
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

    // Vibración de llegada
    vibrate([500, 200, 500, 200, 500]);

    // Detener navegación automáticamente después de un momento
    setTimeout(() => {
      stopNavigation(true);
    }, 3000);
  }, [speak, enableNotifications, vibrate]);

  // Manejar errores de geolocalización mejorado
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

      // Para timeout, intentar de nuevo automáticamente
      if (error.code === error.TIMEOUT && navigationState.isNavigating) {
        setTimeout(() => {
          if (navigator.geolocation && navigationState.isNavigating) {
            // Reintentar con configuración menos estricta
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
    consecutiveArrivalsRef.current = 0;

    // Configurar opciones de geolocalización optimizadas
    const watchOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 3000,
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

  // Detener navegación
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
      stopNavigation(false);
    } else {
      startNavigation();
    }
  }, [navigationState.isNavigating, stopNavigation, startNavigation]);

  // Repetir última instrucción
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

  // Limpiar al desmontar
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
