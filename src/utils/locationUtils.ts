// src/utils/locationUtils.ts
import type { CarLocation, LocationWithAccuracy } from "@/types/location";

export class LocationUtils {
  // Calcular distancia entre dos puntos (fórmula Haversine)
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Encontrar ubicaciones cercanas
  static findNearbyLocations(
    currentLocation: LocationWithAccuracy,
    locations: CarLocation[],
    radiusMeters: number = 500
  ): Array<CarLocation & { distance: number }> {
    return locations
      .map((location) => ({
        ...location,
        distance: this.calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          location.latitude,
          location.longitude
        ),
      }))
      .filter((location) => location.distance <= radiusMeters)
      .sort((a, b) => a.distance - b.distance);
  }

  // Obtener dirección desde coordenadas (geocoding inverso)
  static async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "User-Agent": "Aparky/1.0.0",
          },
        }
      );

      if (!response.ok) throw new Error("Geocoding failed");

      const data = await response.json();

      if (data && data.display_name) {
        // Formatear dirección de forma más legible
        const address = data.address || {};
        const parts = [
          address.road,
          address.house_number,
          address.suburb || address.neighbourhood,
          address.city || address.town || address.village,
        ].filter(Boolean);

        return parts.length > 0 ? parts.join(", ") : data.display_name;
      }

      return null;
    } catch (error) {
      console.error("Error en geocoding inverso:", error);
      return null;
    }
  }

  // Validar coordenadas
  static validateCoordinates(lat: number, lng: number): boolean {
    return (
      typeof lat === "number" &&
      typeof lng === "number" &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180 &&
      !isNaN(lat) &&
      !isNaN(lng)
    );
  }

  // Generar ID único para ubicación
  static generateLocationId(): string {
    return `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Verificar si dos ubicaciones son similares (para evitar duplicados)
  static areLocationsSimilar(location1: CarLocation, location2: CarLocation, thresholdMeters: number = 10): boolean {
    const distance = this.calculateDistance(
      location1.latitude,
      location1.longitude,
      location2.latitude,
      location2.longitude
    );
    return distance <= thresholdMeters;
  }

  // Obtener centro y zoom óptimo para un grupo de ubicaciones
  static getOptimalMapView(locations: CarLocation[]): {
    center: [number, number];
    zoom: number;
  } {
    if (locations.length === 0) {
      return { center: [40.4168, -3.7038], zoom: 13 }; // Madrid por defecto
    }

    if (locations.length === 1) {
      const loc = locations[0];
      return { center: [loc.latitude, loc.longitude], zoom: 15 };
    }

    // Calcular bounding box
    const lats = locations.map((loc) => loc.latitude);
    const lngs = locations.map((loc) => loc.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    // Calcular zoom basado en la distancia máxima
    const maxDistance = Math.max(this.calculateDistance(minLat, minLng, maxLat, maxLng));

    let zoom = 15;
    if (maxDistance > 10000) zoom = 10;
    else if (maxDistance > 5000) zoom = 12;
    else if (maxDistance > 1000) zoom = 14;

    return { center: [centerLat, centerLng], zoom };
  }
}
