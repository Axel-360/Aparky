// src/features/parking/components/TimerDashboard.tsx
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Progress,
  Separator,
  Alert,
  AlertDescription,
} from "@/shared/ui";
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  RotateCcw,
  Flame,
  Car,
  Building,
  ParkingSquare as Lot,
  MapPin as LocationPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CarLocation } from "@/types/location";
import { updateCarLocation } from "@/utils/storage";
import { timerManager } from "@/utils/timerManager";
import { toast } from "sonner";

interface TimerWidget {
  id: string;
  locationId: string;
  locationNote?: string;
  expiryTime: number;
  reminderMinutes?: number;
  status: "active" | "warning" | "expired" | "extended";
  extensionCount: number;
  address?: string;
  parkingType?: string;
  timestamp: number;
}

interface ParkingStats {
  totalActive: number;
  totalExpired: number;
  totalExtensions: number;
  nextExpiration?: string;
}

interface TimerDashboardProps {
  locations: CarLocation[];
  onLocationUpdated?: (locationId: string, updates: Partial<CarLocation>) => void;
}

interface LiveTimerData {
  timeLeft: string;
  progress: number;
}

const TimerDashboard: React.FC<TimerDashboardProps> = ({ locations, onLocationUpdated }) => {
  const [activeTimers, setActiveTimers] = useState<TimerWidget[]>([]);
  const [stats, setStats] = useState<ParkingStats>({ totalActive: 0, totalExpired: 0, totalExtensions: 0 });
  const [liveData, setLiveData] = useState<{ [key: string]: LiveTimerData }>({});

  const formatTimeLeft = (milliseconds: number, showSeconds = false): string => {
    if (milliseconds <= 0) return "Expirado";

    const totalSeconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;

    if (showSeconds && hours < 1) {
      return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}m`;
  };

  const createTimerWidget = (location: CarLocation): TimerWidget => {
    const now = Date.now();
    const timeLeftMs = (location.expiryTime || 0) - now;
    const reminderTimeMs = (location.reminderMinutes || 0) * 60 * 1000;
    let status: TimerWidget["status"] = "active";
    if (timeLeftMs <= 0) status = "expired";
    else if (reminderTimeMs > 0 && timeLeftMs <= reminderTimeMs) status = "warning";
    else if ((location.extensionCount || 0) > 0) status = "extended";

    return {
      id: location.id,
      locationId: location.id,
      locationNote: location.note,
      expiryTime: location.expiryTime || 0,
      reminderMinutes: location.reminderMinutes,
      status,
      extensionCount: location.extensionCount || 0,
      address: location.address,
      parkingType: location.parkingType,
      timestamp: location.timestamp,
    };
  };

  useEffect(() => {
    const updateCoreTimers = () => {
      const locationsWithTimers = locations.filter((loc) => loc.expiryTime);
      const timers = locationsWithTimers.map(createTimerWidget);
      const sortedTimers = timers.sort((a, b) => (a.expiryTime || 0) - (b.expiryTime || 0));

      setActiveTimers(sortedTimers);
    };
    updateCoreTimers();
    const interval = setInterval(updateCoreTimers, 30000);
    return () => clearInterval(interval);
  }, [locations]);

  useEffect(() => {
    const activeNonExpired = activeTimers.filter((timer) => timer.status !== "expired");
    const expiredCount = activeTimers.filter((timer) => timer.status === "expired").length;
    const totalExtensions = activeTimers.reduce((sum, timer) => sum + timer.extensionCount, 0);
    const nextExpiration =
      activeNonExpired.length > 0 ? Math.min(...activeNonExpired.map((t) => t.expiryTime)) : undefined;

    setStats({
      totalActive: activeNonExpired.length,
      totalExpired: expiredCount,
      totalExtensions,
      nextExpiration: nextExpiration
        ? new Date(nextExpiration).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "—",
    });
  }, [activeTimers]);

  useEffect(() => {
    const updateLiveUI = () => {
      setLiveData((prevData) => {
        const newLiveData: { [key: string]: LiveTimerData } = {};
        activeTimers.forEach((timer) => {
          if (timer.status !== "expired") {
            const timeRemaining = timer.expiryTime - Date.now();
            const totalDuration = timer.expiryTime - timer.timestamp;
            newLiveData[timer.id] = {
              timeLeft: formatTimeLeft(timeRemaining, true),
              progress: totalDuration > 0 ? (timeRemaining / totalDuration) * 100 : 0,
            };
          } else {
            if (prevData[timer.id]) {
              newLiveData[timer.id] = { timeLeft: "Expirado", progress: 0 };
            }
          }
        });
        return newLiveData;
      });
    };

    const liveInterval = setInterval(updateLiveUI, 1000);
    return () => clearInterval(liveInterval);
  }, [activeTimers]);

  const extendTimer = (timerId: string, minutes: number) => {
    const location = locations.find((loc) => loc.id === timerId);
    if (!location || !location.expiryTime) return;

    const newExpiryTime = location.expiryTime + minutes * 60 * 1000;
    const newExtensionCount = (location.extensionCount || 0) + 1;
    const updates = { expiryTime: newExpiryTime, extensionCount: newExtensionCount };

    updateCarLocation(timerId, updates);

    setActiveTimers((prevTimers) =>
      prevTimers.map((timer) =>
        timer.id === timerId
          ? {
              ...timer,
              expiryTime: newExpiryTime,
              extensionCount: newExtensionCount,
              status: "extended" as const,
            }
          : timer
      )
    );

    onLocationUpdated?.(timerId, updates);

    const updatedLocation = { ...location, ...updates };
    timerManager.scheduleTimer(updatedLocation);

    const displayName =
      location.note ||
      location.address ||
      `Lat: ${location.latitude.toFixed(4)}, Lng: ${location.longitude.toFixed(4)}`;
    toast.success(`⏰ Temporizador extendido ${minutes} minutos para: ${displayName}`, {
      duration: 4000,
    });
  };

  const cancelTimer = (timerId: string) => {
    const location = locations.find((loc) => loc.id === timerId);
    const updates = { expiryTime: undefined, reminderMinutes: undefined, extensionCount: undefined };

    updateCarLocation(timerId, updates);

    setActiveTimers((prevTimers) => prevTimers.filter((timer) => timer.id !== timerId));

    onLocationUpdated?.(timerId, updates);

    timerManager.cancelTimer(timerId);

    const displayName = location?.note || location?.address || `Ubicación ${location?.id}`;
    toast.success(`⏰ Temporizador cancelado para: ${displayName}`, {
      duration: 4000,
    });
  };

  const getStatusIcon = (status: TimerWidget["status"]) => {
    switch (status) {
      case "expired":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "extended":
        return <RotateCcw className="w-5 h-5 text-blue-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  const getParkingTypeIcon = (type?: string) => {
    switch (type) {
      case "Garaje":
        return <Building className="w-4 h-4" />;
      case "Parking":
        return <Lot className="w-4 h-4" />;
      case "Otro":
        return <LocationPin className="w-4 h-4" />;
      default:
        return <Car className="w-4 h-4" />;
    }
  };

  const getMostUrgentTimer = (): TimerWidget | null => {
    const activeNonExpired = activeTimers.filter((t) => t.status !== "expired");
    return activeNonExpired.length > 0 ? activeNonExpired[0] : null;
  };

  if (activeTimers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">No hay temporizadores activos</h3>
          <p className="text-sm text-muted-foreground">Los temporizadores de parking aparecerán aquí.</p>
        </CardContent>
      </Card>
    );
  }

  const mostUrgentTimer = getMostUrgentTimer();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock /> Resumen de Temporizadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatPill title="Activos" value={stats.totalActive.toString()} className="text-green-600" />
            <StatPill title="Expirados" value={stats.totalExpired.toString()} className="text-red-600" />
            <StatPill title="Extensiones" value={stats.totalExtensions.toString()} className="text-blue-600" />
            <StatPill title="Próximo" value={stats.nextExpiration || "—"} className="text-orange-600" />
          </div>
        </CardContent>
      </Card>
      <div className="space-y-4">
        {activeTimers.map((timer) => {
          const currentLiveData = liveData[timer.id] || {
            timeLeft: formatTimeLeft(timer.expiryTime - Date.now()),
            progress: 0,
          };

          return (
            <Card
              key={timer.id}
              className={cn(
                "overflow-hidden",
                timer.status === "expired" && "bg-destructive/10 border-destructive/30",
                mostUrgentTimer?.id === timer.id && timer.status !== "expired" && "ring-2 ring-primary"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(timer.status)}
                      <h4 className="text-lg font-semibold tabular-nums">
                        {timer.status === "expired" ? "Expirado" : currentLiveData.timeLeft}
                        {mostUrgentTimer?.id === timer.id && timer.status !== "expired" && (
                          <Badge variant="destructive" className="ml-2 animate-pulse">
                            <Flame className="w-3 h-3 mr-1" /> URGENTE
                          </Badge>
                        )}
                      </h4>
                    </div>
                    <div className="space-y-1 pl-8">
                      {timer.locationNote && <p className="text-sm font-medium">"{timer.locationNote}"</p>}
                      {timer.address && <p className="text-xs text-muted-foreground">{timer.address}</p>}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          {getParkingTypeIcon(timer.parkingType)} {timer.parkingType || "Calle"}
                        </span>
                        <span>
                          Expira:{" "}
                          {new Date(timer.expiryTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {timer.extensionCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <RotateCcw className="w-3 h-3 mr-1" /> {timer.extensionCount}{" "}
                            {timer.extensionCount > 1 ? "ext." : "ext."}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {timer.status !== "expired" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => extendTimer(timer.id, 30)}
                          className="text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" /> 30min
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => extendTimer(timer.id, 60)}
                          className="text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" /> 1h
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => cancelTimer(timer.id)} className="text-xs">
                      {timer.status === "expired" ? "Limpiar" : "Cancelar"}
                    </Button>
                  </div>
                </div>
                {timer.status === "expired" && (
                  <>
                    <Separator className="my-3" />
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        El tiempo de parking ha expirado. Considera mover tu vehículo.
                      </AlertDescription>
                    </Alert>
                  </>
                )}
              </CardContent>
              {timer.status !== "expired" && (
                <Progress
                  value={Math.max(0, currentLiveData.progress)}
                  className="h-1 transition-all duration-1000 ease-linear"
                />
              )}
            </Card>
          );
        })}
      </div>
      {mostUrgentTimer && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg p-3 text-white shadow-lg transition-all",
            "backdrop-blur-sm border",
            {
              "bg-green-600/80 border-green-400": mostUrgentTimer.status === "active",
              "bg-yellow-500/80 border-yellow-300 animate-pulse": mostUrgentTimer.status === "warning",
              "bg-blue-600/80 border-blue-400": mostUrgentTimer.status === "extended",
            }
          )}
        >
          {getStatusIcon(mostUrgentTimer.status)}
          <div>
            <div className="font-bold tabular-nums">
              {liveData[mostUrgentTimer.id]?.timeLeft || formatTimeLeft(mostUrgentTimer.expiryTime - Date.now(), true)}
            </div>
            <div className="text-xs opacity-90">{mostUrgentTimer.locationNote || "Parking más urgente"}</div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatPill = ({ title, value, className }: { title: string; value: string; className?: string }) => (
  <div className="text-center">
    <div className={cn("text-2xl font-bold", className)}>{value}</div>
    <div className="text-xs text-muted-foreground">{title}</div>
  </div>
);

export default TimerDashboard;
