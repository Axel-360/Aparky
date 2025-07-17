// src/hooks/usePWA.ts
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  hasUpdate: boolean;
}

interface PWAActions {
  installApp: () => Promise<void>;
  updateApp: () => void;
  dismissUpdate: () => void;
}

export const usePWA = (): PWAState & PWAActions => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone || isInWebAppiOS);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      toast.success("¡App instalada correctamente! 🎉");
    };

    const handleOnline = () => {
      setIsOffline(false);
      toast.success("Conexión restaurada");
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast.error("Sin conexión a internet", {
        description: "La app seguirá funcionando sin conexión",
      });
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      const result = await deferredPrompt.prompt();
      console.log("Install prompt result:", result);

      if (result.outcome === "accepted") {
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error("Error installing app:", error);
      toast.error("Error al instalar la aplicación");
    }
  }, [deferredPrompt]);

  const updateApp = useCallback(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration?.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      });
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    setHasUpdate(false);
  }, []);

  return {
    isInstallable,
    isInstalled,
    isOffline,
    hasUpdate,
    installApp,
    updateApp,
    dismissUpdate,
  };
};

export const useInstallPrompt = () => {
  const [canInstall, setCanInstall] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setCanInstall(false);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return false;

    try {
      const result = await installPrompt.prompt();
      const accepted = result.outcome === "accepted";

      if (accepted) {
        setCanInstall(false);
        setInstallPrompt(null);
      }

      return accepted;
    } catch (error) {
      console.error("Error prompting install:", error);
      return false;
    }
  }, [installPrompt]);

  return {
    canInstall,
    promptInstall,
  };
};
