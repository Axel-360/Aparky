// src/shared/components/Stats/Stats.tsx
import React from "react";
import type { CarLocation } from "@/types/location";
import { calculateLocationStats } from "@/utils/stats";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from "@/shared/ui";
import { BarChart, Clock, CalendarDays, MapPin, Lightbulb } from "lucide-react";

interface StatsProps {
  locations: CarLocation[];
  isOpen: boolean;
  onClose: () => void;
}

const Stats: React.FC<StatsProps> = ({ locations, isOpen, onClose }) => {
  // La lógica para calcular las estadísticas no cambia en absoluto.
  const stats = calculateLocationStats(locations);
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const weekDaysPlural = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"];
  const mostActiveDayIndex = stats.weeklyCount.indexOf(Math.max(...stats.weeklyCount));

  const formatHour = (hour: number): string => `${hour.toString().padStart(2, "0")}:00`;

  const getWeekdayPercentage = (count: number): number => {
    // Evita la división por cero si no hay ubicaciones
    if (stats.totalLocations === 0) return 0;
    const maxCount = Math.max(...stats.weeklyCount);
    if (maxCount === 0) return 0;
    // La altura será relativa al día más activo, no al total, para que la barra más alta siempre sea 100%
    return Math.round((count / maxCount) * 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <BarChart className="w-6 h-6" />
            Estadísticas de Uso
          </DialogTitle>
          <DialogDescription>Un resumen de tus hábitos de aparcamiento.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          {stats.totalLocations === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <BarChart className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No hay datos suficientes</h3>
              <p className="text-muted-foreground text-sm">
                Guarda algunas ubicaciones para ver información interesante.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Grid de Estadísticas Principales */}
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <StatCard icon={<MapPin />} title="Ubicaciones" value={stats.totalLocations.toString()} />
                <StatCard icon={<Clock />} title="Hora más común" value={formatHour(stats.mostUsedHour)} />
                <StatCard icon={<CalendarDays />} title="Día más activo" value={weekDays[mostActiveDayIndex]} />
                <StatCard icon={<MapPin />} title="Área favorita" value={stats.mostCommonArea} textSize="text-base" />
              </div>

              <Separator />

              {/* Gráfica de Actividad Semanal */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">Actividad Semanal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between h-40 gap-2 text-center">
                    {weekDays.map((day, index) => (
                      <div key={day} className="flex flex-col items-center justify-end h-full w-full gap-2">
                        <div
                          title={`${stats.weeklyCount[index]} ubicaciones`}
                          className="relative w-full h-full flex items-end justify-center group"
                        >
                          <div
                            className={`w-3/4 max-w-8 rounded-t-lg transition-all duration-300 ease-in-out group-hover:bg-primary/80 ${
                              index === mostActiveDayIndex ? "bg-primary" : "bg-secondary"
                            }`}
                            style={{ height: `${getWeekdayPercentage(stats.weeklyCount[index])}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-muted-foreground">{day}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* ¿Sabías que...? */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                    ¿Sabías que...?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <InsightItem text={`Sueles aparcar más los ${weekDaysPlural[mostActiveDayIndex]}.`} />
                  <InsightItem text={`Tu hora punta para aparcar es a las ${formatHour(stats.mostUsedHour)}.`} />
                  {stats.mostCommonArea !== "Sin datos" && (
                    <InsightItem text={`Tu zona de aparcamiento favorita es: ${stats.mostCommonArea}.`} />
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Componentes auxiliares para mantener el código limpio
const StatCard = ({
  icon,
  title,
  value,
  textSize = "text-2xl",
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  textSize?: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className="text-muted-foreground">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className={`${textSize} font-bold`}>{value}</div>
    </CardContent>
  </Card>
);

const InsightItem = ({ text }: { text: string }) => (
  <div className="flex items-start gap-3 p-2 bg-secondary/30 rounded-lg">
    <span className="mt-1">💡</span>
    <p>{text}</p>
  </div>
);

export default Stats;
