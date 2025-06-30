// src/components/PWA/PWAStatusBar.tsx
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// Hook simplificado para network status
const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>("desconocido");

  useEffect(() => {
    const updateNetworkStatus = () => {
      setIsOnline(navigator.onLine);

      // Detectar tipo de conexión si está disponible
      const connection =
        (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

      if (connection) {
        setConnectionType(connection.effectiveType || "desconocido");
      }
    };

    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);

    // Listener para cambios en el tipo de conexión
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener("change", updateNetworkStatus);
    }

    updateNetworkStatus();

    return () => {
      window.removeEventListener("online", updateNetworkStatus);
      window.removeEventListener("offline", updateNetworkStatus);
      if (connection) {
        connection.removeEventListener("change", updateNetworkStatus);
      }
    };
  }, []);

  return { isOnline, connectionType };
};

export const PWAStatusBar: React.FC = () => {
  const { isOnline, connectionType } = useNetworkStatus();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-muted/80 backdrop-blur-sm border-t z-40">
      <div className="container mx-auto px-4 py-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-green-500" : "bg-red-500")} />
            <span>{isOnline ? "Conectado" : "Sin conexión"}</span>
            {isOnline && connectionType !== "desconocido" && <span>({connectionType})</span>}
          </div>

          <div className="flex items-center gap-4">
            <span>PWA Lista</span>
            {"serviceWorker" in navigator && <span>SW Activo</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
