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

  const hourCounts: { [hour: number]: number } = {};
  const weeklyCount = [0, 0, 0, 0, 0, 0, 0];
  const areaCounts: { [area: string]: number } = {};
  const parkingTypeCounts: { [type: string]: number } = {};

  let totalCost = 0;
  let locationsWithCost = 0;

  locations.forEach((location) => {
    const date = new Date(location.timestamp);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();

    hourCounts[hour] = (hourCounts[hour] || 0) + 1;

    weeklyCount[dayOfWeek]++;

    if (location.address) {
      const addressParts = location.address.split(",");
      if (addressParts.length > 0) {
        const area = addressParts[0].trim();
        areaCounts[area] = (areaCounts[area] || 0) + 1;
      }
    }

    const parkingType = location.parkingType || "Calle";
    parkingTypeCounts[parkingType] = (parkingTypeCounts[parkingType] || 0) + 1;

    if (location.cost && location.cost > 0) {
      totalCost += location.cost;
      locationsWithCost++;
    }
  });

  const mostUsedHour = Object.entries(hourCounts).reduce((a, b) =>
    hourCounts[parseInt(a[0])] > hourCounts[parseInt(b[0])] ? a : b
  )[0];

  const mostCommonArea = Object.entries(areaCounts).reduce(
    (a, b) => (areaCounts[a[0]] > areaCounts[b[0]] ? a : b),
    ["", 0]
  )[0];

  const mostUsedParkingType = Object.entries(parkingTypeCounts).reduce(
    (a, b) => (parkingTypeCounts[a[0]] > parkingTypeCounts[b[0]] ? a : b),
    ["Calle", 0]
  )[0];

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
