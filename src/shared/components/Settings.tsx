// src/shared/components/Settings.tsx
import React, { useState } from "react";
import type { UserPreferences } from "@/types/location";
import { getUserPreferences, saveUserPreferences } from "@/utils/preferences";
import { useTheme } from "@/shared/ui/theme-provider";
import { ConfirmationDialog, ResetConfirmationDialog } from "@/shared/components/ConfirmationDialog";
import { LocationManager, LocationPreferenceSettings } from "@/utils/locationDefaults";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Button,
  Separator,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Alert,
  AlertDescription,
  Input,
} from "@/shared/ui";
import { toast } from "sonner";
import {
  Palette,
  Map,
  List,
  Bell,
  Camera,
  Download,
  Upload,
  Trash2,
  Settings as SettingsIcon,
  Monitor,
  Sun,
  Moon,
  Globe,
  Mountain,
  Satellite,
  CheckCircle,
  AlertTriangle,
  FileText,
  MapPin,
  Clock,
  Navigation,
  Target,
  Eye,
  Zap,
} from "lucide-react";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onPreferencesChange: (preferences: UserPreferences) => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, onPreferencesChange }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(getUserPreferences());
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { setTheme } = useTheme();

  const [resetDialog, setResetDialog] = useState({
    isOpen: false,
    isResetting: false,
  });

  const [deleteAllDialog, setDeleteAllDialog] = useState({
    isOpen: false,
    isDeleting: false,
    locationCount: 0,
  });

  const handleChange = (key: keyof UserPreferences, value: any) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    saveUserPreferences({ [key]: value });
    onPreferencesChange(updated);

    if (key === "theme") {
      setTheme(value);
      const themeNames = {
        light: "claro",
        dark: "oscuro",
        system: "sistema",
      };
      toast.success(`Tema cambiado a ${themeNames[value as keyof typeof themeNames]}`);
    }

    if (key === "showAll") {
      console.log(`📋 Settings: showAll cambiado a ${value}`);
      toast.success(`Mostrar todas las ubicaciones: ${value ? "Activado" : "Desactivado"}`);
    }
  };

  const handleLocationPreferenceSet = (lat: number, lng: number, name: string) => {
    toast.success(`Ubicación preferida establecida: ${name}`);
    toast.info(`Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  };

  const exportData = async () => {
    setIsExporting(true);
    try {
      const locations = localStorage.getItem("car-locations");
      const preferences = localStorage.getItem("user-preferences");
      const locationPrefs = localStorage.getItem("user-preferred-default-location");
      const lastKnownLocation = localStorage.getItem("user-last-known-location");

      if (!locations) {
        toast.error("No hay datos para exportar");
        return;
      }

      const exportData = {
        locations: JSON.parse(locations),
        preferences: preferences ? JSON.parse(preferences) : {},
        locationPreferences: locationPrefs ? JSON.parse(locationPrefs) : null,
        lastKnownLocation: lastKnownLocation ? JSON.parse(lastKnownLocation) : null,
        exportDate: new Date().toISOString(),
        version: "2.0",
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `car-locations-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Datos exportados correctamente");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Error al exportar los datos");
    } finally {
      setIsExporting(false);
    }
  };

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.locations && !Array.isArray(data)) {
        throw new Error("Formato de archivo inválido");
      }

      const locations = data.locations || data;
      const importedPreferences = data.preferences || {};

      // Guardar ubicaciones
      localStorage.setItem("car-locations", JSON.stringify(locations));

      // Importar preferencias si existen
      if (Object.keys(importedPreferences).length > 0) {
        const currentPrefs = getUserPreferences();
        const mergedPrefs = { ...currentPrefs, ...importedPreferences };
        saveUserPreferences(mergedPrefs);
        setPreferences(mergedPrefs);
        onPreferencesChange(mergedPrefs);

        if (importedPreferences.theme) {
          setTheme(importedPreferences.theme);
        }
      }

      // Importar ubicación preferida si existe
      if (data.locationPreferences) {
        localStorage.setItem("user-preferred-default-location", JSON.stringify(data.locationPreferences));
      }

      // Importar última ubicación conocida si existe
      if (data.lastKnownLocation) {
        localStorage.setItem("user-last-known-location", JSON.stringify(data.lastKnownLocation));
      }

      // 🔥 NUEVO: Toast mejorado con auto-reload
      toast.success(`🎉 Importación completada exitosamente`, {
        description: `Se importaron ${locations.length} ubicaciones. La página se recargará automáticamente.`,
        duration: 6000,
        action: {
          label: "Recargar ahora",
          onClick: () => window.location.reload(),
        },
      });

      // Limpiar el input file
      event.target.value = "";

      // 🔥 NUEVO: Auto-reload después de 2.5 segundos
      setTimeout(() => {
        console.log("🔄 Auto-recargando página después de importación...");
        window.location.reload();
      }, 2500);
    } catch (error) {
      console.error("Error importing data:", error);
      toast.error("Error al importar el archivo. Verifica que sea un archivo válido.");

      // Limpiar el input file incluso si hay error
      event.target.value = "";
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteAllClick = () => {
    const locationCount = JSON.parse(localStorage.getItem("car-locations") || "[]").length;

    if (locationCount === 0) {
      toast.error("No hay datos para eliminar");
      return;
    }

    setDeleteAllDialog({
      isOpen: true,
      isDeleting: false,
      locationCount,
    });
  };

  const handleConfirmDeleteAll = async () => {
    try {
      setDeleteAllDialog((prev) => ({ ...prev, isDeleting: true }));
      await new Promise((resolve) => setTimeout(resolve, 1500));
      localStorage.removeItem("car-locations");
      localStorage.removeItem("user-last-known-location");
      localStorage.removeItem("user-preferred-default-location");
      localStorage.removeItem("user-preferences");

      toast.success("🗑️ Todos los datos eliminados correctamente", {
        description: `Se eliminaron ${deleteAllDialog.locationCount} ubicaciones y toda la configuración.`,
        duration: 8000,
        action: {
          label: "Recargar",
          onClick: () => window.location.reload(),
        },
      });

      setDeleteAllDialog({
        isOpen: false,
        isDeleting: false,
        locationCount: 0,
      });

      // 🔥 NUEVO: Auto-reload después de 3 segundos
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error("Error deleting data:", error);
      toast.error("Error al eliminar los datos. Inténtalo de nuevo.");
      setDeleteAllDialog((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const handleResetClick = () => {
    setResetDialog({
      isOpen: true,
      isResetting: false,
    });
  };

  const handleConfirmReset = async () => {
    try {
      setResetDialog((prev) => ({ ...prev, isResetting: true }));
      await new Promise((resolve) => setTimeout(resolve, 800));

      localStorage.removeItem("user-preferences");
      localStorage.removeItem("user-preferred-default-location");

      const defaultPrefs = getUserPreferences();
      setPreferences(defaultPrefs);
      onPreferencesChange(defaultPrefs);
      setTheme(defaultPrefs.theme);

      toast.success("Configuración restablecida a valores por defecto");

      setResetDialog({
        isOpen: false,
        isResetting: false,
      });
    } catch (error) {
      console.error("Error resetting settings:", error);
      setResetDialog((prev) => ({ ...prev, isResetting: false }));
    }
  };

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case "light":
        return <Sun className="h-4 w-4" />;
      case "dark":
        return <Moon className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getMapTypeIcon = (mapType: string) => {
    switch (mapType) {
      case "satellite":
        return <Satellite className="h-4 w-4" />;
      case "terrain":
        return <Mountain className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getDataStats = () => {
    const locations = JSON.parse(localStorage.getItem("car-locations") || "[]");
    const dataSize = new Blob([JSON.stringify(locations)]).size;
    return {
      count: locations.length,
      size: dataSize < 1024 ? `${dataSize} B` : `${(dataSize / 1024).toFixed(1)} KB`,
    };
  };

  const getStorageDetails = () => {
    const locations = JSON.parse(localStorage.getItem("car-locations") || "[]");
    const photosCount = locations.reduce((acc: number, loc: any) => acc + (loc.photos?.length || 0), 0);
    const timersCount = locations.filter((loc: any) => loc.expiryTime).length;

    return {
      locations: locations.length,
      photos: photosCount,
      timers: timersCount,
    };
  };

  const getLocationInfo = () => {
    const preferredLocation = LocationManager.getUserPreferredLocation();
    const lastKnownLocation = LocationManager.getLastKnownLocation();
    const locationSourceInfo = LocationManager.getLocationSourceInfo();

    return {
      preferredLocation,
      lastKnownLocation,
      locationSourceInfo,
    };
  };

  const stats = getDataStats();
  const storageDetails = getStorageDetails();
  const locationInfo = getLocationInfo();

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col max-h-screen">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="text-2xl flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" />
            Configuración
          </SheetTitle>
          <SheetDescription>Personaliza la apariencia y el comportamiento de la aplicación.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Ubicación */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Ubicación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Información actual */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Estado actual:</div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {locationInfo.locationSourceInfo.hasPreferred && (
                    <div className="flex items-center gap-2">
                      <Target className="h-3 w-3 text-green-500" />
                      <span>Ubicación preferida configurada</span>
                    </div>
                  )}
                  {locationInfo.locationSourceInfo.hasRecent && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-blue-500" />
                      <span>Ubicación reciente disponible</span>
                    </div>
                  )}
                  {locationInfo.locationSourceInfo.hasSaved && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-purple-500" />
                      <span>Ubicaciones guardadas disponibles</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Configuración de ubicación preferida */}
              <LocationPreferenceSettings onPreferenceSet={handleLocationPreferenceSet} />
            </CardContent>
          </Card>

          {/* Sección de Apariencia */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Apariencia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="theme" className="flex items-center gap-2">
                  {getThemeIcon(preferences.theme)}
                  Tema
                </Label>
                <Select
                  value={preferences.theme}
                  onValueChange={(value: "light" | "dark" | "system") => handleChange("theme", value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Claro
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Oscuro
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        Sistema
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Resto de las secciones existentes... */}
          {/* Sección de Mapa */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Map className="h-5 w-5" />
                Mapas
              </CardTitle>
              <p className="text-sm text-muted-foreground">Configura el tipo de vista para cada mapa</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mapa para guardar nueva ubicación */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded">
                    <MapPin className="h-3 w-3 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Mapa para guardar</Label>
                    <p className="text-xs text-muted-foreground">Para marcar nuevas ubicaciones</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="saveMapType" className="flex items-center gap-2 text-sm">
                    {getMapTypeIcon(preferences.saveMapType)}
                    Tipo de vista
                  </Label>
                  <Select value={preferences.saveMapType} onValueChange={(value) => handleChange("saveMapType", value)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      <SelectItem value="osm">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Estándar
                        </div>
                      </SelectItem>
                      <SelectItem value="satellite">
                        <div className="flex items-center gap-2">
                          <Satellite className="h-4 w-4" />
                          Satélite
                        </div>
                      </SelectItem>
                      <SelectItem value="terrain">
                        <div className="flex items-center gap-2">
                          <Mountain className="h-4 w-4" />
                          Terreno
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Mapa de ubicaciones guardadas */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                    <Eye className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Mapa de ubicaciones</Label>
                    <p className="text-xs text-muted-foreground">Para ver tus ubicaciones guardadas</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="mapType" className="flex items-center gap-2 text-sm">
                    {getMapTypeIcon(preferences.mapType)}
                    Tipo de vista
                  </Label>
                  <Select value={preferences.mapType} onValueChange={(value) => handleChange("mapType", value)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      <SelectItem value="osm">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Estándar
                        </div>
                      </SelectItem>
                      <SelectItem value="satellite">
                        <div className="flex items-center gap-2">
                          <Satellite className="h-4 w-4" />
                          Satélite
                        </div>
                      </SelectItem>
                      <SelectItem value="terrain">
                        <div className="flex items-center gap-2">
                          <Mountain className="h-4 w-4" />
                          Terreno
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Recomendaciones */}
              <Alert>
                <SettingsIcon className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Recomendación:</strong> Usa vista satélite para reconocer lugares y vista estándar para calles
                  y direcciones.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Sección de Listado */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <List className="h-5 w-5" />
                Listado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="sortBy">Ordenar por defecto</Label>
                <Select
                  value={preferences.sortBy}
                  onValueChange={(value: "date" | "note") => handleChange("sortBy", value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="date">Fecha</SelectItem>
                    <SelectItem value="note">Nota</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="showAll" className="text-sm">
                  Mostrar todas las ubicaciones por defecto
                </Label>
                <Switch
                  id="showAll"
                  checked={preferences.showAll}
                  onCheckedChange={(checked) => handleChange("showAll", checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sección de Funcionalidades */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Funcionalidades
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="autoSave" className="text-sm">
                  Guardado automático
                </Label>
                <Switch
                  id="autoSave"
                  checked={preferences.autoSave}
                  onCheckedChange={(checked) => handleChange("autoSave", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications" className="text-sm">
                  Activar notificaciones
                </Label>
                <Switch
                  id="notifications"
                  checked={preferences.notifications}
                  onCheckedChange={(checked) => handleChange("notifications", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="reminderMinutes">Recordatorio por defecto</Label>
                <Select
                  value={String(preferences.defaultReminderMinutes)}
                  onValueChange={(value) => handleChange("defaultReminderMinutes", parseInt(value))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="5">5 min</SelectItem>
                    <SelectItem value="10">10 min</SelectItem>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Sección de Fotos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Fotos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="maxPhotos">Máximo de fotos por ubicación</Label>
                <Select
                  value={String(preferences.maxPhotos)}
                  onValueChange={(value) => handleChange("maxPhotos", parseInt(value))}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="1">1 foto</SelectItem>
                    <SelectItem value="2">2 fotos</SelectItem>
                    <SelectItem value="3">3 fotos</SelectItem>
                    <SelectItem value="5">5 fotos</SelectItem>
                    <SelectItem value="10">10 fotos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="photoQuality">Calidad de las fotos</Label>
                <Select
                  value={preferences.photoQuality}
                  onValueChange={(value: "low" | "medium" | "high") => handleChange("photoQuality", value)}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Sección de Gestión de Datos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Gestión de Datos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{stats.count}</div>
                  <div className="text-xs text-muted-foreground">Ubicaciones</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{stats.size}</div>
                  <div className="text-xs text-muted-foreground">Tamaño</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={exportData}
                  disabled={isExporting || stats.count === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? "Exportando..." : "Exportar Datos"}
                </Button>

                <Button asChild variant="outline" className="w-full justify-start">
                  <Label className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    {isImporting ? "Importando..." : "Importar Datos"}
                    <Input type="file" accept=".json" onChange={importData} className="hidden" disabled={isImporting} />
                  </Label>
                </Button>

                <Separator />

                <Button variant="outline" className="w-full justify-start" onClick={handleResetClick}>
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  Restablecer Configuración
                </Button>

                <Button
                  variant="destructive"
                  className="w-full justify-start"
                  onClick={handleDeleteAllClick}
                  disabled={stats.count === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Todos los Datos
                </Button>
              </div>

              {stats.count === 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>No hay ubicaciones guardadas para exportar o eliminar.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Información de la aplicación */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-sm text-muted-foreground space-y-2">
                <p>🚗 Aparky</p>
                <p>Versión 2.0 - Creado con ❤️ por David Rovira</p>
                <div className="flex justify-center gap-2">
                  <Badge variant="secondary">React</Badge>
                  <Badge variant="secondary">TypeScript</Badge>
                  <Badge variant="secondary">Tailwind</Badge>
                  <Badge variant="secondary">shadcn/ui</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <SheetFooter className="px-6 py-4 border-t">
          <Button onClick={onClose} className="w-full">
            <CheckCircle className="h-4 w-4 mr-2" />
            Guardar y Cerrar
          </Button>
        </SheetFooter>
      </SheetContent>

      <ResetConfirmationDialog
        isOpen={resetDialog.isOpen}
        onClose={() => setResetDialog({ isOpen: false, isResetting: false })}
        onConfirm={handleConfirmReset}
        loading={resetDialog.isResetting}
        disabled={resetDialog.isResetting}
        size="lg" // 🔥 AÑADIR: Tamaño más grande
      >
        {/* 🔥 NUEVO: Contenedor con scroll */}
        <div className="max-h-[60vh] overflow-y-auto pr-2">
          <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-yellow-800 dark:text-yellow-200">
              <SettingsIcon className="w-4 h-4" />
              Configuraciones que se restablecerán:
            </div>

            <div className="grid gap-3 text-sm text-yellow-700 dark:text-yellow-300">
              {/* SECCIÓN 1: APARIENCIA */}
              <div className="space-y-2">
                <div className="font-medium text-yellow-800 dark:text-yellow-200 text-xs uppercase tracking-wide">
                  Apariencia
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="w-3 h-3 shrink-0" />
                    <span className="truncate">Tema</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-medium">
                      {preferences.theme === "light" ? "Claro" : preferences.theme === "dark" ? "Oscuro" : "Sistema"}
                    </span>
                    <span className="mx-2">→</span>
                    <span className="text-yellow-600 dark:text-yellow-400">Sistema</span>
                  </div>
                </div>
              </div>

              <Separator className="border-yellow-200 dark:border-yellow-800" />

              {/* SECCIÓN 2: MAPAS */}
              <div className="space-y-2">
                <div className="font-medium text-yellow-800 dark:text-yellow-200 text-xs uppercase tracking-wide">
                  Mapas
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Eye className="w-3 h-3 shrink-0" />
                    <span className="truncate">Ubicaciones</span>
                  </div>
                  <div className="text-right shrink-0 text-xs">
                    <span className="font-medium">
                      {preferences.mapType === "osm"
                        ? "Estándar"
                        : preferences.mapType === "satellite"
                        ? "Satélite"
                        : "Terreno"}
                    </span>
                    <span className="mx-1">→</span>
                    <span className="text-yellow-600 dark:text-yellow-400">Estándar</span>
                  </div>
                </div>

                {/* Incluir saveMapType si existe */}
                {preferences.saveMapType && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">Guardar</span>
                    </div>
                    <div className="text-right shrink-0 text-xs">
                      <span className="font-medium">
                        {preferences.saveMapType === "osm"
                          ? "Estándar"
                          : preferences.saveMapType === "satellite"
                          ? "Satélite"
                          : "Terreno"}
                      </span>
                      <span className="mx-1">→</span>
                      <span className="text-yellow-600 dark:text-yellow-400">Estándar</span>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="border-yellow-200 dark:border-yellow-800" />

              {/* SECCIÓN 3: LISTADO */}
              <div className="space-y-2">
                <div className="font-medium text-yellow-800 dark:text-yellow-200 text-xs uppercase tracking-wide">
                  Listado
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <List className="w-3 h-3 shrink-0" />
                    <span className="truncate">Ordenar por</span>
                  </div>
                  <div className="text-right shrink-0 text-xs">
                    <span className="font-medium">{preferences.sortBy === "date" ? "Fecha" : "Nota"}</span>
                    <span className="mx-1">→</span>
                    <span className="text-yellow-600 dark:text-yellow-400">Fecha</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Eye className="w-3 h-3 shrink-0" />
                    <span className="truncate">Mostrar todas</span>
                  </div>
                  <div className="text-right shrink-0 text-xs">
                    <span className="font-medium">{preferences.showAll ? "Sí" : "No"}</span>
                    <span className="mx-1">→</span>
                    <span className="text-yellow-600 dark:text-yellow-400">No</span>
                  </div>
                </div>
              </div>

              <Separator className="border-yellow-200 dark:border-yellow-800" />

              {/* SECCIÓN 4: FUNCIONALIDADES */}
              <div className="space-y-2">
                <div className="font-medium text-yellow-800 dark:text-yellow-200 text-xs uppercase tracking-wide">
                  Funcionalidades
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Zap className="w-3 h-3 shrink-0" />
                    <span className="truncate">Auto-guardado</span>
                  </div>
                  <div className="text-right shrink-0 text-xs">
                    <span className="font-medium">{preferences.autoSave ? "Sí" : "No"}</span>
                    <span className="mx-1">→</span>
                    <span className="text-yellow-600 dark:text-yellow-400">No</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Bell className="w-3 h-3 shrink-0" />
                    <span className="truncate">Notificaciones</span>
                  </div>
                  <div className="text-right shrink-0 text-xs">
                    <span className="font-medium">{preferences.notifications ? "Sí" : "No"}</span>
                    <span className="mx-1">→</span>
                    <span className="text-yellow-600 dark:text-yellow-400">Sí</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span className="truncate">Recordatorio</span>
                  </div>
                  <div className="text-right shrink-0 text-xs">
                    <span className="font-medium">{preferences.defaultReminderMinutes}min</span>
                    <span className="mx-1">→</span>
                    <span className="text-yellow-600 dark:text-yellow-400">15min</span>
                  </div>
                </div>
              </div>

              <Separator className="border-yellow-200 dark:border-yellow-800" />

              {/* SECCIÓN 5: FOTOS */}
              <div className="space-y-2">
                <div className="font-medium text-yellow-800 dark:text-yellow-200 text-xs uppercase tracking-wide">
                  Fotos
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Camera className="w-3 h-3 shrink-0" />
                    <span className="truncate">Máximo</span>
                  </div>
                  <div className="text-right shrink-0 text-xs">
                    <span className="font-medium">{preferences.maxPhotos}</span>
                    <span className="mx-1">→</span>
                    <span className="text-yellow-600 dark:text-yellow-400">3</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Camera className="w-3 h-3 shrink-0" />
                    <span className="truncate">Calidad</span>
                  </div>
                  <div className="text-right shrink-0 text-xs">
                    <span className="font-medium">
                      {preferences.photoQuality === "low"
                        ? "Baja"
                        : preferences.photoQuality === "medium"
                        ? "Media"
                        : "Alta"}
                    </span>
                    <span className="mx-1">→</span>
                    <span className="text-yellow-600 dark:text-yellow-400">Media</span>
                  </div>
                </div>
              </div>

              <Separator className="border-yellow-200 dark:border-yellow-800" />

              {/* SECCIÓN 6: UBICACIÓN PREFERIDA */}
              <div className="space-y-2">
                <div className="font-medium text-yellow-800 dark:text-yellow-200 text-xs uppercase tracking-wide">
                  Ubicación
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Navigation className="w-3 h-3 shrink-0" />
                    <span className="truncate">Preferida</span>
                  </div>
                  <div className="text-right shrink-0 text-xs">
                    <span className="font-medium truncate max-w-20">
                      {locationInfo.preferredLocation?.name || "Ninguna"}
                    </span>
                    <span className="mx-1">→</span>
                    <span className="text-yellow-600 dark:text-yellow-400">Ninguna</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ADVERTENCIA FINAL - FUERA DEL SCROLL */}
        <div className="pt-3">
          <Alert className="border-yellow-300 bg-yellow-100/50 dark:bg-yellow-900/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs font-medium">
              ⚠️ Solo se resetea la configuración, no las ubicaciones guardadas.
            </AlertDescription>
          </Alert>
        </div>
      </ResetConfirmationDialog>

      {/* Dialog de confirmación para eliminar todos los datos */}
      <ConfirmationDialog
        isOpen={deleteAllDialog.isOpen}
        onClose={() => setDeleteAllDialog({ isOpen: false, isDeleting: false, locationCount: 0 })}
        onConfirm={handleConfirmDeleteAll}
        variant="destructive"
        title="⚠️ ¿ELIMINAR TODOS LOS DATOS?"
        description="Esta acción eliminará PERMANENTEMENTE toda tu información. NO se puede deshacer."
        confirmText="SÍ, ELIMINAR TODO"
        loading={deleteAllDialog.isDeleting}
        disabled={deleteAllDialog.isDeleting}
        size="lg"
      >
        {/* 🔥 NUEVO: Contenedor con scroll para móviles */}
        <div className="max-h-[50vh] overflow-y-auto pr-2">
          <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-red-800 dark:text-red-200">
              <AlertTriangle className="w-4 h-4" />
              Se eliminarán PERMANENTEMENTE:
            </div>

            <div className="grid gap-3 text-sm">
              {/* Ubicaciones guardadas */}
              <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <div className="font-medium text-red-700 dark:text-red-300">Ubicaciones guardadas</div>
                    <div className="text-xs text-red-600 dark:text-red-400">Todas tus ubicaciones de parking</div>
                  </div>
                </div>
                <Badge variant="destructive" className="text-lg font-bold px-3 py-1">
                  {storageDetails.locations}
                </Badge>
              </div>

              {/* Timers de parking */}
              <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <div className="font-medium text-red-700 dark:text-red-300">Timers de parking</div>
                    <div className="text-xs text-red-600 dark:text-red-400">Temporizadores activos</div>
                  </div>
                </div>
                <Badge variant="destructive" className="text-lg font-bold px-3 py-1">
                  {storageDetails.timers}
                </Badge>
              </div>

              {/* Fotos almacenadas */}
              <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <Camera className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <div className="font-medium text-red-700 dark:text-red-300">Fotos almacenadas</div>
                    <div className="text-xs text-red-600 dark:text-red-400">Imágenes de referencia</div>
                  </div>
                </div>
                <Badge variant="destructive" className="text-lg font-bold px-3 py-1">
                  {storageDetails.photos}
                </Badge>
              </div>

              {/* 🔥 NUEVO: Configuración de la aplicación */}
              <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <SettingsIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <div className="font-medium text-red-700 dark:text-red-300">Configuración personal</div>
                    <div className="text-xs text-red-600 dark:text-red-400">Tema, preferencias, mapas</div>
                  </div>
                </div>
                <Badge variant="destructive" className="text-lg font-bold px-3 py-1">
                  ✓
                </Badge>
              </div>

              {/* Ubicación preferida */}
              <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <Navigation className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <div className="font-medium text-red-700 dark:text-red-300">Ubicación preferida</div>
                    <div className="text-xs text-red-600 dark:text-red-400">
                      {locationInfo.preferredLocation?.name || "No configurada"}
                    </div>
                  </div>
                </div>
                <Badge variant="destructive" className="text-lg font-bold px-3 py-1">
                  {locationInfo.preferredLocation ? "1" : "0"}
                </Badge>
              </div>

              {/* 🔥 NUEVO: Información de tamaño total */}
              <div className="flex items-center justify-between p-3 bg-red-100 dark:bg-red-900/40 rounded-lg border-2 border-red-300 dark:border-red-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-200 dark:bg-red-800 rounded-full flex items-center justify-center">
                    <FileText className="w-4 h-4 text-red-700 dark:text-red-300" />
                  </div>
                  <div>
                    <div className="font-bold text-red-800 dark:text-red-200">Tamaño total de datos</div>
                    <div className="text-xs text-red-700 dark:text-red-300">Espacio que se liberará</div>
                  </div>
                </div>
                <Badge variant="destructive" className="text-lg font-bold px-3 py-1">
                  {stats.size}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* 🔥 MEJORADO: Advertencias más específicas */}
        <div className="space-y-3">
          <Alert className="border-red-300 bg-red-100/50 dark:bg-red-900/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm font-medium">
              <div className="space-y-2">
                <p className="text-red-800 dark:text-red-200">
                  🚨 <strong>ATENCIÓN:</strong> Esta acción es IRREVERSIBLE
                </p>
                <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
                  <li>• No podrás recuperar ninguna ubicación</li>
                  <li>• Se perderán todas las fotos</li>
                  <li>• Los timers activos se cancelarán</li>
                  <li>• Tu configuración se restablecerá</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* 🔥 NUEVO: Recomendación de exportar */}
          {storageDetails.locations > 0 && (
            <Alert className="border-blue-300 bg-blue-50 dark:bg-blue-950/20">
              <Download className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  💡 <strong>Recomendación:</strong> Exporta tus datos primero
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Ve a "Exportar Datos" para guardar un respaldo antes de eliminar todo.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* 🔥 NUEVO: Confirmación adicional si hay muchos datos */}
          {storageDetails.locations > 10 && (
            <Alert className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm font-medium text-orange-800 dark:text-orange-200">
                ⚠️ Tienes <strong>{storageDetails.locations} ubicaciones</strong> guardadas. ¿Estás completamente
                seguro?
              </AlertDescription>
            </Alert>
          )}
        </div>
      </ConfirmationDialog>
    </Sheet>
  );
};

export default Settings;
