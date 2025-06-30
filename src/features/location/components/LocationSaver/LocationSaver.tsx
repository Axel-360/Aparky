// LocationSaver.tsx - VERSIÓN ULTRA SIMPLIFICADA
import React, { useState, useEffect } from "react";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Alert, AlertDescription } from "@/shared/ui";
import { toast } from "sonner";
import { MapPin, Loader2, AlertTriangle } from "lucide-react";
import { useGeolocation } from "../../hooks/useGeolocation";
import { PhotoCapture } from "../../../photo";
import { ParkingTimer } from "../../../parking";
import type { CarLocation } from "../../../../types/location";

interface LocationSaverProps {
  onLocationSaved: (location: CarLocation) => void;
  autoSave: boolean;
  defaultReminderMinutes?: number;
  maxPhotos?: number;
  photoQuality?: "low" | "medium" | "high";
}

const LocationSaver: React.FC<LocationSaverProps> = ({
  onLocationSaved,
  autoSave,
  defaultReminderMinutes = 15,
  maxPhotos = 3,
  photoQuality = "medium",
}) => {
  // Solo necesitamos saber si tenemos ubicación y si hay error
  const { latitude, longitude, error, loading, getCurrentPosition } = useGeolocation();

  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [parkingType, setParkingType] = useState<"Calle" | "Garaje" | "Parking" | "Otro">("Calle");
  const [cost, setCost] = useState<string>("");
  const [expiryTime, setExpiryTime] = useState<number | undefined>();
  const [reminderMinutes, setReminderMinutes] = useState<number | undefined>(defaultReminderMinutes);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Auto-save logic sin mostrar detalles al usuario
  useEffect(() => {
    if (autoSave && latitude && longitude && !saving) {
      handleSaveLocation(true);
    }
  }, [latitude, longitude, autoSave]);

  const handleSaveLocation = async (isAutoSave: boolean = false) => {
    // Si no tenemos ubicación, obtenerla silenciosamente
    if (!latitude || !longitude) {
      getCurrentPosition();
      return;
    }

    setSaving(true);

    try {
      // Obtener dirección en background
      const address = await getAddressFromCoordinates(latitude, longitude);

      const newLocation: CarLocation = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        latitude,
        longitude,
        address,
        timestamp: Date.now(),
        note: note.trim() || undefined,
        photos: photos.length > 0 ? photos : undefined,
        parkingType,
        expiryTime,
        cost: cost ? parseFloat(cost) : undefined,
        reminderMinutes: expiryTime ? reminderMinutes : undefined,
      };

      // Guardar y notificar
      onLocationSaved(newLocation);

      // Limpiar formulario si no es auto-save
      if (!isAutoSave) {
        setNote("");
        setPhotos([]);
        setCost("");
        setExpiryTime(undefined);
        setShowAdvanced(false);
      }

      toast.success(isAutoSave ? "📍 Ubicación guardada automáticamente" : "✅ Ubicación guardada correctamente");
    } catch (error) {
      console.error("Error saving location:", error);
      toast.error("❌ No se pudo guardar la ubicación");
    } finally {
      setSaving(false);
    }
  };

  const parkingTypeOptions = [
    { value: "Calle", icon: "🛣️", label: "Calle", description: "Aparcamiento en la calle" },
    { value: "Garaje", icon: "🏢", label: "Garaje", description: "Garaje subterráneo" },
    { value: "Parking", icon: "🅿️", label: "Parking", description: "Aparcamiento al aire libre" },
    { value: "Otro", icon: "📍", label: "Otro", description: "Otro tipo de aparcamiento" },
  ] as const;

  return (
    <Card className="w-full shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Guardar ubicación
          </CardTitle>
          {autoSave && (
            <div className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
              🤖 Auto-guardado
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* SOLO mostrar errores importantes al usuario */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No se pudo obtener tu ubicación.
              <br />
              <Button variant="link" className="p-0 h-auto text-xs underline" onClick={getCurrentPosition}>
                Intentar de nuevo
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Tipo de aparcamiento */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Tipo de aparcamiento</Label>
          <div className="grid grid-cols-2 gap-3">
            {parkingTypeOptions.map((option) => {
              const isSelected = parkingType === option.value;
              const getOptionColors = (type: string) => {
                switch (type) {
                  case "Calle":
                    return isSelected
                      ? "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300"
                      : "border-muted bg-background hover:bg-muted/50 hover:border-muted-foreground/20";
                  case "Garaje":
                    return isSelected
                      ? "text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800 dark:text-gray-300"
                      : "border-muted bg-background hover:bg-muted/50 hover:border-muted-foreground/20";
                  case "Parking":
                    return isSelected
                      ? "text-green-600 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800 dark:text-green-300"
                      : "border-muted bg-background hover:bg-muted/50 hover:border-muted-foreground/20";
                  case "Otro":
                    return isSelected
                      ? "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-300"
                      : "border-muted bg-background hover:bg-muted/50 hover:border-muted-foreground/20";
                  default:
                    return "border-muted bg-background hover:bg-muted/50 hover:border-muted-foreground/20";
                }
              };

              return (
                <button
                  key={option.value}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 text-left hover:scale-[1.02] ${getOptionColors(
                    option.value
                  )}`}
                  onClick={() => setParkingType(option.value)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{option.icon}</span>
                    <span className="font-medium text-sm truncate">{option.label}</span>
                  </div>
                  <p className="text-xs opacity-75 leading-tight">{option.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Nota descriptiva */}
        <div className="space-y-2">
          <Label htmlFor="note">Nota descriptiva</Label>
          <Input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: Nivel 2, plaza A-15, cerca del ascensor"
            maxLength={100}
          />
          <div className="text-xs text-muted-foreground text-right">{note.length}/100</div>
        </div>

        {/* Costo */}
        <div className="space-y-2">
          <Label htmlFor="cost">Costo (opcional)</Label>
          <div className="relative">
            <Input
              id="cost"
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

        {/* Opciones avanzadas colapsables */}
        {showAdvanced && (
          <div className="space-y-4 pt-4 border-t">
            <PhotoCapture photos={photos} onPhotosChange={setPhotos} maxPhotos={maxPhotos} quality={photoQuality} />
            <ParkingTimer
              expiryTime={expiryTime}
              reminderMinutes={reminderMinutes}
              onExpiryTimeChange={setExpiryTime}
              onReminderChange={setReminderMinutes}
            />
          </div>
        )}

        {/* Toggle avanzado */}
        <Button type="button" variant="ghost" onClick={() => setShowAdvanced(!showAdvanced)} className="w-full text-sm">
          {showAdvanced ? "← Ocultar opciones" : "Más opciones →"}
        </Button>

        {/* Botón principal - MUY SIMPLE */}
        <Button
          onClick={() => handleSaveLocation(false)}
          disabled={loading || saving}
          className="w-full h-12 text-base font-semibold"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Obteniendo ubicación...
            </>
          ) : saving ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>💾 Guardar mi coche aquí</>
          )}
        </Button>

        {/* Info mínima y útil */}
        <div className="text-center text-xs text-muted-foreground">
          {latitude && longitude ? (
            <span className="text-green-600 dark:text-green-400">✅ Ubicación lista para guardar</span>
          ) : (
            <span>📍 Obteniendo tu ubicación...</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Función helper (mantener en utils)
const getAddressFromCoordinates = async (lat: number, lng: number): Promise<string | undefined> => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 500)); // Rate limiting
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { "User-Agent": "CarLocationApp/1.0" } }
    );

    if (!response.ok) return undefined;

    const data = await response.json();
    return data.display_name;
  } catch (error) {
    console.error("Error getting address:", error);
    return undefined;
  }
};

export default LocationSaver;
