// src/components/PWA/InstallBanner.tsx - VERSIÓN SIMPLIFICADA SIN ERRORES
import React, { useState, useEffect } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { X, Download, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface InstallBannerProps {
  className?: string;
  onDismiss?: () => void;
}

export const InstallBanner: React.FC<InstallBannerProps> = ({ className, onDismiss }) => {
  const [canInstall, setCanInstall] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Mostrar banner después de un tiempo para no ser intrusivo
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 10000); // 10 segundos

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setCanInstall(false);
      setInstallPrompt(null);
      setDismissed(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    try {
      const result = await installPrompt.prompt();
      if (result.outcome === "accepted") {
        setDismissed(true);
      }
    } catch (error) {
      console.error("Error installing app:", error);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (!canInstall || dismissed || !isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md",
        "animate-in slide-in-from-bottom-full duration-500",
        className
      )}
    >
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-blue-600/5 shadow-lg backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>

            <div className="flex-1 space-y-2">
              <h3 className="font-semibold text-sm">📱 Instalar Aparky</h3>
              <p className="text-xs text-muted-foreground">Instala la app para acceso rápido y uso sin conexión</p>

              <div className="flex gap-2">
                <Button size="sm" onClick={handleInstall} className="text-xs h-7">
                  <Download className="h-3 w-3 mr-1" />
                  Instalar
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-xs h-7">
                  Ahora no
                </Button>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
