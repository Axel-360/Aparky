// src/utils/formatters.ts
export class Formatters {
  // Formatear fecha y hora
  static formatDateTime(timestamp: number): {
    date: string;
    time: string;
    relative: string;
    full: string;
  } {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    let relative: string;
    if (diffMinutes < 1) relative = "Ahora mismo";
    else if (diffMinutes < 60) relative = `Hace ${diffMinutes}min`;
    else if (diffHours < 24) relative = `Hace ${diffHours}h`;
    else if (diffDays < 7) relative = `Hace ${diffDays}d`;
    else relative = date.toLocaleDateString("es-ES");

    return {
      date: date.toLocaleDateString("es-ES"),
      time: date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      relative,
      full: date.toLocaleString("es-ES"),
    };
  }

  // Formatear distancia
  static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }

  // Formatear tiempo restante
  static formatTimeRemaining(expiryTime: number): {
    text: string;
    isExpired: boolean;
    isWarning: boolean;
    minutes: number;
  } {
    const now = Date.now();
    const diffMs = expiryTime - now;
    const minutes = Math.ceil(diffMs / 60000);

    const isExpired = diffMs <= 0;
    const isWarning = minutes <= 15 && minutes > 0;

    let text: string;
    if (isExpired) {
      const overdue = Math.abs(minutes);
      text = `Expirado hace ${overdue}min`;
    } else if (minutes < 60) {
      text = `${minutes}min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      text = remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
    }

    return { text, isExpired, isWarning, minutes };
  }

  // Formatear costo
  static formatCost(cost: number): string {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(cost);
  }

  // Formatear precisión GPS
  static formatAccuracy(accuracy?: number): {
    text: string;
    level: "high" | "medium" | "low";
    icon: string;
  } {
    if (!accuracy) {
      return { text: "GPS", level: "medium", icon: "📍" };
    }

    if (accuracy <= 10) {
      return { text: `±${Math.round(accuracy)}m`, level: "high", icon: "🎯" };
    } else if (accuracy <= 50) {
      return { text: `±${Math.round(accuracy)}m`, level: "medium", icon: "📍" };
    } else {
      return { text: `±${Math.round(accuracy)}m`, level: "low", icon: "📡" };
    }
  }

  // Formatear coordenadas
  static formatCoordinates(lat: number, lng: number, precision: number = 4): string {
    return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
  }
}
