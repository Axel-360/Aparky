// src/components/PWA/UpdateNotification.tsx
import React from "react";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Download } from "lucide-react";

interface UpdateNotificationProps {
  isVisible: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({ isVisible, onUpdate, onDismiss }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
      <Alert className="shadow-lg border-primary/20 bg-gradient-to-r from-primary/5 to-green-600/5">
        <Download className="h-4 w-4" />
        <AlertDescription className="pr-16">
          <div className="space-y-2">
            <p className="font-medium">🆕 Nueva versión disponible</p>
            <p className="text-xs text-muted-foreground">Recarga para obtener las últimas mejoras</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={onUpdate} className="text-xs h-6">
                Actualizar
              </Button>
              <Button variant="ghost" size="sm" onClick={onDismiss} className="text-xs h-6">
                Más tarde
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};
