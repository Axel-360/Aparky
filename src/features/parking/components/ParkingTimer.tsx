// src/features/parking/components/ParkingTimer.tsx
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ToggleGroup,
  ToggleGroupItem,
} from "@/shared/ui";
import { Clock, AlertTriangle, CheckCircle, XCircle, Bell, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ParkingTimerProps {
  expiryTime?: number;
  reminderMinutes?: number;
  onExpiryTimeChange: (expiryTime?: number) => void;
  onReminderChange: (reminderMinutes?: number) => void;
  onTimerExpired?: () => void;
  onReminderTriggered?: () => void;
  onTimerCancelled?: () => void;
  onTimerExtended?: (additionalMinutes: number) => void;
}

const ParkingTimer: React.FC<ParkingTimerProps> = ({
  expiryTime,
  reminderMinutes,
  onExpiryTimeChange,
  onReminderChange,
  onTimerExpired,
  onReminderTriggered,
  onTimerCancelled,
}) => {
  const [duration, setDuration] = useState<string>("");
  const [customTime, setCustomTime] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [status, setStatus] = useState<"inactive" | "active" | "warning" | "expired">("inactive");
  const [reminderSent, setReminderSent] = useState(false);

  useEffect(() => {
    if (!expiryTime) {
      setStatus("inactive");
      setTimeLeft("");
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const remaining = expiryTime - now;
      if (remaining <= 0) {
        setTimeLeft("Expirado");
        setStatus("expired");
        onTimerExpired?.();
        return;
      }
      const reminderTime = reminderMinutes ? reminderMinutes * 60 * 1000 : 0;
      if (!reminderSent && remaining <= reminderTime && reminderTime > 0) {
        setReminderSent(true);
        onReminderTriggered?.();
      }
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      setTimeLeft(hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`);
      setStatus(reminderTime > 0 && remaining <= reminderTime ? "warning" : "active");
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [expiryTime, reminderMinutes, reminderSent, onTimerExpired, onReminderTriggered]);

  const quickDurations = [
    { label: "30m", minutes: 30 },
    { label: "1h", minutes: 60 },
    { label: "2h", minutes: 120 },
    { label: "4h", minutes: 240 },
  ];

  const reminderOptions = [
    { label: "5m", minutes: 5 },
    { label: "10m", minutes: 10 },
    { label: "15m", minutes: 15 },
    { label: "30m", minutes: 30 },
  ];

  const setQuickDuration = (minutes: number) => {
    onExpiryTimeChange(Date.now() + minutes * 60 * 1000);
    setReminderSent(false);
  };

  const setCustomDuration = () => {
    if (!duration) return;
    const minutes = parseInt(duration);
    if (isNaN(minutes) || minutes <= 0) {
      alert("Por favor, introduce un número válido de minutos");
      return;
    }
    onExpiryTimeChange(Date.now() + minutes * 60 * 1000);
    setDuration("");
    setReminderSent(false);
  };

  const setSpecificTime = () => {
    if (!customTime) return;
    const today = new Date();
    const [hours, minutes] = customTime.split(":").map(Number);
    const targetTime = new Date(today);
    targetTime.setHours(hours, minutes, 0, 0);
    if (targetTime.getTime() <= Date.now()) targetTime.setDate(targetTime.getDate() + 1);
    onExpiryTimeChange(targetTime.getTime());
    setCustomTime("");
    setReminderSent(false);
  };

  const clearTimer = () => {
    onExpiryTimeChange(undefined);
    onTimerCancelled?.();
  };

  const getStatusInfo = () => {
    switch (status) {
      case "active":
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          text: `Quedan ${timeLeft}`,
          color: "text-green-600",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="h-5 w-5 text-yellow-500 animate-pulse" />,
          text: `Quedan ${timeLeft}`,
          color: "text-yellow-600",
        };
      case "expired":
        return {
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          text: "Expirado",
          color: "text-red-600",
        };
      default:
        return {
          icon: <Clock className="h-5 w-5" />,
          text: "Sin configurar",
        };
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Clock /> Temporizador de Aparcamiento
          </CardTitle>
          <div className={cn("flex items-center gap-2 text-sm font-semibold", getStatusInfo().color)}>
            {getStatusInfo().icon}
            <span>{getStatusInfo().text}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!expiryTime ? (
          <div className="space-y-6">
            <Tabs defaultValue="duration">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="duration">Por Duración</TabsTrigger>
                <TabsTrigger value="time">Hora límite</TabsTrigger>
              </TabsList>
              <TabsContent value="duration" className="pt-4 space-y-4">
                <div>
                  <label className="text-sm font-medium">Duraciones rápidas</label>
                  <ToggleGroup
                    type="single"
                    onValueChange={(val) => val && setQuickDuration(Number(val))}
                    className="justify-start mt-2 flex-wrap h-auto"
                  >
                    {quickDurations.map((opt) => (
                      <ToggleGroupItem key={opt.minutes} value={opt.minutes.toString()}>
                        {opt.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-grow">
                    <label htmlFor="custom-duration" className="text-sm font-medium">
                      Minutos exactos
                    </label>
                    <Input
                      id="custom-duration"
                      type="number"
                      placeholder="Ej: 90"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                  </div>
                  <Button onClick={setCustomDuration} disabled={!duration}>
                    Establecer
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="time" className="pt-4">
                <div className="flex items-end gap-2">
                  <div className="flex-grow">
                    <label htmlFor="specific-time" className="text-sm font-medium">
                      Hora de finalización
                    </label>
                    <Input
                      id="specific-time"
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                    />
                  </div>
                  <Button onClick={setSpecificTime} disabled={!customTime}>
                    Establecer
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <div>
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Bell className="w-4 h-4" /> Recordatorio (antes de expirar)
              </label>
              <ToggleGroup
                type="single"
                value={reminderMinutes?.toString()}
                onValueChange={(val) => onReminderChange(val ? Number(val) : undefined)}
                className="justify-start flex-wrap mt-2 h-auto"
              >
                {reminderOptions.map((opt) => (
                  <ToggleGroupItem key={opt.minutes} value={opt.minutes.toString()}>
                    {opt.label}
                  </ToggleGroupItem>
                ))}
                <ToggleGroupItem value="">Ninguno</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-secondary/50 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">El temporizador finalizará el</p>
              <p className="font-semibold">
                {new Date(expiryTime).toLocaleString("es-ES", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              {reminderMinutes && (
                <p className="text-xs text-muted-foreground">(Recordatorio {reminderMinutes} min antes)</p>
              )}
            </div>
            <Button variant="outline" onClick={clearTimer} className="w-full">
              <Trash2 className="mr-2 h-4 w-4" /> Cancelar Temporizador
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ParkingTimer;
