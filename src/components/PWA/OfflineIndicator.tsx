// src/components/PWA/OfflineIndicator.tsx
import React from "react";

interface OfflineIndicatorProps {
  isOffline: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ isOffline }) => {
  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-yellow-500 text-yellow-900 text-center py-1 px-4 text-sm font-medium">
        📡 Sin conexión - Modo sin conexión activo
      </div>
    </div>
  );
};
