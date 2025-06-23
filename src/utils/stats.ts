// src/utils/stats.ts
import type { CarLocation, LocationStats } from "../types/location";

export const calculateLocationStats = (locations: CarLocation[]): LocationStats => {
  if (locations.length === 0) {
    return {
      totalLocations: 0,
      mostUsedHour: 0,
      averageAccuracy: 0,
      mostCommonArea: "",
      weeklyCount: [0, 0, 0, 0, 0, 0, 0],
      totalCost: 0,
      averageCost: 0,
      mostUsedParkingType: "",
    };
  }

  // Conteo por hora
  const hourCounts: { [hour: number]: number } = {};
  // Conteo por día de la semana
  const weeklyCount = [0, 0, 0, 0, 0, 0, 0];
  // Áreas más comunes (primeras 2 palabras de la dirección)
  const areaCounts: { [area: string]: number } = {};
  // Conteo por tipo de parking
  const parkingTypeCounts: { [type: string]: number } = {};

  // Variables para costos
  let totalCost = 0;
  let locationsWithCost = 0;

  locations.forEach((location) => {
    const date = new Date(location.timestamp);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();

    // Contar horas
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;

    // Contar días de la semana
    weeklyCount[dayOfWeek]++;

    // Extraer área común de la dirección
    if (location.address) {
      const addressParts = location.address.split(",");
      if (addressParts.length > 0) {
        const area = addressParts[0].trim();
        areaCounts[area] = (areaCounts[area] || 0) + 1;
      }
    }

    // Contar tipos de parking
    const parkingType = location.parkingType || "street";
    parkingTypeCounts[parkingType] = (parkingTypeCounts[parkingType] || 0) + 1;

    // Sumar costos
    if (location.cost && location.cost > 0) {
      totalCost += location.cost;
      locationsWithCost++;
    }
  });

  // Encontrar la hora más usada
  const mostUsedHour = Object.entries(hourCounts).reduce((a, b) =>
    hourCounts[parseInt(a[0])] > hourCounts[parseInt(b[0])] ? a : b
  )[0];

  // Encontrar el área más común
  const mostCommonArea = Object.entries(areaCounts).reduce(
    (a, b) => (areaCounts[a[0]] > areaCounts[b[0]] ? a : b),
    ["", 0]
  )[0];

  // Encontrar el tipo de parking más usado
  const mostUsedParkingType = Object.entries(parkingTypeCounts).reduce(
    (a, b) => (parkingTypeCounts[a[0]] > parkingTypeCounts[b[0]] ? a : b),
    ["street", 0]
  )[0];

  // Calcular promedio de costo
  const averageCost = locationsWithCost > 0 ? totalCost / locationsWithCost : 0;

  return {
    totalLocations: locations.length,
    mostUsedHour: parseInt(mostUsedHour) || 0,
    averageAccuracy: 0, // Se calculará si tenemos datos de precisión
    mostCommonArea: mostCommonArea || "Sin datos",
    weeklyCount,
    totalCost,
    averageCost,
    mostUsedParkingType,
  };
};

export const filterLocationsByDate = (locations: CarLocation[], filter: string): CarLocation[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filter) {
    case "today":
      return locations.filter((location) => new Date(location.timestamp) >= today);

    case "week":
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return locations.filter((location) => new Date(location.timestamp) >= weekAgo);

    case "month":
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      return locations.filter((location) => new Date(location.timestamp) >= monthAgo);

    default:
      return locations;
  }
};
