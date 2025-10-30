// src/components/OfflineMapManager.tsx
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Progress,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/ui";
import { Download, Trash2, Map, Globe, MapPin, HardDrive, AlertTriangle, X, Check } from "lucide-react";
import { offlineMapManager, PREDEFINED_AREAS, type MapArea } from "@/utils/offlineMaps";
import { toast } from "sonner";

export const OfflineMapManager: React.FC = () => {
  const [downloadedAreas, setDownloadedAreas] = useState<MapArea[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [currentDownload, setCurrentDownload] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentTile, setCurrentTile] = useState(0);
  const [totalTiles, setTotalTiles] = useState(0);
  const [storage, setStorage] = useState({ used: 0, available: 0, percentage: 0 });
  const [selectedCountry, setSelectedCountry] = useState<string>("spain");
  const [provider, setProvider] = useState<"osm" | "satellite" | "terrain">("osm");
  const [activeTab, setActiveTab] = useState<string>("download");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await loadAreas();
    await loadStorage();
  };

  const loadAreas = async () => {
    const areas = await offlineMapManager.getDownloadedAreas();
    setDownloadedAreas(areas);
  };

  const loadStorage = async () => {
    const usage = await offlineMapManager.getStorageUsage();
    setStorage(usage);
  };

  const handleDownload = async (area: MapArea) => {
    setDownloading(true);
    setCurrentDownload(area.id);
    setProgress(0);
    setCurrentTile(0);
    setTotalTiles(0);

    // Crear copia del área con el proveedor seleccionado
    const areaToDownload: MapArea = {
      ...area,
      provider,
      id: `${area.id}-${provider}`, // ID único por proveedor
    };

    try {
      await offlineMapManager.downloadArea(areaToDownload, (prog, current, total) => {
        setProgress(prog);
        setCurrentTile(current);
        setTotalTiles(total);
      });
      await loadData();
    } catch (error) {
      if (error instanceof Error && error.message !== "Download cancelled") {
        toast.error("Error al descargar el mapa");
      }
    } finally {
      setDownloading(false);
      setCurrentDownload(null);
      setProgress(0);
    }
  };

  const handleCancelDownload = () => {
    offlineMapManager.cancelDownload();
    setDownloading(false);
    setCurrentDownload(null);
  };

  const handleDelete = async (areaId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este mapa?")) {
      return;
    }

    try {
      await offlineMapManager.deleteArea(areaId);
      await loadData();
      toast.success("Área eliminada correctamente");
    } catch (error) {
      toast.error("Error al eliminar el área");
    }
  };

  const handleClearAll = async () => {
    if (!confirm("¿Estás seguro de que quieres eliminar TODOS los mapas descargados?")) {
      return;
    }

    try {
      await offlineMapManager.clearAllMaps();
      await loadData();
    } catch (error) {
      toast.error("Error al eliminar los mapas");
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getProviderName = (prov: string): string => {
    switch (prov) {
      case "osm":
        return "Estándar";
      case "satellite":
        return "Satélite";
      case "terrain":
        return "Terreno";
      default:
        return prov;
    }
  };

  const getCountryName = (countryCode: string): string => {
    const names: Record<string, string> = {
      spain: "🇪🇸 España",
      france: "🇫🇷 Francia",
      portugal: "🇵🇹 Portugal",
      italy: "🇮🇹 Italia",
      germany: "🇩🇪 Alemania",
      uk: "🇬🇧 Reino Unido",
    };
    return names[countryCode] || countryCode;
  };

  const isAreaDownloaded = (areaId: string): boolean => {
    return downloadedAreas.some((a) => a.id === `${areaId}-${provider}`);
  };

  const currentAreas = PREDEFINED_AREAS[selectedCountry] || [];
  const countries = currentAreas.filter((a) => a.type === "country");
  const regions = currentAreas.filter((a) => a.type === "region");
  const cities = currentAreas.filter((a) => a.type === "city");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5" />
          Mapas Offline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selector de proveedor de mapas */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo de mapa</label>
          <Select value={provider} onValueChange={(v: any) => setProvider(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="osm">🗺️ Estándar (OpenStreetMap)</SelectItem>
              <SelectItem value="satellite">🛰️ Satélite</SelectItem>
              <SelectItem value="terrain">⛰️ Terreno</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Información de almacenamiento */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              <span className="font-medium">Almacenamiento</span>
            </div>
            <span className="text-muted-foreground">
              {formatBytes(storage.used)} / {formatBytes(storage.available)}
            </span>
          </div>
          <Progress value={storage.percentage} />
          <p className="text-xs text-muted-foreground">{storage.percentage.toFixed(1)}% usado</p>
        </div>

        {/* Descarga en progreso */}
        {downloading && (
          <Alert>
            <Download className="h-4 w-4 animate-bounce" />
            <AlertDescription className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Descargando... {Math.round(progress)}%</span>
                <Button size="sm" variant="ghost" onClick={handleCancelDownload}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">
                {currentTile.toLocaleString()} / {totalTiles.toLocaleString()} tiles
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs de descargar/descargados */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="download">
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </TabsTrigger>
            <TabsTrigger value="downloaded">
              <Check className="h-4 w-4 mr-2" />
              Descargados ({downloadedAreas.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="download" className="space-y-4 mt-4">
            {/* Selector de país */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Selecciona un país</label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(PREDEFINED_AREAS).map((country) => (
                    <SelectItem key={country} value={country}>
                      {getCountryName(country)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Acordeón con todas las áreas */}
            <Accordion type="single" collapsible className="w-full">
              {/* País completo */}
              {countries.length > 0 && (
                <AccordionItem value="country">
                  <AccordionTrigger className="text-sm font-semibold">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      País Completo
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    {countries.map((area) => (
                      <AreaCard
                        key={area.id}
                        area={area}
                        isDownloaded={isAreaDownloaded(area.id)}
                        isDownloading={downloading && currentDownload === area.id}
                        onDownload={handleDownload}
                      />
                    ))}
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Regiones */}
              {regions.length > 0 && (
                <AccordionItem value="regions">
                  <AccordionTrigger className="text-sm font-semibold">
                    <div className="flex items-center gap-2">
                      <Map className="h-4 w-4" />
                      Regiones ({regions.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    {regions.map((area) => (
                      <AreaCard
                        key={area.id}
                        area={area}
                        isDownloaded={isAreaDownloaded(area.id)}
                        isDownloading={downloading && currentDownload === area.id}
                        onDownload={handleDownload}
                      />
                    ))}
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Ciudades */}
              {cities.length > 0 && (
                <AccordionItem value="cities">
                  <AccordionTrigger className="text-sm font-semibold">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Ciudades ({cities.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    {cities.map((area) => (
                      <AreaCard
                        key={area.id}
                        area={area}
                        isDownloaded={isAreaDownloaded(area.id)}
                        isDownloading={downloading && currentDownload === area.id}
                        onDownload={handleDownload}
                      />
                    ))}
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>

            {/* Advertencia de almacenamiento */}
            {storage.percentage > 80 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Estás usando {storage.percentage.toFixed(0)}% del almacenamiento. Considera eliminar mapas antiguos.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="downloaded" className="space-y-4 mt-4">
            {downloadedAreas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Map className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No hay mapas descargados</p>
                <p className="text-xs">Descarga un mapa para usarlo sin conexión</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {downloadedAreas.map((area) => (
                    <div
                      key={area.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">{area.name}</p>
                          <Badge variant="secondary" className="text-xs">
                            {getProviderName(area.provider)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{area.tileCount?.toLocaleString()} tiles</span>
                          <span>•</span>
                          <span>{new Date(area.downloadedAt!).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(area.id)} className="shrink-0">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button variant="outline" onClick={handleClearAll} className="w-full" disabled={downloading}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar todos los mapas
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Componente auxiliar para cada área
const AreaCard: React.FC<{
  area: MapArea;
  isDownloaded: boolean;
  isDownloading: boolean;
  onDownload: (area: MapArea) => void;
}> = ({ area, isDownloaded, isDownloading, onDownload }) => {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0 mr-3">
        <p className="font-medium text-sm truncate">{area.name}</p>
        <p className="text-xs text-muted-foreground">Tamaño estimado: {area.estimatedSize}</p>
      </div>
      <Button
        size="sm"
        onClick={() => onDownload(area)}
        disabled={isDownloaded || isDownloading}
        variant={isDownloaded ? "outline" : "default"}
      >
        {isDownloaded ? (
          <>
            <Check className="h-4 w-4 mr-1" />
            Descargado
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-1" />
            Descargar
          </>
        )}
      </Button>
    </div>
  );
};
