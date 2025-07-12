// src/shared/components/LocationInfo.tsx
import React from "react";
import { MapPin, Clock, Euro, Building, Car, ParkingSquare, Edit, Navigation, Trash2, Share2 } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { IconButton } from "./IconButton";
import { Formatters } from "@/utils/formatters";
import type { CarLocation } from "@/types/location";

interface LocationInfoProps {
  location: CarLocation;
  showActions?: boolean;
  compact?: boolean;
  isSelected?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onNavigate?: () => void;
  onShare?: () => void;
  onSelect?: () => void;
}

export const LocationInfo: React.FC<LocationInfoProps> = ({
  location,
  showActions = false,
  compact = false,
  isSelected = false,
  onEdit,
  onDelete,
  onNavigate,
  onShare,
  onSelect,
}) => {
  const datetime = Formatters.formatDateTime(location.timestamp);
  const accuracy = Formatters.formatAccuracy(location.accuracy);

  const timerInfo = location.expiryTime ? Formatters.formatTimeRemaining(location.expiryTime) : null;

  const parkingIcon = {
    Calle: Car,
    Garaje: Building,
    Parking: ParkingSquare,
    Otro: MapPin,
  }[location.parkingType || "Calle"];

  const getParkingTypeName = (type?: string): string => {
    switch (type) {
      case "Garaje":
        return "Garaje";
      case "Parking":
        return "Aparcamiento";
      case "Otro":
        return "Otro";
      default:
        return "Calle";
    }
  };

  return (
    <div
      className={`space-y-3 ${onSelect ? "cursor-pointer" : ""} ${
        isSelected ? "ring-2 ring-primary rounded-lg p-2" : ""
      }`}
      onClick={onSelect}
    >
      {/* Header con tipo y nota */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {React.createElement(parkingIcon, { className: "w-4 h-4 text-muted-foreground flex-shrink-0" })}
          <h3 className="font-medium text-sm truncate">{location.note || "Sin nota"}</h3>
        </div>

        {showActions && (
          <div className="flex gap-1 flex-shrink-0">
            {onEdit && <IconButton icon={Edit} onClick={onEdit} tooltip="Editar" size="icon" className="h-8 w-8" />}
            {onShare && (
              <IconButton icon={Share2} onClick={onShare} tooltip="Compartir" size="icon" className="h-8 w-8" />
            )}
            {onNavigate && (
              <IconButton
                icon={Navigation}
                onClick={onNavigate}
                tooltip="Navegar"
                variant="outline"
                size="icon"
                className="h-8 w-8"
              />
            )}
            {onDelete && (
              <IconButton
                icon={Trash2}
                onClick={onDelete}
                variant="ghost"
                className="h-8 w-8 text-destructive hover:text-destructive"
                tooltip="Eliminar"
                size="icon"
              />
            )}
          </div>
        )}
      </div>

      {/* Estado del timer */}
      {timerInfo && (
        <div className="flex items-center gap-2">
          <StatusBadge
            status={timerInfo.isExpired ? "error" : timerInfo.isWarning ? "warning" : "info"}
            icon={Clock}
            size="sm"
          >
            {timerInfo.text}
          </StatusBadge>
          {location.extensionCount && location.extensionCount > 0 && (
            <StatusBadge status="neutral" size="sm">
              +{location.extensionCount} ext.
            </StatusBadge>
          )}
        </div>
      )}

      {/* Ubicación */}
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate">
            {location.address || Formatters.formatCoordinates(location.latitude, location.longitude)}
          </p>
          {!compact && (
            <p className="text-xs mt-1">
              {accuracy.text} • {datetime.relative}
            </p>
          )}
        </div>
      </div>

      {/* Información adicional */}
      {!compact && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {datetime.date} • {datetime.time}
          </span>
          {location.cost && (
            <div className="flex items-center gap-1 text-green-600">
              <Euro className="w-3 h-3" />
              <span>{Formatters.formatCost(location.cost)}</span>
            </div>
          )}
        </div>
      )}

      {/* Tipo de parking */}
      {!compact && (
        <StatusBadge status="neutral" size="sm">
          {React.createElement(parkingIcon, { className: "w-3 h-3" })}
          {getParkingTypeName(location.parkingType)}
        </StatusBadge>
      )}

      {/* Fotos (si las hay) */}
      {location.photos && location.photos.length > 0 && !compact && (
        <div className="flex gap-1">
          {location.photos.slice(0, 3).map((photo, index) => (
            <div
              key={index}
              className="w-12 h-12 rounded border bg-cover bg-center"
              style={{ backgroundImage: `url(${photo})` }}
            />
          ))}
          {location.photos.length > 3 && (
            <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center text-xs">
              +{location.photos.length - 3}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
