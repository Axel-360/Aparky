//src/features/location/components/LocationSaver/LocationSaver.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Alert, AlertDescription, Badge } from "@/shared/ui";
import { toast } from "sonner";
import {
  MapPin,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  Navigation,
  CheckCircle,
  Clock,
  Camera,
  Euro,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useGeolocation } from "../../hooks/useGeolocation";
import { PhotoCapture } from "../../../photo";
import { ParkingTimer } from "../../../parking";
import { UnifiedMap } from "../UnifiedMap/UnifiedMap";
import type { CarLocation } from "../../../../types/location";

interface LocationSaverProps {
  onLocationSaved: (location: CarLocation) => void;
  autoSave: boolean;
  defaultReminderMinutes?: number;
  maxPhotos?: number;
  photoQuality?: "low" | "medium" | "high";
  mapType?: string;
  initialCenter?: [number, number];
  initialZoom?: number;
}

const LocationSaver: React.FC<LocationSaverProps> = ({
  onLocationSaved,
  autoSave,
  defaultReminderMinutes = 15,
  maxPhotos = 3,
  photoQuality = "medium",
  mapType = "osm",
  initialCenter = [40.4168, -3.7038],
  initialZoom = 13,
}) => {
  const { latitude, longitude, accuracy, error, loading, getCurrentPosition } = useGeolocation();

  // Estados básicos
  const [saving, setSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Estados de forma inteligente
  const [smartFormMode, setSmartFormMode] = useState<"simple" | "detailed">("simple");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [parkingType, setParkingType] = useState<"Calle" | "Garaje" | "Parking" | "Otro">("Calle");
  const [cost, setCost] = useState<string>("");
  const [expiryTime, setExpiryTime] = useState<number | undefined>();
  const [reminderMinutes, setReminderMinutes] = useState<number | undefined>(defaultReminderMinutes);

  // Estados para ubicación manual
  const [manualLocation, setManualLocation] = useState<[number, number] | null>(null);
  const [showManualMode, setShowManualMode] = useState(false);
  const [address, setAddress] = useState<string>("");
  const [isGettingAddress, setIsGettingAddress] = useState(false);

  // Estados de animación y feedback
  const [justSaved, setJustSaved] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);

  // Detectar conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 🚀 NUEVO: Efecto para obtener GPS al cargar
  useEffect(() => {
    // Auto-obtener GPS cuando el componente se monta y no estamos en modo manual
    if (!showManualMode && !latitude && !longitude && !loading && !error) {
      const timer = setTimeout(() => {
        getCurrentPosition();
      }, 1000); // Delay de 1 segundo para dar tiempo a que se monte el componente

      return () => clearTimeout(timer);
    }
  }, [showManualMode, latitude, longitude, loading, error, getCurrentPosition]);

  // Auto-save inteligente
  useEffect(() => {
    if (autoSave && latitude && longitude && !saving && isOnline) {
      // Delay para evitar múltiples guardados
      const timer = setTimeout(() => {
        handleSaveLocation(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [latitude, longitude, autoSave, saving, isOnline]);

  // Obtener dirección automáticamente
  useEffect(() => {
    const location = manualLocation || (latitude && longitude ? [latitude, longitude] : null);
    if (location && isOnline) {
      getAddressFromCoordinates(location[0], location[1]);
    }
  }, [manualLocation, latitude, longitude, isOnline]);

  const getAddressFromCoordinates = async (lat: number, lng: number) => {
    if (!isOnline) return;

    setIsGettingAddress(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300)); // Debounce
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { "User-Agent": "CarLocationApp/1.0" } }
      );

      if (response.ok) {
        const data = await response.json();
        setAddress(data.display_name || "Dirección no disponible");
      }
    } catch (error) {
      console.error("Error getting address:", error);
    } finally {
      setIsGettingAddress(false);
    }
  };

  const handleSaveLocation = async (isAutoSave: boolean = false) => {
    const finalLat = manualLocation ? manualLocation[0] : latitude;
    const finalLng = manualLocation ? manualLocation[1] : longitude;

    if (!finalLat || !finalLng) {
      if (!showManualMode) {
        getCurrentPosition();
        toast.error("📍 No se pudo obtener tu ubicación. Activa el GPS o usa modo manual.");
        return;
      } else {
        toast.error("🎯 Por favor, marca una ubicación en el mapa");
        return;
      }
    }

    setSaving(true);
    setSaveProgress(0);

    try {
      // Animación de progreso
      const progressInterval = setInterval(() => {
        setSaveProgress((prev) => Math.min(prev + 20, 90));
      }, 100);

      const newLocation: CarLocation = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        latitude: finalLat,
        longitude: finalLng,
        address: address || undefined,
        timestamp: Date.now(),
        note: note.trim() || undefined,
        photos: photos.length > 0 ? photos : undefined,
        parkingType,
        expiryTime,
        cost: cost ? parseFloat(cost) : undefined,
        reminderMinutes: expiryTime ? reminderMinutes : undefined,
        isManualPlacement: !!manualLocation,
        accuracy: accuracy || undefined,
      };

      await new Promise((resolve) => setTimeout(resolve, 500)); // Simular procesamiento

      clearInterval(progressInterval);
      setSaveProgress(100);

      onLocationSaved(newLocation);

      // Feedback visual exitoso
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);

      // Limpiar formulario inteligentemente
      if (!isAutoSave) {
        if (smartFormMode === "simple") {
          // En modo simple, limpiar todo excepto tipo de parking (recordar preferencia)
          setNote("");
          setPhotos([]);
          setCost("");
          setExpiryTime(undefined);
        } else {
          // En modo detallado, mantener algunas preferencias
          if (!note.includes("Nivel") && !note.includes("Plaza")) {
            setNote(""); // Solo limpiar si no parece info específica del lugar
          }
        }
        setManualLocation(null);
        setShowManualMode(false);
      }

      const emoji = isAutoSave ? "⚡" : manualLocation ? "🎯" : "📍";
      const message = isAutoSave
        ? "Ubicación guardada automáticamente"
        : manualLocation
        ? "Ubicación manual guardada"
        : "Ubicación GPS guardada";

      toast.success(`${emoji} ${message}`, {
        description: address ? `📍 ${address.split(",")[0]}` : undefined,
        duration: 4000,
      });
    } catch (error) {
      console.error("Error saving location:", error);
      toast.error("❌ No se pudo guardar la ubicación", {
        description: "Inténtalo de nuevo en unos segundos",
        action: {
          label: "Reintentar",
          onClick: () => handleSaveLocation(isAutoSave),
        },
      });
    } finally {
      setSaving(false);
      setSaveProgress(0);
    }
  };

  const toggleManualMode = () => {
    setShowManualMode(!showManualMode);
    setManualLocation(null);
    if (!showManualMode) {
      toast.info("🎯 Modo manual activado. Haz clic en el mapa para marcar la ubicación.");
    }
  };

  const handleManualLocationSet = (lat: number, lng: number) => {
    setManualLocation([lat, lng]);
    toast.success("📍 Ubicación marcada correctamente");
  };

  const toggleFormMode = () => {
    setSmartFormMode(smartFormMode === "simple" ? "detailed" : "simple");
  };

  // Quick actions para tipos de parking comunes
  const quickParkingActions = [
    { type: "Calle" as const, icon: "🛣️", color: "bg-blue-100 hover:bg-blue-200 text-blue-800" },
    { type: "Garaje" as const, icon: "🏢", color: "bg-gray-100 hover:bg-gray-200 text-gray-800" },
    { type: "Parking" as const, icon: "🅿️", color: "bg-green-100 hover:bg-green-200 text-green-800" },
    { type: "Otro" as const, icon: "📍", color: "bg-purple-100 hover:bg-purple-200 text-purple-800" },
  ];

  // Determinar el estado de la ubicación
  const getLocationStatus = () => {
    if (showManualMode) {
      return manualLocation
        ? { status: "manual-ready", text: "📍 Ubicación marcada", color: "text-amber-600" }
        : { status: "manual-waiting", text: "🎯 Marca en el mapa", color: "text-orange-500" };
    }

    if (latitude && longitude) {
      const qualityText = accuracy
        ? accuracy <= 10
          ? "Alta precisión"
          : accuracy <= 50
          ? "Buena precisión"
          : "Precisión básica"
        : "Ubicación obtenida";
      return {
        status: "gps-ready",
        text: `📡 ${qualityText}`,
        color: accuracy && accuracy <= 10 ? "text-green-600" : "text-blue-600",
      };
    }

    if (loading) {
      return { status: "loading", text: "🔍 Obteniendo GPS...", color: "text-gray-500" };
    }

    if (error) {
      return { status: "error", text: "❌ Error GPS", color: "text-red-500" };
    }

    return { status: "waiting", text: "⏳ Esperando GPS...", color: "text-gray-500" };
  };

  const locationStatus = getLocationStatus();

  // 🚀 CORREGIDO: Mejorar lógica para habilitar el botón guardar
  const canSave = React.useMemo(() => {
    // No permitir guardar si ya está guardando
    if (saving) return false;

    // No permitir guardar sin conexión (para obtener dirección)
    if (!isOnline) return false;

    // En modo manual, necesita ubicación marcada
    if (showManualMode) {
      return manualLocation !== null;
    }

    // En modo GPS, necesita coordenadas válidas
    if (latitude && longitude) {
      // Verificar que las coordenadas sean válidas
      return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
    }

    return false;
  }, [saving, isOnline, showManualMode, manualLocation, latitude, longitude]);

  return (
    <Card
      className={`w-full transition-all duration-300 ${
        justSaved
          ? "ring-2 ring-green-500 shadow-lg bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-gray-900"
          : "shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800"
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Guardar ubicación
            {justSaved && <CheckCircle className="w-4 h-4 text-green-500 animate-pulse" />}
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Indicador de conexión */}
            {isOnline ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}

            {/* Indicador de auto-save */}
            {autoSave && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Auto
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Estado de error mejorado */}
        {error && !showManualMode && (
          <Alert variant="destructive" className="animate-in slide-in-from-top-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>
                  <strong>No se pudo obtener tu ubicación GPS</strong>
                </p>
                <p className="text-xs opacity-90">Posibles causas: GPS desactivado, permisos denegados, o mala señal</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={getCurrentPosition}>
                    🔄 Reintentar GPS
                  </Button>
                  <Button variant="outline" size="sm" onClick={toggleManualMode}>
                    🎯 Modo manual
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Selector de tipo de parking rápido */}
        {smartFormMode === "simple" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de aparcamiento</label>
            <div className="grid grid-cols-4 gap-2">
              {quickParkingActions.map((action) => (
                <Button
                  key={action.type}
                  variant="outline"
                  size="sm"
                  onClick={() => setParkingType(action.type)}
                  className={`${action.color} border-2 transition-all ${
                    parkingType === action.type ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <span className="text-base">{action.icon}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Mapa unificado mejorado */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm">Ubicación</h3>
              <span className={`text-xs ${locationStatus.color}`}>{locationStatus.text}</span>
            </div>

            <div className="flex gap-1">
              {!loading && (
                <Button
                  variant={showManualMode ? "default" : "outline"}
                  size="sm"
                  onClick={toggleManualMode}
                  className="text-xs h-7"
                >
                  {showManualMode ? (
                    <>
                      <Target className="w-3 h-3 mr-1" />
                      Manual
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3 h-3 mr-1" />
                      GPS
                    </>
                  )}
                </Button>
              )}

              {/* 🚀 NUEVO: Botón de forzar GPS */}
              {!showManualMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    getCurrentPosition();
                    toast.info("🔍 Obteniendo tu ubicación GPS...");
                  }}
                  disabled={loading}
                  className="text-xs h-7"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                </Button>
              )}
            </div>
          </div>

          {/* Mapa con altura adaptativa */}
          <div className="border rounded-lg overflow-hidden transition-all duration-300">
            <UnifiedMap
              center={manualLocation || (latitude && longitude ? [latitude, longitude] : initialCenter)}
              zoom={initialZoom}
              mapType={mapType}
              height={smartFormMode === "simple" ? "180px" : "220px"}
              isManualMode={showManualMode}
              manualLocation={manualLocation}
              onManualLocationSet={handleManualLocationSet}
              gpsLocation={latitude && longitude ? [latitude, longitude] : null}
              showControls={true}
              showLocationButton={true}
              onCenterChange={(center: [number, number], zoom: number) => {
                // 🚀 NUEVO: Cuando el mapa se centra, forzar actualización del GPS
                if (!showManualMode && !manualLocation) {
                  // Si estamos en modo GPS y el mapa se centra, obtener ubicación actual
                  getCurrentPosition();
                }
              }}
            />
          </div>

          {/* Info de dirección con loading */}
          {address && (
            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded text-center">
              {isGettingAddress ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Obteniendo dirección...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {address.split(",").slice(0, 2).join(", ")}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 🚀 NUEVO: Información de debug en desarrollo
        {process.env.NODE_ENV === "development" && (
          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded space-y-1">
            <div>📍 GPS: {latitude ? `${latitude.toFixed(4)}, ${longitude?.toFixed(4)}` : "No disponible"}</div>
            <div>
              🎯 Manual:{" "}
              {manualLocation ? `${manualLocation[0].toFixed(4)}, ${manualLocation[1].toFixed(4)}` : "No marcada"}
            </div>
            <div>🔘 Modo: {showManualMode ? "Manual" : "GPS"}</div>
            <div>✅ Puede guardar: {canSave ? "Sí" : "No"}</div>
            <div>📶 Conexión: {isOnline ? "Sí" : "No"}</div>
            {accuracy && <div>🎯 Precisión: ±{Math.round(accuracy)}m</div>}
          </div>
        )} */}

        {/* Toggle modo de formulario */}
        <Button
          type="button"
          variant="ghost"
          onClick={toggleFormMode}
          className="w-full text-sm flex items-center justify-center gap-2 hover:bg-muted/50"
        >
          {smartFormMode === "simple" ? (
            <>
              <ChevronDown className="w-4 h-4" />
              Más opciones
              <div className="flex items-center gap-1 ml-2">
                <Camera className="w-3 h-3" />
                <Clock className="w-3 h-3" />
                <Euro className="w-3 h-3" />
              </div>
            </>
          ) : (
            <>
              <ChevronUp className="w-4 h-4" />
              Modo simple
            </>
          )}
        </Button>

        {/* Formulario detallado */}
        {smartFormMode === "detailed" && (
          <div className="space-y-4 pt-4 border-t border-dashed animate-in slide-in-from-top-2">
            {/* Tipo de aparcamiento detallado */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Tipo de aparcamiento</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "Calle", icon: "🛣️", label: "Calle", desc: "En la vía pública" },
                  { value: "Garaje", icon: "🏢", label: "Garaje", desc: "Subterráneo privado" },
                  { value: "Parking", icon: "🅿️", label: "Parking", desc: "Al aire libre" },
                  { value: "Otro", icon: "📍", label: "Otro", desc: "Otro tipo" },
                ].map((option) => (
                  <button
                    key={option.value}
                    className={`p-3 rounded-lg border-2 transition-all text-left text-sm hover:scale-[1.02] ${
                      parkingType === option.value
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                        : "border-muted bg-background hover:bg-muted/50"
                    }`}
                    onClick={() => setParkingType(option.value as any)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{option.icon}</span>
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <p className="text-xs opacity-75">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Resto de campos detallados */}
            <div className="grid grid-cols-2 gap-4">
              {/* Nota */}
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">Nota descriptiva</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej: Nivel -2, plaza B-15, cerca del ascensor"
                  maxLength={100}
                  className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
                <div className="text-xs text-muted-foreground text-right">{note.length}/100</div>
              </div>
            </div>

            {/* Componentes avanzados */}
            <PhotoCapture photos={photos} onPhotosChange={setPhotos} maxPhotos={maxPhotos} quality={photoQuality} />

            <ParkingTimer
              expiryTime={expiryTime}
              reminderMinutes={reminderMinutes}
              onExpiryTimeChange={setExpiryTime}
              onReminderChange={setReminderMinutes}
            />

            {/* Coste */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Coste (€)</label>
              <div className="relative">
                <input
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full p-2 border rounded-md text-sm pr-8 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
                <Euro className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        )}

        {/* Botón de guardar mejorado */}
        <Button
          onClick={() => handleSaveLocation(false)}
          disabled={!canSave}
          className={`w-full h-12 text-base font-semibold relative overflow-hidden transition-all duration-300 ${
            !canSave ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02]"
          }`}
          size="lg"
        >
          {/* Barra de progreso */}
          {saving && (
            <div
              className="absolute inset-0 bg-white/20 transition-all duration-300"
              style={{ width: `${saveProgress}%` }}
            />
          )}

          <div className="relative z-10 flex items-center justify-center gap-2">
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Obteniendo ubicación...
              </>
            ) : saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Guardando... {saveProgress}%
              </>
            ) : justSaved ? (
              <>
                <CheckCircle className="w-5 h-5" />
                ¡Guardado!
              </>
            ) : !isOnline ? (
              <>
                <WifiOff className="w-5 h-5" />
                Sin conexión
              </>
            ) : error && !showManualMode ? (
              <>
                <AlertTriangle className="w-5 h-5" />
                Error GPS - Usa modo manual
              </>
            ) : !canSave && showManualMode ? (
              <>
                <Target className="w-5 h-5" />
                Marca ubicación en el mapa
              </>
            ) : !canSave && !latitude && !longitude ? (
              <>
                <Navigation className="w-5 h-5" />
                Esperando GPS...
              </>
            ) : (
              <>💾 Guardar mi coche aquí</>
            )}
          </div>
        </Button>

        {/* Estado offline */}
        {!isOnline && (
          <Alert className="animate-in slide-in-from-bottom-2">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              <strong>Sin conexión a internet</strong>
              <br />
              <span className="text-xs">La ubicación se guardará cuando recuperes la conexión</span>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default LocationSaver;
