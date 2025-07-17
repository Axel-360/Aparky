// src/components/AddressSyncIndicator.tsx
import React, { useState, useEffect } from "react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { RefreshCw, MapPin, Wifi } from "lucide-react";
import { toast } from "sonner";
import type { CarLocation } from "@/types/location";

interface AddressSyncIndicatorProps {
  locations: CarLocation[];
  isOnline: boolean;
  onSyncComplete: () => void;
}

export const AddressSyncIndicator: React.FC<AddressSyncIndicatorProps> = ({ locations, isOnline, onSyncComplete }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [needsSync, setNeedsSync] = useState(false);

  // Verificar si hay ubicaciones que necesitan sincronización
  useEffect(() => {
    const locationsWithoutAddress = locations.filter((location) => {
      const addressIsCoords = location.address && /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(location.address);
      return !location.address || addressIsCoords;
    });

    setNeedsSync(locationsWithoutAddress.length > 0);
  }, [locations]);

  const handleManualSync = async () => {
    if (!isOnline) {
      toast.error("Necesitas conexión a internet para sincronizar direcciones");
      return;
    }

    setIsSyncing(true);

    try {
      // Simular sincronización manual
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onSyncComplete();
      toast.success("Direcciones sincronizadas correctamente");
    } catch (error) {
      toast.error("Error al sincronizar direcciones");
    } finally {
      setIsSyncing(false);
    }
  };

  if (!needsSync) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <MapPin className="w-4 h-4 text-blue-600" />
      <span className="text-sm text-blue-800 dark:text-blue-200 flex-1">Direcciones pendientes de sincronizar</span>

      {isOnline ? (
        <Button size="sm" variant="outline" onClick={handleManualSync} disabled={isSyncing} className="h-7 text-xs">
          {isSyncing ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin mr-1" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3 mr-1" />
              Sincronizar
            </>
          )}
        </Button>
      ) : (
        <Badge variant="secondary" className="text-xs">
          <Wifi className="w-3 h-3 mr-1" />
          Esperando conexión
        </Badge>
      )}
    </div>
  );
};
