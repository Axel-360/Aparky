// src/utils/addressUtils.ts
import type { CarLocation } from "@/types/location";

export const AddressUtils = {
  /**
   * Verifica si una dirección son solo coordenadas
   */
  isCoordinatesOnly(address?: string): boolean {
    if (!address) return true;

    // Patrón para detectar formato "⏳ 40.416800, -3.703800" o "40.416800, -3.703800"
    const coordsPattern = /^(⏳\s*)?-?\d+\.\d+,?\s*-?\d+\.\d+$/;
    return coordsPattern.test(address.trim());
  },

  /**
   * Formatea coordenadas para mostrar como dirección temporal
   */
  formatCoordinatesAsAddress(lat: number, lng: number): string {
    return `⏳ ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  },

  /**
   * Obtiene todas las ubicaciones que necesitan sincronización
   */
  getLocationsPendingSync(locations: CarLocation[]): CarLocation[] {
    return locations.filter((location) => this.isCoordinatesOnly(location.address));
  },

  /**
   * Cuenta cuántas direcciones están pendientes
   */
  countPendingAddresses(locations: CarLocation[]): number {
    return this.getLocationsPendingSync(locations).length;
  },

  /**
   * Extrae coordenadas de una dirección de tipo coordenadas
   */
  extractCoordinatesFromAddress(address: string): { lat: number; lng: number } | null {
    const coordsPattern = /^(⏳\s*)?(-?\d+\.\d+),?\s*(-?\d+\.\d+)$/;
    const match = address.match(coordsPattern);

    if (match) {
      return {
        lat: parseFloat(match[2]),
        lng: parseFloat(match[3]),
      };
    }

    return null;
  },
};
