// src/features/location/components/ManualCarPlacement/ManualCarPlacement.tsx - ARREGLADO
import React, { useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, useMapEvents, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Alert,
  AlertDescription,
  Card,
  CardContent,
  Badge,
} from "@/shared/ui";
import { MapPin, Save, X, Navigation, AlertTriangle, Target, Info } from "lucide-react";
import type { CarLocation } from "@/types/location";
import { saveCarLocation } from "@/utils/storage";
import { toast } from "sonner";

interface ManualCarPlacementProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSaved: (location: CarLocation) => void;
  initialCenter?: [number, number];
  mapType?: "osm" | "satellite" | "terrain";
}

// Icono personalizado para el marcador del coche
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
    className: "manual-car-marker",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
};

// 🚀 NUEVO: Componente para actualizar la vista del mapa automáticamente
const MapViewController: React.FC<{
  center: [number, number];
  zoom: number;
  shouldFlyTo?: boolean;
}> = ({ center, zoom, shouldFlyTo = false }) => {
  const map = useMap();

  React.useEffect(() => {
    if (shouldFlyTo) {
      // Usar flyTo para una animación suave
      map.flyTo(center, zoom, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    } else {
      // Usar setView para cambio inmediato
      map.setView(center, zoom);
    }
  }, [map, center, zoom, shouldFlyTo]);

  return null;
};

// Componente para manejar los clics en el mapa
const MapClickHandler: React.FC<{
  onMapClick: (lat: number, lng: number) => void;
  isPlacementMode: boolean;
}> = ({ onMapClick, isPlacementMode }) => {
  useMapEvents({
    click: (e) => {
      if (isPlacementMode) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

// Configuraciones de mapas
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

const ManualCarPlacement: React.FC<ManualCarPlacementProps> = ({
  isOpen,
  onClose,
  onLocationSaved,
  initialCenter = [40.4168, -3.7038],
  mapType = "osm",
}) => {
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);
  const [note, setNote] = useState("");
  const [address, setAddress] = useState<string>("");
  const [isPlacementMode, setIsPlacementMode] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(initialCenter);
  const [zoom, setZoom] = useState(15);
  const [addressLoading, setAddressLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // 🚀 NUEVO: Estado para controlar cuándo hacer flyTo
  const [shouldFlyToCenter, setShouldFlyToCenter] = useState(false);

  const mapRef = useRef<L.Map | null>(null);

  // Obtener dirección de las coordenadas
  const getAddressFromCoordinates = useCallback(async (lat: number, lng: number) => {
    setAddressLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { "User-Agent": "CarLocationApp/1.0" } }
      );

      if (response.ok) {
        const data = await response.json();
        setAddress(data.display_name || "Dirección no disponible");
      } else {
        setAddress("No se pudo obtener la dirección");
      }
    } catch (error) {
      console.error("Error getting address:", error);
      setAddress("Error al obtener dirección");
    } finally {
      setAddressLoading(false);
    }
  }, []);

  // Manejar clic en el mapa
  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      setSelectedPosition([lat, lng]);
      getAddressFromCoordinates(lat, lng);
    },
    [getAddressFromCoordinates]
  );

  // 🚀 ARREGLADO: Obtener ubicación actual del usuario y centrar el mapa
  const getCurrentLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocalización no disponible en este navegador");
      return;
    }

    setGpsLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation: [number, number] = [position.coords.latitude, position.coords.longitude];

        // 🚀 CAMBIOS PRINCIPALES:
        // 1. Actualizar el centro del mapa
        setMapCenter(userLocation);
        // 2. Seleccionar automáticamente la nueva ubicación
        setSelectedPosition(userLocation);
        // 3. Ajustar zoom para mejor vista
        setZoom(16);
        // 4. Activar animación flyTo
        setShouldFlyToCenter(true);

        // Obtener dirección de la nueva ubicación
        getAddressFromCoordinates(userLocation[0], userLocation[1]);

        toast.success("📍 Ubicación actual obtenida y marcada en el mapa");
        setGpsLoading(false);

        // Resetear la animación después de un momento
        setTimeout(() => setShouldFlyToCenter(false), 2000);
      },
      (error) => {
        console.error("Error getting current location:", error);
        let errorMessage = "No se pudo obtener tu ubicación actual";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Permiso de ubicación denegado. Permite el acceso en tu navegador.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Ubicación no disponible. Verifica que el GPS esté activado.";
            break;
          case error.TIMEOUT:
            errorMessage = "Tiempo agotado obteniendo ubicación. Inténtalo de nuevo.";
            break;
        }

        toast.error(errorMessage);
        setGpsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, [getAddressFromCoordinates]);

  // Guardar la ubicación marcada
  const handleSaveLocation = useCallback(async () => {
    if (!selectedPosition) {
      toast.error("Por favor, marca una ubicación en el mapa");
      return;
    }

    if (!note.trim()) {
      toast.error("Por favor, añade una nota descriptiva");
      return;
    }

    setIsSaving(true);

    try {
      const newLocation: CarLocation = {
        id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        latitude: selectedPosition[0],
        longitude: selectedPosition[1],
        address: address || undefined,
        timestamp: Date.now(),
        note: note.trim(),
        parkingType: "Otro",
        accuracy: undefined,
        isManualPlacement: true,
      };

      saveCarLocation(newLocation);
      onLocationSaved(newLocation);

      toast.success("Ubicación guardada manualmente", {
        description: "Recuerda que es una ubicación aproximada",
      });

      // Limpiar estado y cerrar
      setSelectedPosition(null);
      setNote("");
      setAddress("");
      onClose();
    } catch (error) {
      console.error("Error saving manual location:", error);
      toast.error("No se pudo guardar la ubicación");
    } finally {
      setIsSaving(false);
    }
  }, [selectedPosition, note, address, onLocationSaved, onClose]);

  // Limpiar estado al cerrar
  const handleClose = useCallback(() => {
    setSelectedPosition(null);
    setNote("");
    setAddress("");
    setIsPlacementMode(true);
    setShouldFlyToCenter(false); // 🚀 NUEVO: Resetear animación
    onClose();
  }, [onClose]);

  // Obtener configuración del mapa
  const mapConfig = getMapConfig(mapType);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[95vh] flex flex-col overflow-hidden">
        <DialogHeader className="pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Marcar ubicación del coche manualmente
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-1">
          {/* Instrucciones */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">📍 Haz clic en el mapa donde está tu coche</p>
                <p className="text-xs">Puedes moverte por el mapa y hacer zoom para ser más preciso</p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Controles del mapa */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              disabled={gpsLoading}
              className="flex items-center gap-2"
            >
              <Navigation className={`h-4 w-4 ${gpsLoading ? "animate-spin" : ""}`} />
              {gpsLoading ? "Obteniendo..." : "Mi ubicación actual"}
            </Button>

            <Badge variant={isPlacementMode ? "default" : "secondary"} className="px-3 py-1">
              {isPlacementMode ? "✅ Modo colocación activo" : "❌ Modo colocación inactivo"}
            </Badge>

            {selectedPosition && (
              <Badge variant="outline" className="px-3 py-1">
                📍 Ubicación seleccionada
              </Badge>
            )}
          </div>

          {/* Mapa */}
          <div className="border rounded-lg overflow-hidden" style={{ height: "300px" }}>
            <MapContainer center={mapCenter} zoom={zoom} style={{ height: "100%", width: "100%" }} ref={mapRef}>
              {/* 🚀 NUEVO: Componente para controlar la vista del mapa */}
              <MapViewController center={mapCenter} zoom={zoom} shouldFlyTo={shouldFlyToCenter} />

              <TileLayer url={mapConfig.url} attribution={mapConfig.attribution} />

              <MapClickHandler onMapClick={handleMapClick} isPlacementMode={isPlacementMode} />

              {selectedPosition && (
                <Marker position={selectedPosition} icon={createCarIcon(true)}>
                  <Popup>
                    <div className="text-center p-2">
                      <h4 className="font-semibold text-blue-600 mb-2">🚗 Ubicación del coche</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}
                      </p>
                      {address && <p className="text-xs text-gray-500">{address}</p>}
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>

          {/* Información de la ubicación seleccionada */}
          {selectedPosition && (
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Ubicación seleccionada:</span>
                  </div>

                  <div className="text-sm text-muted-foreground font-mono">
                    📍 {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}
                  </div>

                  {addressLoading ? (
                    <div className="text-sm text-muted-foreground">🔍 Obteniendo dirección...</div>
                  ) : address ? (
                    <div className="text-sm text-muted-foreground">🏠 {address}</div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Campo de nota obligatorio */}
          <div className="space-y-2">
            <Label htmlFor="manual-note" className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Nota descriptiva (obligatoria para ubicaciones manuales)
            </Label>
            <Input
              id="manual-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: Cerca de la entrada principal del centro comercial, nivel 2"
              maxLength={150}
              className="w-full"
            />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Sé específico para encontrar tu coche más fácilmente</span>
              <span>{note.length}/150</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t flex-shrink-0">
          {/* Alert móvil - solo visible en pantallas pequeñas */}
          <Alert className="sm:hidden">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Esta es una ubicación aproximada. La precisión depende de qué tan bien recuerdes dónde aparcaste.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handleClose} className="flex-1 sm:flex-none">
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>

            <Button
              onClick={handleSaveLocation}
              disabled={!selectedPosition || !note.trim() || isSaving}
              className="flex-1 sm:flex-none"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar ubicación
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManualCarPlacement;
