// src/features/location/components/EditLocationDialog.tsx
import React, { useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Card,
  CardContent,
  Separator,
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/ui";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { PhotoCapture } from "@/features/photo";
import { ParkingTimer } from "@/features/parking";
import { toast } from "sonner";
import { Edit, Save, X, Clock, Camera, Info, Target, Navigation, RefreshCw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CarLocation } from "@/types/location";
import "leaflet/dist/leaflet.css";
import { LocationUtils } from "@/utils";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const createCarIcon = (isSelected: boolean = false) => {
  return L.divIcon({
    html: `<div style="
      background-color: ${isSelected ? "#ef4444" : "#3b82f6"};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      animation: ${isSelected ? "pulse 2s infinite" : "none"};
    ">🚗</div>
    <style>
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
    </style>`,
    className: "edit-car-marker",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
};

const MapClickHandler: React.FC<{
  onMapClick: (lat: number, lng: number) => void;
  isEditingLocation: boolean;
}> = ({ onMapClick, isEditingLocation }) => {
  useMapEvents({
    click: (e) => {
      if (isEditingLocation) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

interface EditLocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  location: CarLocation;
  onSave: (updates: Partial<CarLocation>) => void;
  mapType?: string;
}

export const EditLocationDialog: React.FC<EditLocationDialogProps> = ({
  isOpen,
  onClose,
  location,
  onSave,
  mapType = "osm",
}) => {
  const [note, setNote] = useState(location.note || "");
  const [parkingType, setParkingType] = useState(location.parkingType || "Calle");
  const [cost, setCost] = useState(location.cost?.toString() || "");
  const [photos, setPhotos] = useState(location.photos || []);
  const [expiryTime, setExpiryTime] = useState(location.expiryTime);
  const [reminderMinutes, setReminderMinutes] = useState(location.reminderMinutes);
  const [isSaving, setIsSaving] = useState(false);

  const [newLatitude, setNewLatitude] = useState(location.latitude);
  const [newLongitude, setNewLongitude] = useState(location.longitude);
  const [newAddress, setNewAddress] = useState<string | undefined>(location.address);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [isGettingAddress, setIsGettingAddress] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([location.latitude, location.longitude]);
  const [mapZoom] = useState(15);

  const mapRef = useRef<L.Map | null>(null);

  React.useEffect(() => {
    if (location) {
      setNote(location.note || "");
      setParkingType(location.parkingType || "Calle");
      setCost(location.cost?.toString() || "");
      setPhotos(location.photos || []);
      setExpiryTime(location.expiryTime);
      setReminderMinutes(location.reminderMinutes);
      setNewLatitude(location.latitude);
      setNewLongitude(location.longitude);
      setNewAddress(location.address);
      setMapCenter([location.latitude, location.longitude]);
      setIsEditingLocation(false);
    }
  }, [location]);

  const getAddressFromCoordinates = useCallback(async (lat: number, lng: number) => {
    setIsGettingAddress(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Rate limiting
      const address = await LocationUtils.reverseGeocode(lat, lng);
      setNewAddress(address || "Dirección no disponible");
    } catch (error) {
      console.error("Error getting address:", error);
      setNewAddress("Error al obtener dirección");
    } finally {
      setIsGettingAddress(false);
    }
  }, []);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      setNewLatitude(lat);
      setNewLongitude(lng);
      setMapCenter([lat, lng]);
      getAddressFromCoordinates(lat, lng);
      toast.success("📍 Nueva ubicación marcada");
    },
    [getAddressFromCoordinates]
  );

  const getCurrentLocation = useCallback(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation: [number, number] = [position.coords.latitude, position.coords.longitude];
          setNewLatitude(userLocation[0]);
          setNewLongitude(userLocation[1]);
          setMapCenter(userLocation);
          getAddressFromCoordinates(userLocation[0], userLocation[1]);
          toast.success("📍 Ubicación actualizada a tu posición actual");
        },
        (error) => {
          console.error("Error getting current location:", error);
          toast.error("No se pudo obtener tu ubicación actual");
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    } else {
      toast.error("Geolocalización no disponible en este navegador");
    }
  }, [getAddressFromCoordinates]);

  const resetLocation = useCallback(() => {
    setNewLatitude(location.latitude);
    setNewLongitude(location.longitude);
    setNewAddress(location.address);
    setMapCenter([location.latitude, location.longitude]);
    setIsEditingLocation(false);
    toast.info("📍 Ubicación restablecida a la original");
  }, [location]);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const updates: Partial<CarLocation> = {
        note: note.trim() || undefined,
        parkingType: parkingType as any,
        cost: cost ? parseFloat(cost) : undefined,
        photos: photos.length > 0 ? photos : undefined,
        expiryTime,
        reminderMinutes,
      };

      const locationChanged = newLatitude !== location.latitude || newLongitude !== location.longitude;

      if (locationChanged) {
        updates.latitude = newLatitude;
        updates.longitude = newLongitude;
        updates.address = newAddress;
        updates.isManualPlacement = true;
      }

      await onSave(updates);

      toast.success(
        locationChanged ? "✅ Ubicación y datos actualizados correctamente" : "✅ Ubicación actualizada correctamente"
      );
      onClose();
    } catch (error) {
      toast.error("❌ Error al actualizar la ubicación");
      console.error("Error updating location:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const parkingTypeOptions = [
    {
      value: "Calle",
      icon: "🛣️",
      label: "Calle",
      description: "Aparcamiento en la calle",
      color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300",
    },
    {
      value: "Garaje",
      icon: "🏢",
      label: "Garaje",
      description: "Garaje subterráneo",
      color: "text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800 dark:text-gray-300",
    },
    {
      value: "Parking",
      icon: "🅿️",
      label: "Parking",
      description: "Aparcamiento al aire libre",
      color: "text-green-600 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800 dark:text-green-300",
    },
    {
      value: "Otro",
      icon: "📍",
      label: "Otro",
      description: "Otro tipo de aparcamiento",
      color:
        "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-300",
    },
  ] as const;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLocationTypeInfo = () => {
    if (location.isManualPlacement || newLatitude !== location.latitude || newLongitude !== location.longitude) {
      return {
        icon: "🎯",
        text: "Ubicación editada manualmente",
        description: "Coordenadas modificadas",
      };
    }

    if (location.accuracy && location.accuracy <= 10) {
      return {
        icon: "🎯",
        text: "GPS de alta precisión",
        description: `±${Math.round(location.accuracy)}m`,
      };
    }

    return {
      icon: "📍",
      text: "GPS automático",
      description: location.accuracy ? `±${Math.round(location.accuracy)}m` : "Ubicación GPS",
    };
  };

  const locationTypeInfo = getLocationTypeInfo();
  const locationChanged = newLatitude !== location.latitude || newLongitude !== location.longitude;

  const getMapConfig = (mapType: string) => {
    switch (mapType) {
      case "satellite":
        return {
          url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          attribution: "&copy; Esri",
        };
      case "terrain":
        return {
          url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
          attribution: "&copy; OpenStreetMap contributors, SRTM",
        };
      default:
        return {
          url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          attribution: "&copy; OpenStreetMap contributors",
        };
    }
  };

  const mapConfig = getMapConfig(mapType);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Edit className="h-5 w-5 text-primary" />
            Editar Ubicación
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">📝 Detalles</TabsTrigger>
            <TabsTrigger value="location">📍 Ubicación</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-6">
            {/* Información de la ubicación (solo lectura) */}
            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Info className="w-4 h-4" />
                  Información de la ubicación
                </div>

                <div className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Guardada:</span>
                    <span className="font-medium">{formatDate(location.timestamp)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Coordenadas:</span>
                    <span className="font-mono text-xs">
                      {newLatitude.toFixed(6)}, {newLongitude.toFixed(6)}
                      {locationChanged && <span className="text-orange-500 ml-1">(modificada)</span>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tipo de ubicación:</span>
                    <div className="flex items-center gap-1">
                      <span>{locationTypeInfo.icon}</span>
                      <span className="text-xs">{locationTypeInfo.text}</span>
                    </div>
                  </div>

                  {newAddress && (
                    <div className="pt-2 border-t border-border/50">
                      <span className="text-muted-foreground text-xs">Dirección:</span>
                      <p className="text-xs mt-1 leading-relaxed">
                        {newAddress}
                        {locationChanged && <span className="text-orange-500 ml-1">(actualizada)</span>}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Formulario de edición */}
            <div className="space-y-4">
              {/* Nota descriptiva */}
              <div className="space-y-2">
                <Label htmlFor="edit-note" className="text-sm font-medium">
                  Nota descriptiva
                </Label>
                <Input
                  id="edit-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Describe dónde está tu coche..."
                  maxLength={100}
                />
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Sé específico para encontrarlo fácilmente</span>
                  <span>{note.length}/100</span>
                </div>
              </div>

              {/* Tipo de aparcamiento */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Tipo de aparcamiento</Label>
                <div className="grid grid-cols-2 gap-3">
                  {parkingTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all duration-200 text-left hover:scale-[1.02]",
                        parkingType === option.value
                          ? `${option.color} border-current`
                          : "border-muted bg-background hover:bg-muted/50 hover:border-muted-foreground/20"
                      )}
                      onClick={() => setParkingType(option.value)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{option.icon}</span>
                        <span className="font-medium text-sm truncate">{option.label}</span>
                      </div>
                      <p className="text-xs opacity-75 leading-tight">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Coste */}
              <div className="space-y-2">
                <Label htmlFor="edit-cost" className="text-sm font-medium">
                  Coste (opcional)
                </Label>
                <div className="relative">
                  <Input
                    id="edit-cost"
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Fotos */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                <Label className="text-sm font-medium">Fotos del lugar</Label>
              </div>
              <PhotoCapture photos={photos} onPhotosChange={setPhotos} maxPhotos={5} quality="medium" />
            </div>

            <Separator />

            {/* Temporizador */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <Label className="text-sm font-medium">Temporizador de parking</Label>
              </div>
              <ParkingTimer
                expiryTime={expiryTime}
                reminderMinutes={reminderMinutes}
                onExpiryTimeChange={setExpiryTime}
                onReminderChange={setReminderMinutes}
              />
            </div>
          </TabsContent>

          <TabsContent value="location" className="space-y-6 mt-6">
            {/* NUEVA PESTAÑA: Editor de ubicación */}
            <div className="space-y-4">
              {/* Controles de ubicación */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={isEditingLocation ? "destructive" : "default"}
                  size="sm"
                  onClick={() => setIsEditingLocation(!isEditingLocation)}
                >
                  {isEditingLocation ? (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Terminar edición
                    </>
                  ) : (
                    <>
                      <Target className="h-4 w-4 mr-2" />
                      Editar ubicación
                    </>
                  )}
                </Button>

                <Button variant="outline" size="sm" onClick={getCurrentLocation}>
                  <Navigation className="h-4 w-4 mr-2" />
                  Mi ubicación actual
                </Button>

                <Button variant="outline" size="sm" onClick={resetLocation}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Resetear
                </Button>
              </div>

              {/* Estado de edición */}
              {isEditingLocation && (
                <Alert>
                  <Target className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Modo edición activo.</strong> Haz clic en el mapa para marcar la nueva ubicación de tu
                    coche.
                  </AlertDescription>
                </Alert>
              )}

              {/* Cambios detectados */}
              {locationChanged && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Ubicación modificada.</strong> Las coordenadas han cambiado y se marcarán como editadas
                    manualmente.
                  </AlertDescription>
                </Alert>
              )}

              {/* Mapa */}
              <div className="border rounded-lg overflow-hidden" style={{ height: "400px" }}>
                <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: "100%", width: "100%" }} ref={mapRef}>
                  <TileLayer url={mapConfig.url} attribution={mapConfig.attribution} />

                  <MapClickHandler onMapClick={handleMapClick} isEditingLocation={isEditingLocation} />

                  {/* Marcador de la nueva ubicación */}
                  <Marker position={[newLatitude, newLongitude]} icon={createCarIcon(isEditingLocation)}>
                    <Popup>
                      <div className="text-center p-2">
                        <h4 className="font-semibold text-blue-600 mb-2">
                          {locationChanged ? "🚗 Nueva ubicación" : "🚗 Ubicación actual"}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">
                          {newLatitude.toFixed(6)}, {newLongitude.toFixed(6)}
                        </p>
                        {isGettingAddress && <p className="text-xs text-gray-500">Obteniendo dirección...</p>}
                        {newAddress && !isGettingAddress && <p className="text-xs text-gray-500">{newAddress}</p>}
                      </div>
                    </Popup>
                  </Marker>

                  {/* Marcador de la ubicación original (si ha cambiado) */}
                  {locationChanged && (
                    <Marker position={[location.latitude, location.longitude]} icon={createCarIcon(false)}>
                      <Popup>
                        <div className="text-center p-2">
                          <h4 className="font-semibold text-gray-600 mb-2">📍 Ubicación original</h4>
                          <p className="text-sm text-gray-600">
                            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>

              {/* Información de la nueva ubicación */}
              {locationChanged && (
                <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-orange-600" />
                        <span className="font-medium">Nueva ubicación seleccionada:</span>
                      </div>

                      <div className="text-sm text-muted-foreground font-mono">
                        📍 {newLatitude.toFixed(6)}, {newLongitude.toFixed(6)}
                      </div>

                      {isGettingAddress ? (
                        <div className="text-sm text-muted-foreground">🔍 Obteniendo dirección...</div>
                      ) : newAddress ? (
                        <div className="text-sm text-muted-foreground">🏠 {newAddress}</div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Cambios detectados en general */}
        {(note !== (location.note || "") ||
          parkingType !== (location.parkingType || "Calle") ||
          cost !== (location.cost?.toString() || "") ||
          photos !== location.photos ||
          expiryTime !== location.expiryTime ||
          reminderMinutes !== location.reminderMinutes ||
          locationChanged) && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Nota:</strong> Los cambios se guardarán al presionar "Guardar cambios".
              {locationChanged && (
                <div className="mt-1 text-sm">• La ubicación será marcada como editada manualmente</div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving} className="w-full sm:w-auto">
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar cambios
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditLocationDialog;
