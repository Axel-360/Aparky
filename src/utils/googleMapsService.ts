// src/utils/googleMapsService.ts
export interface GoogleDirectionsStep {
  html_instructions: string;
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  start_location: { lat: number; lng: number };
  end_location: { lat: number; lng: number };
  maneuver?: string;
}

export interface GoogleDirectionsLeg {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  steps: GoogleDirectionsStep[];
  start_address: string;
  end_address: string;
}

export interface GoogleDirectionsResponse {
  status: string;
  routes: {
    legs: GoogleDirectionsLeg[];
    overview_polyline: { points: string };
    summary: string;
    warnings: string[];
  }[];
}

export interface NearbyPlace {
  place_id: string;
  name: string;
  vicinity: string;
  rating?: number;
  price_level?: number;
  opening_hours?: { open_now: boolean };
  geometry: { location: { lat: number; lng: number } };
  types: string[];
}

export class GoogleMapsService {
  private apiKey: string;
  private baseUrl = "https://maps.googleapis.com/maps/api";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Obtener direcciones detalladas con múltiples opciones de transporte
  async getDirections(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    mode: "walking" | "driving" | "transit" | "bicycling" = "walking",
    alternatives = false
  ): Promise<GoogleDirectionsResponse> {
    const params = new URLSearchParams({
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      mode: mode,
      alternatives: alternatives.toString(),
      key: this.apiKey,
      language: "es",
    });

    // Añadir parámetros específicos según el modo
    if (mode === "transit") {
      params.append("transit_mode", "bus|subway|train");
    }
    if (mode === "driving") {
      params.append("avoid", "tolls"); // Evitar peajes por defecto
    }

    const url = `${this.baseUrl}/directions/json?${params}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: GoogleDirectionsResponse = await response.json();

      if (data.status !== "OK") {
        throw new Error(`Directions API error: ${data.status}`);
      }

      return data;
    } catch (error) {
      console.error("Error fetching directions:", error);
      throw new Error("No se pudieron obtener las direcciones. Verifica tu conexión a internet.");
    }
  }

  // Geocodificación inversa mejorada con más detalles
  async reverseGeocode(
    lat: number,
    lng: number
  ): Promise<{
    formatted_address: string;
    components: { [key: string]: string };
    place_id: string;
  }> {
    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      key: this.apiKey,
      language: "es",
      result_type: "street_address|route|neighborhood|locality",
    });

    const url = `${this.baseUrl}/geocode/json?${params}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.results.length > 0) {
        const result = data.results[0];

        // Extraer componentes útiles
        const components: { [key: string]: string } = {};
        result.address_components?.forEach((component: any) => {
          const types = component.types;
          if (types.includes("street_number")) components.street_number = component.long_name;
          if (types.includes("route")) components.route = component.long_name;
          if (types.includes("neighborhood")) components.neighborhood = component.long_name;
          if (types.includes("locality")) components.city = component.long_name;
          if (types.includes("postal_code")) components.postal_code = component.long_name;
        });

        return {
          formatted_address: result.formatted_address,
          components,
          place_id: result.place_id,
        };
      }

