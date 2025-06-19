// src/types/location.ts
export interface CarLocation {
  id: string;
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: number;
  note?: string;
}

export interface GeolocationError {
  code: number;
  message: string;
}
