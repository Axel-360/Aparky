// src/shared/components/Header.tsx
import React from "react";
import { Button } from "@/shared/ui";
import { Map, Search, BarChart3, Settings, Car } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  currentView: "map" | "proximity";
  onViewChange: (view: "map" | "proximity") => void;
  onShowStats: () => void;
  onShowSettings: () => void;
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ currentView, onViewChange, onShowStats, onShowSettings, className }) => {
  return (
    <header className={cn("bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg", className)}>
      <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          {/* Title Section */}
          <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-bold mb-1 flex items-center justify-center sm:justify-start gap-2">
              <Car className="w-10 h-10 inline mr-1" />
              ¿Dónde aparqué mi coche?
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm">
              Guarda y encuentra fácilmente donde aparcaste tu vehículo
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {/* View Toggle Buttons */}
            <div className="flex bg-white/20 rounded-lg p-1 backdrop-blur-sm">
              <Button
                variant={currentView === "map" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onViewChange("map")}
                className={cn(
                  "text-white hover:text-gray-900 transition-all duration-200",
                  currentView === "map" && "bg-white text-gray-900 shadow-sm"
                )}
              >
                <Map className="w-4 h-4 mr-1" />
                Mapa
              </Button>

              <Button
                variant={currentView === "proximity" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onViewChange("proximity")}
                className={cn(
                  "text-white hover:text-gray-900 transition-all duration-200",
                  currentView === "proximity" && "bg-white text-gray-900 shadow-sm"
                )}
              >
                <Search className="w-4 h-4 mr-1" />
                Proximidad
              </Button>
            </div>

            {/* Utility Buttons */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowStats}
              className="text-white hover:bg-white/20 backdrop-blur-sm"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="sr-only">Ver estadísticas</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onShowSettings}
              className="text-white hover:bg-white/20 backdrop-blur-sm"
            >
              <Settings className="w-4 h-4" />
              <span className="sr-only">Configuración</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
