// src/hooks/useTimer.ts - Versión corregida sin errores TypeScript
import { useState, useEffect, useRef, useCallback } from "react";
import { notificationManager } from "@/utils/notificationManager";

export interface TimerState {
  timeLeft: number;
  isRunning: boolean;
  isPaused: boolean;
  isFinished: boolean;
  originalDuration: number;
}

export const useTimer = (initialDuration: number = 0) => {
  const [timerState, setTimerState] = useState<TimerState>({
    timeLeft: initialDuration,
    isRunning: false,
    isPaused: false,
    isFinished: false,
    originalDuration: initialDuration,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const notificationIdRef = useRef<string | null>(null);

  /**
   * 🔥 Iniciar temporizador con notificación programada
   */
  const startTimer = useCallback(
    async (duration?: number) => {
      const finalDuration = duration || timerState.timeLeft;

      if (finalDuration <= 0) return;

      console.log(`⏰ Iniciando temporizador: ${finalDuration}ms`);

      // Calcular tiempo de finalización
      const endTime = Date.now() + finalDuration;
      endTimeRef.current = endTime;

      // Generar ID único para la notificación
      const notificationId = `timer-${Date.now()}`;
      notificationIdRef.current = notificationId;

      // 🔥 CRÍTICO: Programar notificación ANTES de iniciar el timer visual
      try {
        // 🔥 CORREGIDO: Usar await correctamente
        await notificationManager.scheduleNotification(
          notificationId,
          finalDuration, // delay en ms
          "⏰ ¡Tiempo agotado!",
          "Tu temporizador de aparcamiento ha finalizado. Es hora de mover el coche.",
          {
            tag: "parking-timer",
            requireInteraction: true,
            vibrate: [500, 200, 500, 200, 500],
            icon: "/icons/pwa-192x192.png",
            badge: "/icons/pwa-64x64.png",
          }
        );

        console.log("✅ Notificación background programada");
      } catch (error) {
        console.warn("⚠️ Error programando notificación background:", error);
        // Continuar de todos modos con el timer visual
      }

      // Actualizar estado
      setTimerState({
        timeLeft: finalDuration,
        isRunning: true,
        isPaused: false,
        isFinished: false,
        originalDuration: finalDuration,
      });

      // Iniciar countdown visual
      startCountdown(endTime);
    },
    [timerState.timeLeft]
  );

  /**
   * 🔥 Countdown visual que se sincroniza con el tiempo real
   */
  const startCountdown = (endTime: number) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);

      setTimerState((prev) => ({
        ...prev,
        timeLeft: remaining,
      }));

      // Verificar si terminó
      if (remaining <= 0) {
        finishTimer();
      }
    }, 1000); // Actualizar cada segundo para precisión
  };

  /**
   * 🔥 Pausar temporizador
   */
  const pauseTimer = useCallback(() => {
    if (!timerState.isRunning || timerState.isPaused) return;

    console.log("⏸️ Pausando temporizador");

    // Parar countdown visual
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Cancelar notificación programada
    if (notificationIdRef.current) {
      notificationManager.cancelNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    }

    setTimerState((prev) => ({
      ...prev,
      isPaused: true,
      isRunning: false,
    }));
  }, [timerState.isRunning, timerState.isPaused]);

  /**
   * 🔥 Reanudar temporizador
   */
  const resumeTimer = useCallback(async () => {
    if (!timerState.isPaused || timerState.timeLeft <= 0) return;

    console.log("▶️ Reanudando temporizador");

    // Calcular nuevo tiempo de finalización
    const newEndTime = Date.now() + timerState.timeLeft;
    endTimeRef.current = newEndTime;

    // Programar nueva notificación
    const notificationId = `timer-resumed-${Date.now()}`;
    notificationIdRef.current = notificationId;

    try {
      await notificationManager.scheduleNotification(
        notificationId,
        timerState.timeLeft, // delay restante
        "⏰ ¡Tiempo agotado!",
        "Tu temporizador de aparcamiento ha finalizado.",
        {
          tag: "parking-timer",
          requireInteraction: true,
          vibrate: [500, 200, 500, 200, 500],
        }
      );
    } catch (error) {
      console.error("❌ Error programando notificación al reanudar:", error);
    }

    setTimerState((prev) => ({
      ...prev,
      isPaused: false,
      isRunning: true,
    }));

    // Reanudar countdown
    startCountdown(newEndTime);
  }, [timerState.isPaused, timerState.timeLeft]);

  /**
   * 🔥 Detener temporizador completamente
   */
  const stopTimer = useCallback(() => {
    console.log("⏹️ Deteniendo temporizador");

    // Limpiar interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Cancelar notificación
    if (notificationIdRef.current) {
      notificationManager.cancelNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    }

    // Reset estado
    setTimerState((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      isFinished: false,
      timeLeft: prev.originalDuration,
    }));

    endTimeRef.current = null;
  }, []);

  /**
   * 🔥 Finalizar temporizador
   */
  const finishTimer = useCallback(() => {
    console.log("✅ Temporizador finalizado");

    // Limpiar interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Limpiar referencias
    endTimeRef.current = null;
    notificationIdRef.current = null;

    // Actualizar estado
    setTimerState((prev) => ({
      ...prev,
      timeLeft: 0,
      isRunning: false,
      isPaused: false,
      isFinished: true,
    }));

    // 🔥 CORREGIDO: Mostrar notificación inmediata como backup usando el método correcto
    if (document.hasFocus()) {
      // Usar el método existente del notificationManager
      notificationManager
        .showNotification("⏰ ¡Tiempo agotado!", "Tu temporizador ha finalizado.", {
          tag: "timer-finished-backup",
          requireInteraction: false,
        })
        .catch((error) => {
          console.warn("⚠️ Error mostrando notificación backup:", error);
        });
    }

    // Disparar evento personalizado
    window.dispatchEvent(
      new CustomEvent("timerFinished", {
        detail: {
          originalDuration: timerState.originalDuration,
          finishedAt: Date.now(),
        },
      })
    );
  }, [timerState.originalDuration]);

  /**
   * 🔥 Restablecer temporizador
   */
  const resetTimer = useCallback(
    (newDuration?: number) => {
      console.log("🔄 Restableciendo temporizador");

      stopTimer();

      const duration = newDuration || timerState.originalDuration;
      setTimerState({
        timeLeft: duration,
        isRunning: false,
        isPaused: false,
        isFinished: false,
        originalDuration: duration,
      });
    },
    [stopTimer, timerState.originalDuration]
  );

  /**
   * 🔥 Ajustar duración
   */
  const setDuration = useCallback(
    (duration: number) => {
      if (timerState.isRunning) {
        console.warn("⚠️ No se puede cambiar duración con timer activo");
        return;
      }

      setTimerState((prev) => ({
        ...prev,
        timeLeft: duration,
        originalDuration: duration,
      }));
    },
    [timerState.isRunning]
  );

  /**
   * 🔥 Obtener tiempo restante formateado
   */
  const getFormattedTime = useCallback(() => {
    const totalSeconds = Math.ceil(timerState.timeLeft / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    } else {
      return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
  }, [timerState.timeLeft]);

  /**
   * 🔥 Obtener progreso (0-100)
   */
  const getProgress = useCallback(() => {
    if (timerState.originalDuration <= 0) return 0;
    return Math.max(
      0,
      Math.min(100, ((timerState.originalDuration - timerState.timeLeft) / timerState.originalDuration) * 100)
    );
  }, [timerState.originalDuration, timerState.timeLeft]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (notificationIdRef.current) {
        notificationManager.cancelNotification(notificationIdRef.current);
      }
    };
  }, []);

  // Sincronizar con tiempo real cuando la app vuelve del background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && timerState.isRunning && endTimeRef.current) {
        const now = Date.now();
        const remaining = Math.max(0, endTimeRef.current - now);

        setTimerState((prev) => ({
          ...prev,
          timeLeft: remaining,
        }));

        if (remaining <= 0) {
          finishTimer();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [timerState.isRunning, finishTimer]);

  return {
    // Estado
    ...timerState,

    // Métodos de control
    start: startTimer,
    pause: pauseTimer,
    resume: resumeTimer,
    stop: stopTimer,
    reset: resetTimer,
    setDuration,

    // Métodos de información
    getFormattedTime,
    getProgress,

    // Estado calculado
    canStart: !timerState.isRunning && timerState.timeLeft > 0,
    canPause: timerState.isRunning && !timerState.isPaused,
    canResume: timerState.isPaused,
    canStop: timerState.isRunning || timerState.isPaused,

    // Debug info
    debugInfo: {
      endTime: endTimeRef.current,
      notificationId: notificationIdRef.current,
      hasInterval: !!intervalRef.current,
    },
  };
};
