// src/features/location/components/SavedLocations/SavedLocations.tsx - CON EDICIÓN
import React, { useState, useMemo, useEffect, useCallback } from "react";
import type { CarLocation, DateFilter } from "@/types/location";
import { deleteCarLocation, updateCarLocation } from "@/utils/storage";
import { filterLocationsByDate } from "@/utils/stats";
import { copyToClipboard } from "@/utils/helpers";
import { timerManager } from "@/utils/timerManager";
import SearchFilter from "./SearchFilter";
import EditLocationDialog from "./EditLocationDialog";
import { LocationDeleteDialog } from "@/shared/components/ConfirmationDialog/ConfirmationDialog";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@/shared/ui";
import { toast } from "sonner";
import {
  MapPin,
  Trash2,
  Share2,
  Navigation,
  Eye,
  Euro,
  Plus,
  X,
  Building,
  ParkingSquare,
  Car,
  Map as MapIcon,
  Star,
  AlertTriangle,
  Clock,
  Camera,
  ChevronLeft,
  ChevronRight,
  Target,
  Edit, // ← NUEVO IMPORT
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SavedLocationsProps {
  locations: CarLocation[];
  onLocationDeleted: (id: string) => void;
  onLocationSelected: (location: CarLocation) => void;
  onNavigateToLocation?: (location: CarLocation) => void;
  sortBy: "date" | "note";
  showAll: boolean;
  onSortChange: (sortBy: "date" | "note") => void;
  onShowAllChange: (showAll: boolean) => void;
  onTimerExtend: (locationId: string, minutes: number) => void;
  onTimerCancel: (locationId: string) => void;
  onLocationUpdated?: (locationId: string, updates: Partial<CarLocation>) => void; // ← NUEVO PROP
}

// 🚀 OPTIMIZACIÓN 1: Componente de galería de fotos mejorado
const PhotoGallery = React.memo<{
  photos: string[];
  locationNote?: string;
}>(({ photos, locationNote }) => {
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

  if (!photos || photos.length === 0) return null;

  const openPhotoModal = (index: number) => {
    setSelectedPhoto(index);
  };

  const closePhotoModal = () => {
    setSelectedPhoto(null);
  };

  const nextPhoto = () => {
    if (selectedPhoto !== null && selectedPhoto < photos.length - 1) {
      setSelectedPhoto(selectedPhoto + 1);
    }
  };

  const prevPhoto = () => {
    if (selectedPhoto !== null && selectedPhoto > 0) {
      setSelectedPhoto(selectedPhoto - 1);
    }
  };

  // Modal con foto ampliada
  const PhotoModal = () => {
    if (selectedPhoto === null) return null;

    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={closePhotoModal}>
        <div className="relative max-w-4xl max-h-full">
          {/* Botón cerrar */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 bg-black/50 text-white hover:bg-black/70"
            onClick={closePhotoModal}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Navegación anterior */}
          {selectedPhoto > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white hover:bg-black/70"
              onClick={(e) => {
                e.stopPropagation();
                prevPhoto();
              }}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          {/* Navegación siguiente */}
          {selectedPhoto < photos.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white hover:bg-black/70"
              onClick={(e) => {
                e.stopPropagation();
                nextPhoto();
              }}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}

          {/* Imagen principal */}
          <img
            src={photos[selectedPhoto]}
            alt={`${locationNote ? `Foto de ${locationNote}` : "Foto"} ${selectedPhoto + 1}`}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Contador de fotos */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {selectedPhoto + 1} de {photos.length}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {photos.slice(0, 4).map((photo, i) => (
          <div key={i} className="relative">
            <img
              src={photo}
              alt={`Foto ${i + 1}`}
              className="rounded-lg object-cover aspect-square cursor-pointer border hover:opacity-80 transition-opacity"
              onClick={() => openPhotoModal(i)}
              loading="lazy"
            />
            {/* Indicador si hay más fotos */}
            {i === 3 && photos.length > 4 && (
              <div
                className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center cursor-pointer"
                onClick={() => openPhotoModal(i)}
              >
                <span className="text-white font-semibold">+{photos.length - 4}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <PhotoModal />
    </>
  );
});

PhotoGallery.displayName = "PhotoGallery";

// 🚀 OPTIMIZACIÓN 2: Memoizar componente de tarjeta individual CON EDICIÓN
const LocationCard = React.memo<{
  location: CarLocation;
  isLatest: boolean;
  timerTimeLeft: string;
  onLocationDeleted: (location: CarLocation) => void;
  onLocationSelected: (location: CarLocation) => void;
  onNavigateToLocation?: (location: CarLocation) => void;
  onTimerExtend: (locationId: string, minutes: number) => void;
  onTimerCancel: (locationId: string) => void;
  onLocationUpdated?: (locationId: string, updates: Partial<CarLocation>) => void; // ← NUEVO
}>(
  ({
    location,
    isLatest,
    timerTimeLeft,
    onLocationDeleted,
    onLocationSelected,
    onNavigateToLocation,
    onTimerExtend,
    onTimerCancel,
    onLocationUpdated, // ← NUEVO
  }) => {
    // ← NUEVO: Estado para el dialog de edición
    const [showEditDialog, setShowEditDialog] = useState(false);

    // ← NUEVO: Handler para editar ubicación
    const handleEdit = useCallback(
      async (updates: Partial<CarLocation>) => {
        try {
          // Actualizar en storage
          updateCarLocation(location.id, updates);

          // Actualizar estado local
          onLocationUpdated?.(location.id, updates);

          // Actualizar timer si es necesario
          if (updates.expiryTime) {
            const updatedLocation = { ...location, ...updates };
            timerManager.scheduleTimer(updatedLocation);
          } else if (updates.expiryTime === undefined) {
            // Si se removió el timer
            timerManager.cancelTimer(location.id);
          }
        } catch (error) {
          throw error; // Propagar error para que EditLocationDialog lo maneje
        }
      },
      [location, onLocationUpdated]
    );

    // 🚀 OPTIMIZACIÓN 3: Memoizar cálculos pesados dentro de la card
    const timerStatus = useMemo(() => {
      if (!location.expiryTime) return "inactive";
      const now = Date.now();
      if (location.expiryTime < now) return "expired";
      if (location.reminderMinutes && location.expiryTime - now < location.reminderMinutes * 60 * 1000)
        return "warning";
      return "active";
    }, [location.expiryTime, location.reminderMinutes]);

    const formatRelativeTime = useCallback((timestamp: number): string => {
      const seconds = Math.floor((Date.now() - timestamp) / 1000);
      if (seconds < 60) return "hace unos segundos";
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `hace ${minutes} min`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `hace ${hours} h`;
      const days = Math.floor(hours / 24);
      return `hace ${days} días`;
    }, []);

    // NUEVO: Función para determinar el tipo de ubicación
    const getLocationTypeInfo = useCallback((location: CarLocation) => {
      if (location.isManualPlacement) {
        return {
          icon: <Target className="w-4 h-4 text-orange-500" />,
          label: "Marcada manualmente",
          description: "Ubicación aproximada",
          badgeVariant: "outline" as const,
          badgeColor:
            "text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-950 dark:border-orange-700 dark:text-orange-400",
        };
      }

      if (location.accuracy && location.accuracy <= 10) {
        return {
          icon: <MapPin className="w-4 h-4 text-green-500" />,
          label: "GPS preciso",
          description: `±${Math.round(location.accuracy)}m`,
          badgeVariant: "outline" as const,
          badgeColor:
            "text-green-600 border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-700 dark:text-green-400",
        };
      }

      return {
        icon: <Navigation className="w-4 h-4 text-blue-500" />,
        label: "GPS automático",
        description: location.accuracy ? `±${Math.round(location.accuracy)}m` : "Ubicación GPS",
        badgeVariant: "outline" as const,
        badgeColor: "text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-400",
      };
    }, []);

    const getParkingTypeIcon = useCallback((type?: string): React.ReactNode => {
      switch (type) {
        case "Garaje":
          return <Building className="w-4 h-4" />;
        case "Parking":
          return <ParkingSquare className="w-4 h-4" />;
        case "Otro":
          return <MapPin className="w-4 h-4" />;
        default:
          return <Car className="w-4 h-4" />;
      }
    }, []);

    const getParkingTypeName = useCallback((type?: string): string => {
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
    }, []);

    const openInMaps = useCallback((location: CarLocation) => {
      const query = location.address
        ? encodeURIComponent(location.address)
        : `${location.latitude},${location.longitude}`;
      window.open(`https://maps.google.com/?q=${query}`, "_blank", "noopener,noreferrer");
    }, []);

    const shareLocation = useCallback(async (location: CarLocation) => {
      const shareData = {
        title: "Ubicación de mi coche",
        text: `Mi coche está aparcado aquí. ${location.note ? `Nota: "${location.note}"` : ""}`,
        url: `https://maps.google.com/?q=${location.latitude},${location.longitude}`,
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
          toast.success("Ubicación compartida.");
        } catch (err) {
          console.log("Error al compartir:", err);
        }
      } else {
        copyToClipboard(shareData.url)
          .then(() => toast.success("Enlace copiado al portapapeles."))
          .catch(() => toast.error("No se pudo copiar el enlace."));
      }
    }, []);

    const handleDeleteClick = useCallback(() => {
      onLocationDeleted(location);
    }, [onLocationDeleted, location]);

    const handleLocationSelect = useCallback(() => {
      onLocationSelected(location);
    }, [onLocationSelected, location]);

    const handleNavigateClick = useCallback(() => {
      onNavigateToLocation?.(location);
    }, [onNavigateToLocation, location]);

    const handleOpenMaps = useCallback(() => {
      openInMaps(location);
    }, [openInMaps, location]);

    const handleShare = useCallback(() => {
      shareLocation(location);
    }, [shareLocation, location]);

    const handleTimerExtend30 = useCallback(() => {
      onTimerExtend(location.id, 30);
    }, [onTimerExtend, location.id]);

    const handleTimerExtend60 = useCallback(() => {
      onTimerExtend(location.id, 60);
    }, [onTimerExtend, location.id]);

    const handleTimerCancel = useCallback(() => {
      onTimerCancel(location.id);
    }, [onTimerCancel, location.id]);

    // ← NUEVO: Handler para abrir dialog de edición
    const handleEditClick = useCallback(() => {
      setShowEditDialog(true);
    }, []);

    // ← NUEVO: Handler para cerrar dialog de edición
    const handleCloseEditDialog = useCallback(() => {
      setShowEditDialog(false);
    }, []);

    // NUEVO: Obtener información del tipo de ubicación
    const locationTypeInfo = getLocationTypeInfo(location);

    return (
      <>
        <Card className={cn("transition-all", isLatest && "ring-2 ring-primary shadow-lg")}>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-3">
              <PhotoGallery photos={location.photos || []} locationNote={location.note} />

              {/* ← BOTONES ACTUALIZADOS CON EDITAR */}
              <div className="flex justify-around items-center bg-muted/50 p-1 rounded-md">
                {/* ← NUEVO: Botón de editar como PRIMERO */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleEditClick}
                  title="Editar ubicación"
                  className="hover:bg-primary/10"
                >
                  <Edit className="w-4 h-4" />
                </Button>

                <Button variant="ghost" size="icon" onClick={handleLocationSelect} title="Ver en mapa">
                  <Eye className="w-5 h-5" />
                </Button>

                {onNavigateToLocation && (
                  <Button variant="ghost" size="icon" onClick={handleNavigateClick} title="Navegar">
                    <Navigation className="w-5 h-5" />
                  </Button>
                )}

                <Button variant="ghost" size="icon" onClick={handleOpenMaps} title="Abrir en Google Maps">
                  <MapIcon className="w-5 h-5" />
                </Button>

                <Button variant="ghost" size="icon" onClick={handleShare} title="Compartir">
                  <Share2 className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDeleteClick}
                  title="Eliminar"
                  className="hover:bg-destructive/10"
                >
                  <Trash2 className="w-5 h-5 text-destructive" />
                </Button>
              </div>
            </div>

            <div className="md:col-span-2 space-y-3">
              {isLatest && (
                <Badge>
                  <Star className="w-3.5 h-3.5 mr-1.5" />
                  Ubicación más reciente
                </Badge>
              )}
              {location.note && <p className="font-semibold text-lg">"{location.note}"</p>}
              {location.address && (
                <p className="text-sm text-muted-foreground flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  {location.address}
                </p>
              )}
              <div className="text-xs text-muted-foreground">
                {new Date(location.timestamp).toLocaleString()} ({formatRelativeTime(location.timestamp)})
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant="outline" className="flex items-center gap-1.5">
                  {getParkingTypeIcon(location.parkingType)} {getParkingTypeName(location.parkingType)}
                </Badge>
                {location.cost && (
                  <Badge variant="outline" className="flex items-center gap-1.5">
                    <Euro className="w-3 h-3" />
                    {location.cost.toFixed(2)}€
                  </Badge>
                )}

                {/* NUEVO: Badge de tipo de ubicación */}
                <Badge
                  variant={locationTypeInfo.badgeVariant}
                  className={cn("flex items-center gap-1.5", locationTypeInfo.badgeColor)}
                  title={locationTypeInfo.description}
                >
                  {locationTypeInfo.icon}
                  {locationTypeInfo.label}
                </Badge>
              </div>

              {timerStatus !== "inactive" && <Separator />}
              {timerStatus !== "inactive" && (
                <div className="space-y-3">
                  <Alert
                    variant={timerStatus === "expired" ? "destructive" : "default"}
                    className={cn(
                      timerStatus === "warning" &&
                        "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800"
                    )}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="font-semibold">
                      {timerStatus === "expired" ? "Expirado" : `Quedan ${timerTimeLeft}`}
                    </AlertDescription>
                  </Alert>
                  {timerStatus !== "expired" && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={handleTimerExtend30}>
                        <Plus className="w-4 h-4 mr-1" />
                        30min
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleTimerExtend60}>
                        <Plus className="w-4 h-4 mr-1" />
                        1h
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={handleTimerCancel}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ← NUEVO: Dialog de edición */}
        <EditLocationDialog
          isOpen={showEditDialog}
          onClose={handleCloseEditDialog}
          location={location}
          onSave={handleEdit}
        />
      </>
    );
  }
);

LocationCard.displayName = "LocationCard";

const SavedLocations: React.FC<SavedLocationsProps> = ({
  locations,
  onLocationDeleted,
  onLocationSelected,
  onNavigateToLocation,
  sortBy,
  showAll,
  onSortChange,
  onShowAllChange,
  onTimerExtend,
  onTimerCancel,
  onLocationUpdated, // ← NUEVO PROP
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [timerStates, setTimerStates] = useState<{ [locationId: string]: string }>({});

  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    location: CarLocation | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    location: null,
    isDeleting: false,
  });

  // 🚀 OPTIMIZACIÓN 4: Memoizar función getTimeLeft para evitar recreaciones
  const getTimeLeft = useCallback((expiryTime: number): string => {
    const now = Date.now();
    const remaining = expiryTime - now;
    if (remaining <= 0) return "Expirado";
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }, []);

  // 🚀 OPTIMIZACIÓN 5: Actualizar timers de forma más eficiente
  useEffect(() => {
    const updateAllTimers = () => {
      const newTimerStates: { [locationId: string]: string } = {};
      locations.forEach((location) => {
        if (location.expiryTime) {
          newTimerStates[location.id] = getTimeLeft(location.expiryTime);
        }
      });
      setTimerStates(newTimerStates);
    };

    updateAllTimers();
    const interval = setInterval(updateAllTimers, 30000); // Cada 30 segundos en lugar de cada segundo
    return () => clearInterval(interval);
  }, [locations, getTimeLeft]);

  // 🚀 OPTIMIZACIÓN 6: Memoizar el filtrado y ordenado pesado
  const filteredAndSortedLocations = useMemo(() => {
    let filtered = filterLocationsByDate(locations, dateFilter);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (location) =>
          (location.note?.toLowerCase() || "").includes(query) ||
          (location.address?.toLowerCase() || "").includes(query)
      );
    }

    return [...filtered].sort((a, b) =>
      sortBy === "date" ? b.timestamp - a.timestamp : (a.note || "").localeCompare(b.note || "")
    );
  }, [locations, searchQuery, dateFilter, sortBy]);

  // 🚀 OPTIMIZACIÓN 7: Memoizar las ubicaciones mostradas
  const displayedLocations = useMemo(() => {
    return showAll ? filteredAndSortedLocations : filteredAndSortedLocations.slice(0, 5);
  }, [filteredAndSortedLocations, showAll]);

  // Callbacks optimizados
  const handleDeleteClick = useCallback((locationToDelete: CarLocation) => {
    setDeleteDialog({
      isOpen: true,
      location: locationToDelete,
      isDeleting: false,
    });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteDialog.location) return;

    try {
      setDeleteDialog((prev) => ({ ...prev, isDeleting: true }));
      await new Promise((resolve) => setTimeout(resolve, 500));
      deleteCarLocation(deleteDialog.location.id);
      onLocationDeleted(deleteDialog.location.id);
      toast.success("Ubicación eliminada correctamente.");
      setDeleteDialog({
        isOpen: false,
        location: null,
        isDeleting: false,
      });
    } catch (error) {
      console.error("Error al eliminar ubicación:", error);
      toast.error("No se pudo eliminar la ubicación.");
      setDeleteDialog((prev) => ({ ...prev, isDeleting: false }));
    }
  }, [deleteDialog.location, onLocationDeleted]);

  const handleCloseDialog = useCallback(() => {
    if (!deleteDialog.isDeleting) {
      setDeleteDialog({
        isOpen: false,
        location: null,
        isDeleting: false,
      });
    }
  }, [deleteDialog.isDeleting]);

  const getLocationInfo = useCallback(
    (location: CarLocation) => {
      const info = [];

      if (location.note) {
        info.push(`Nota: "${location.note}"`);
      }

      if (location.address) {
        info.push(`Dirección: ${location.address}`);
      }

      if (location.parkingType) {
        info.push(`Tipo: ${location.parkingType}`);
      }

      if (location.cost) {
        info.push(`Costo: ${location.cost.toFixed(2)}€`);
      }

      if (location.expiryTime) {
        const timeLeft = getTimeLeft(location.expiryTime);
        info.push(`Temporizador: ${timeLeft}`);
      }

      if (location.photos && location.photos.length > 0) {
        info.push(`Fotos: ${location.photos.length} imagen${location.photos.length > 1 ? "es" : ""}`);
      }

      // NUEVO: Información sobre el tipo de ubicación
      if (location.isManualPlacement) {
        info.push("Tipo: Ubicación marcada manualmente");
      } else if (location.accuracy) {
        info.push(`Precisión GPS: ±${Math.round(location.accuracy)}m`);
      }

      const formatRelativeTime = (timestamp: number): string => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return "hace unos segundos";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `hace ${minutes} min`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `hace ${hours} h`;
        const days = Math.floor(hours / 24);
        return `hace ${days} días`;
      };

      info.push(`Guardada: ${formatRelativeTime(location.timestamp)}`);

      return info;
    },
    [getTimeLeft]
  );

  if (locations.length === 0) {
    return (
      <Card className="text-center p-8 border-dashed">
        <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-lg font-semibold">No hay ubicaciones guardadas</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Usa el formulario principal para guardar tu primer aparcamiento.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Ubicaciones Guardadas ({filteredAndSortedLocations.length})</CardTitle>
          <Select value={sortBy} onValueChange={(value: "date" | "note") => onSortChange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ordenar por..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Más recientes</SelectItem>
              <SelectItem value="note">Por nota (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <SearchFilter
            onSearchChange={setSearchQuery}
            onDateFilterChange={setDateFilter}
            searchValue={searchQuery}
            dateFilter={dateFilter}
          />
        </CardContent>
      </Card>

      {filteredAndSortedLocations.length === 0 ? (
        <Card className="text-center p-8 border-dashed">
          <h3 className="text-lg font-semibold">No se encontraron resultados</h3>
          <p className="text-sm text-muted-foreground">Prueba con otros términos o ajusta los filtros.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {displayedLocations.map((location, index) => {
            const isLatest = index === 0 && sortBy === "date" && dateFilter === "all" && !searchQuery;
            const timeLeftText =
              timerStates[location.id] || (location.expiryTime ? getTimeLeft(location.expiryTime) : "");

            return (
              <LocationCard
                key={location.id}
                location={location}
                isLatest={isLatest}
                timerTimeLeft={timeLeftText}
                onLocationDeleted={handleDeleteClick}
                onLocationSelected={onLocationSelected}
                onNavigateToLocation={onNavigateToLocation}
                onTimerExtend={onTimerExtend}
                onTimerCancel={onTimerCancel}
                onLocationUpdated={onLocationUpdated} // ← NUEVO PROP PASADO
              />
            );
          })}
        </div>
      )}

      {filteredAndSortedLocations.length > 5 && !showAll && (
        <div className="flex justify-center mt-6">
          <Button onClick={() => onShowAllChange(true)} variant="secondary">
            Mostrar todas ({filteredAndSortedLocations.length})
          </Button>
        </div>
      )}

      <LocationDeleteDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmDelete}
        locationName={deleteDialog.location?.note || "esta ubicación"}
        loading={deleteDialog.isDeleting}
        disabled={deleteDialog.isDeleting}
      >
        {deleteDialog.location && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MapPin className="w-4 h-4" />
              Información de la ubicación:
            </div>
            <div className="grid gap-2 text-sm">
              {getLocationInfo(deleteDialog.location).map((info, index) => (
                <div key={index} className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-1 h-1 bg-current rounded-full opacity-60" />
                  {info}
                </div>
              ))}
            </div>
            {(deleteDialog.location.expiryTime || deleteDialog.location.photos?.length) && (
              <div className="flex items-center gap-4 pt-2 border-t border-border/50">
                {deleteDialog.location.expiryTime && (
                  <div className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400">
                    <Clock className="w-3 h-3" />
                    Temporizador activo
                  </div>
                )}
                {deleteDialog.location.photos && deleteDialog.location.photos.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                    <Camera className="w-3 h-3" />
                    {deleteDialog.location.photos.length} foto{deleteDialog.location.photos.length > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </LocationDeleteDialog>
    </div>
  );
};

export default SavedLocations;
