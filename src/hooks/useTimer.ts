// src/hooks/useTimer.ts
import { useState, useEffect, useRef, useCallback } from "react";

export interface TimerState {
  timeLeft: number;
  isRunning: boolean;
  isPaused: boolean;
  isFinished: boolean;
  originalDuration: number;
}

export interface TimerCallbacks {
  onFinish?: (duration: number) => void;
  onTick?: (timeLeft: number) => void;
  onStart?: (duration: number) => void;
  onPause?: (timeLeft: number) => void;
  onResume?: (timeLeft: number) => void;
  onStop?: () => void;
}

export const useTimer = (initialDuration: number = 0, callbacks?: TimerCallbacks) => {
  const [timerState, setTimerState] = useState<TimerState>({
    timeLeft: initialDuration,
    isRunning: false,
    isPaused: false,
    isFinished: false,
    originalDuration: initialDuration,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeRef = useRef<number | null>(null);

  const startCountdown = useCallback(
    (targetEndTime: number) => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, targetEndTime - now);

        setTimerState((prev) => {
          const newState = { ...prev, timeLeft: remaining };

          if (callbacks?.onTick) {
            callbacks.onTick(remaining);
          }

          return newState;
        });

        if (remaining <= 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          finishTimer();
        }
      }, 100);
    },
    [callbacks]
  );

  const startTimer = useCallback(
    async (duration?: number) => {
      const finalDuration = duration || timerState.timeLeft;

      if (finalDuration <= 0) return;

      console.log(`⏰ Iniciando temporizador: ${finalDuration}ms`);

      const endTime = Date.now() + finalDuration;
      endTimeRef.current = endTime;
      setTimerState((prev) => ({
        ...prev,
        isRunning: true,
        isPaused: false,
        isFinished: false,
        timeLeft: finalDuration,
      }));

      if (callbacks?.onStart) {
        callbacks.onStart(finalDuration);
      }

      startCountdown(endTime);

      console.log(`✅ Timer iniciado (solo UI callbacks)`);
    },
    [timerState.timeLeft, callbacks, startCountdown]
  );

  const pauseTimer = useCallback(() => {
    if (!timerState.isRunning || timerState.isPaused) return;

    console.log("⏸️ Pausando temporizador");

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setTimerState((prev) => ({
      ...prev,
      isPaused: true,
      isRunning: false,
    }));

    if (callbacks?.onPause) {
      callbacks.onPause(timerState.timeLeft);
    }
  }, [timerState.isRunning, timerState.isPaused, timerState.timeLeft, callbacks]);

  const resumeTimer = useCallback(() => {
    if (!timerState.isPaused || timerState.timeLeft <= 0) return;

    console.log("▶️ Reanudando temporizador");

    const newEndTime = Date.now() + timerState.timeLeft;
    endTimeRef.current = newEndTime;

    setTimerState((prev) => ({
      ...prev,
      isPaused: false,
      isRunning: true,
    }));

    if (callbacks?.onResume) {
      callbacks.onResume(timerState.timeLeft);
    }

    startCountdown(newEndTime);
  }, [timerState.isPaused, timerState.timeLeft, callbacks, startCountdown]);

  const stopTimer = useCallback(() => {
    console.log("⏹️ Deteniendo temporizador");

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setTimerState((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      isFinished: false,
      timeLeft: prev.originalDuration,
    }));

    endTimeRef.current = null;

    if (callbacks?.onStop) {
      callbacks.onStop();
    }
  }, [callbacks]);

  const finishTimer = useCallback(() => {
    console.log("✅ Temporizador finalizado");

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    endTimeRef.current = null;

    setTimerState((prev) => ({
      ...prev,
      timeLeft: 0,
      isRunning: false,
      isPaused: false,
      isFinished: true,
    }));

    if (callbacks?.onFinish) {
      callbacks.onFinish(timerState.originalDuration);
    }

    window.dispatchEvent(
      new CustomEvent("timerFinished", {
        detail: {
          originalDuration: timerState.originalDuration,
          finishedAt: Date.now(),
        },
      })
    );
  }, [timerState.originalDuration, callbacks]);

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

  const getProgress = useCallback(() => {
    if (timerState.originalDuration <= 0) return 0;
    return Math.max(
      0,
      Math.min(100, ((timerState.originalDuration - timerState.timeLeft) / timerState.originalDuration) * 100)
    );
  }, [timerState.originalDuration, timerState.timeLeft]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

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
        } else {
          startCountdown(endTimeRef.current);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [timerState.isRunning, finishTimer, startCountdown]);

  return {
    ...timerState,

    start: startTimer,
    pause: pauseTimer,
    resume: resumeTimer,
    stop: stopTimer,
    reset: resetTimer,
    finish: finishTimer,

    setDuration,

    getFormattedTime,
    getProgress,

    isActive: timerState.isRunning || timerState.isPaused,
    hasTimeLeft: timerState.timeLeft > 0,

    progressPercentage: getProgress(),
    formattedTime: getFormattedTime(),
  };
};
