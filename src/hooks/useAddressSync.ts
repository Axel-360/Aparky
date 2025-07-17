// src/hooks/useAddressSync.ts
import { useEffect, useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { LocationUtils } from "@/utils";
import type { CarLocation } from "@/types/location";

export const useAddressSync = (
  locations: CarLocation[],
  updateLocationCallback: (id: string, updates: Partial<CarLocation>) => Promise<void>,
  isOnline: boolean
) => {
  // 🔥 Estados para prevenir ejecuciones duplicadas
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastSyncRef = useRef<number>(0);
  const isOnlineRef = useRef(isOnline);

  const syncMissingAddresses = useCallback(async () => {
    // Prevenir ejecuciones simultáneas
    if (isSyncing) {
      console.log("⏭️ Sincronización ya en curso, omitiendo...");
      return;
    }

    // Throttle: No sincronizar más de una vez cada 5 segundos
    const now = Date.now();
    if (now - lastSyncRef.current < 5000) {
      console.log("⏱️ Sincronización muy reciente, omitiendo...");
      return;
    }

    setIsSyncing(true);
    lastSyncRef.current = now;

    try {
      // Buscar ubicaciones con direcciones que son solo coordenadas
      const locationsWithoutAddress = locations.filter((location) => {
        if (!location.address) return true;

        // Detectar si la dirección son coordenadas (formato "⏳ 40.416800, -3.703800" o "40.416800, -3.703800")
        const coordsPattern = /^(⏳\s*)?-?\d+\.\d+,?\s*-?\d+\.\d+$/;
        return coordsPattern.test(location.address.trim());
      });

      if (locationsWithoutAddress.length === 0) {
        console.log("✅ Todas las ubicaciones tienen direcciones reales");
        return;
      }

      console.log(`🔄 Sincronizando ${locationsWithoutAddress.length} direcciones...`);

      // 🔥 Toast inicial con ID único para evitar duplicados
      toast.info(`🔄 Sincronizando ${locationsWithoutAddress.length} direcciones...`, {
        duration: 3000,
        id: "address-sync-start", // ID único previene duplicados
      });

      let syncedCount = 0;
      const errors: string[] = [];

      for (const location of locationsWithoutAddress) {
        try {
          console.log(`🌐 Obteniendo dirección para: ${location.latitude}, ${location.longitude}`);

          // Esperar un poco entre requests para no saturar la API
          await new Promise((resolve) => setTimeout(resolve, 800));

          const address = await LocationUtils.reverseGeocode(location.latitude, location.longitude);

          if (address && address !== location.address) {
            console.log(`📍 Nueva dirección: ${address}`);

            // Usar la función de actualización del hook useAppData
            await updateLocationCallback(location.id, { address });

            syncedCount++;
            console.log(`✅ Dirección actualizada para ubicación ${location.id}`);
          }
        } catch (error) {
          console.error(`❌ Error sincronizando dirección para ${location.id}:`, error);
          errors.push(location.id);
        }
      }

      // 🔥 Toasts de resultado con IDs únicos
      if (syncedCount > 0) {
        toast.success(`🗺️ ${syncedCount} direcciones actualizadas`, {
          description: "Ubicaciones offline sincronizadas con éxito",
          duration: 5000,
          id: "address-sync-success", // ID único
        });
      }

      if (errors.length > 0) {
        toast.warning(`⚠️ ${errors.length} direcciones no se pudieron actualizar`, {
          description: "Se reintentará automáticamente más tarde",
          duration: 3000,
          id: "address-sync-warning", // ID único
        });
      }

      if (syncedCount === 0 && errors.length === 0) {
        console.log("ℹ️ No había direcciones pendientes de sincronización");
      }
    } finally {
      setIsSyncing(false);
    }
  }, [locations, updateLocationCallback, isSyncing]);

  // 🔥 Efecto mejorado para detectar cambio de offline a online
  useEffect(() => {
    const wasOffline = !isOnlineRef.current;
    const isNowOnline = isOnline;

    // Solo ejecutar si cambió de offline a online (no en cada render)
    if (wasOffline && isNowOnline) {
      console.log("🌐 Conexión recuperada - programando sincronización...");

      // Limpiar timeout anterior si existe
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // Programar sincronización con delay
      syncTimeoutRef.current = setTimeout(() => {
        console.log("🔄 Ejecutando sincronización programada...");
        syncMissingAddresses();
      }, 2000);
    }

    // Actualizar referencia del estado online
    isOnlineRef.current = isOnline;

    // Cleanup del timeout
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = undefined; // ← CORREGIDO: Asignar undefined
      }
    };
  }, [isOnline, syncMissingAddresses]);

  // 🔥 Función manual de sincronización (sin duplicados)
  const triggerManualSync = useCallback(() => {
    if (!isOnline) {
      toast.error("Necesitas conexión a internet para sincronizar direcciones", {
        id: "address-sync-offline-error",
      });
      return;
    }

    if (isSyncing) {
      toast.info("Sincronización ya en curso...", {
        id: "address-sync-already-running",
      });
      return;
    }

    syncMissingAddresses();
  }, [isOnline, isSyncing, syncMissingAddresses]);

  return {
    syncMissingAddresses: triggerManualSync, // Versión manual sin duplicados
    isSyncing, // Estado para mostrar en UI si está sincronizando
  };
};