      throw new Error("No se encontró dirección para estas coordenadas");
    } catch (error) {
      console.error("Error in reverse geocoding:", error);
      throw new Error("Error al obtener la dirección");
    }
  }

  // Buscar lugares cercanos (parkings, gasolineras, hospitales, etc.)
  async findNearbyPlaces(
    location: { lat: number; lng: number },
    type: "parking" | "gas_station" | "hospital" | "restaurant" | "atm" | "pharmacy",
    radius = 1000,
    minRating = 0
  ): Promise<NearbyPlace[]> {
    const params = new URLSearchParams({
      location: `${location.lat},${location.lng}`,
      radius: radius.toString(),
      type: type,
      key: this.apiKey,
      language: "es",
    });

    if (minRating > 0) {
      params.append("min_price", minRating.toString());
    }

    const url = `${this.baseUrl}/place/nearbysearch/json?${params}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK") {
        return data.results
          .filter((place: any) => !minRating || (place.rating && place.rating >= minRating))
          .slice(0, 10) // Limitar a 10 resultados
          .map((place: any) => ({
            place_id: place.place_id,
            name: place.name,
            vicinity: place.vicinity,
            rating: place.rating,
            price_level: place.price_level,
            opening_hours: place.opening_hours,
            geometry: place.geometry,
            types: place.types,
          }));
      }

      return [];
    } catch (error) {
      console.error("Error finding nearby places:", error);
      return [];
    }
  }

  // Obtener detalles de un lugar específico
  async getPlaceDetails(placeId: string): Promise<{
    name: string;
    formatted_address: string;
    phone?: string;
    website?: string;
    opening_hours?: { weekday_text: string[] };
    photos?: string[];
  }> {
    const params = new URLSearchParams({
      place_id: placeId,
      fields: "name,formatted_address,formatted_phone_number,website,opening_hours,photos",
      key: this.apiKey,
      language: "es",
    });

    const url = `${this.baseUrl}/place/details/json?${params}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK") {
        const result = data.result;
        return {
          name: result.name,
          formatted_address: result.formatted_address,
          phone: result.formatted_phone_number,
          website: result.website,
          opening_hours: result.opening_hours,
          photos: result.photos?.map(
            (photo: any) =>
              `${this.baseUrl}/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${this.apiKey}`
          ),
        };
      }

      throw new Error("No se pudieron obtener los detalles del lugar");
    } catch (error) {
      console.error("Error getting place details:", error);
      throw error;
    }
  }

  // Generar URL de Street View con opciones avanzadas
  getStreetViewUrl(
    location: { lat: number; lng: number },
    options: {
      size?: string;
      fov?: number;
      heading?: number;
      pitch?: number;
    } = {}
  ): string {
    const { size = "600x400", fov = 90, heading = 0, pitch = 0 } = options;

    const params = new URLSearchParams({
      size,
      location: `${location.lat},${location.lng}`,
      fov: fov.toString(),
      heading: heading.toString(),
      pitch: pitch.toString(),
      key: this.apiKey,
    });

    return `${this.baseUrl}/streetview?${params}`;
  }

  // Calcular múltiples rutas y encontrar la mejor
  async getBestRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<{
    walking: GoogleDirectionsResponse | null;
    driving: GoogleDirectionsResponse | null;
    transit: GoogleDirectionsResponse | null;
    recommended: {
      mode: string;
      duration: string;
      distance: string;
      reason: string;
    };
  }> {
    const routes = {
      walking: null as GoogleDirectionsResponse | null,
      driving: null as GoogleDirectionsResponse | null,
      transit: null as GoogleDirectionsResponse | null,
    };

    // Obtener todas las rutas en paralelo
    const routePromises = [
      this.getDirections(origin, destination, "walking").catch(() => null),
      this.getDirections(origin, destination, "driving").catch(() => null),
      this.getDirections(origin, destination, "transit").catch(() => null),
    ];

    const [walkingRoute, drivingRoute, transitRoute] = await Promise.all(routePromises);

    routes.walking = walkingRoute;
    routes.driving = drivingRoute;
    routes.transit = transitRoute;

    // Determinar la ruta recomendada
    const recommended = this.determineRecommendedRoute(routes);

    return { ...routes, recommended };
  }

  private determineRecommendedRoute(routes: {
    walking: GoogleDirectionsResponse | null;
    driving: GoogleDirectionsResponse | null;
    transit: GoogleDirectionsResponse | null;
  }) {
    const walkingTime = routes.walking?.routes[0]?.legs[0]?.duration?.value || Infinity;
    const drivingTime = routes.driving?.routes[0]?.legs[0]?.duration?.value || Infinity;
    const transitTime = routes.transit?.routes[0]?.legs[0]?.duration?.value || Infinity;

    // Lógica de recomendación
    if (walkingTime <= 900) {
      // 15 minutos o menos caminando
      return {
        mode: "walking",
        duration: routes.walking?.routes[0]?.legs[0]?.duration?.text || "",
        distance: routes.walking?.routes[0]?.legs[0]?.distance?.text || "",
        reason: "Distancia corta, ideal para caminar",
      };
    }

    if (transitTime < drivingTime * 1.5 && routes.transit) {
      return {
        mode: "transit",
        duration: routes.transit.routes[0]?.legs[0]?.duration?.text || "",
        distance: routes.transit.routes[0]?.legs[0]?.distance?.text || "",
        reason: "Transporte público más eficiente",
      };
    }

    if (routes.driving) {
      return {
        mode: "driving",
        duration: routes.driving.routes[0]?.legs[0]?.duration?.text || "",
        distance: routes.driving.routes[0]?.legs[0]?.distance?.text || "",
        reason: "Ruta más rápida en vehículo",
      };
    }

    // Fallback a caminando
    return {
      mode: "walking",
      duration: routes.walking?.routes[0]?.legs[0]?.duration?.text || "",
      distance: routes.walking?.routes[0]?.legs[0]?.distance?.text || "",
      reason: "Única opción disponible",
    };
  }

  // Método para verificar si la API key es válida
  async validateApiKey(): Promise<boolean> {
    try {
      await this.reverseGeocode(40.4168, -3.7038); // Madrid como test
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Singleton para usar en toda la app
let googleMapsServiceInstance: GoogleMapsService | null = null;

export const getGoogleMapsService = (): GoogleMapsService => {
  if (!googleMapsServiceInstance) {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error("Google Maps API key no configurada. Añade REACT_APP_GOOGLE_MAPS_API_KEY a tu .env");
    }
    googleMapsServiceInstance = new GoogleMapsService(apiKey);
  }
  return googleMapsServiceInstance;
};

// Hook para React
import { useState, useEffect } from "react";

export const useGoogleMaps = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        const service = getGoogleMapsService();
        const isValid = await service.validateApiKey();

        if (isValid) {
          setIsReady(true);
        } else {
          setError("API key de Google Maps inválida");
        }
      } catch (error) {
        setError("Error al inicializar Google Maps");
      }
    };

    initializeGoogleMaps();
  }, []);

  return {
    isReady,
    error,
    service: isReady ? getGoogleMapsService() : null,
  };
};
