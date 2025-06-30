// src/shared/components/ConfirmationDialog/ConfirmationDialog.tsx
import React from "react";
import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, Trash2, RotateCcw, Camera, MapPin, Settings, XCircle } from "lucide-react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  variant?: "default" | "destructive" | "warning" | "success" | "info";
  type?: "delete" | "cancel" | "reset" | "photo" | "location" | "settings" | "generic";
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  disabled?: boolean;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

const variantStyles = {
  default: {
    icon: "text-blue-500",
    button: "default",
    bg: "bg-blue-50 dark:bg-blue-950/20",
  },
  destructive: {
    icon: "text-red-500",
    button: "destructive",
    bg: "bg-red-50 dark:bg-red-950/20",
  },
  warning: {
    icon: "text-yellow-500",
    button: "secondary",
    bg: "bg-yellow-50 dark:bg-yellow-950/20",
  },
  success: {
    icon: "text-green-500",
    button: "default",
    bg: "bg-green-50 dark:bg-green-950/20",
  },
  info: {
    icon: "text-blue-500",
    button: "secondary",
    bg: "bg-blue-50 dark:bg-blue-950/20",
  },
} as const;

const typeConfig = {
  delete: {
    icon: Trash2,
    variant: "destructive" as const,
    title: "¿Eliminar elemento?",
    description: "Esta acción no se puede deshacer.",
    confirmText: "Eliminar",
  },
  cancel: {
    icon: XCircle,
    variant: "warning" as const,
    title: "¿Cancelar acción?",
    description: "Se perderán los cambios no guardados.",
    confirmText: "Cancelar",
  },
  reset: {
    icon: RotateCcw,
    variant: "warning" as const,
    title: "¿Restaurar valores predeterminados?",
    description: "Se perderán todas las configuraciones personalizadas.",
    confirmText: "Restaurar",
  },
  photo: {
    icon: Camera,
    variant: "destructive" as const,
    title: "¿Eliminar foto?",
    description: "La imagen se eliminará permanentemente.",
    confirmText: "Eliminar foto",
  },
  location: {
    icon: MapPin,
    variant: "destructive" as const,
    title: "¿Eliminar ubicación?",
    description: "Se eliminará la ubicación y todos sus datos asociados.",
    confirmText: "Eliminar ubicación",
  },
  settings: {
    icon: Settings,
    variant: "warning" as const,
    title: "¿Aplicar cambios?",
    description: "Se guardarán las nuevas configuraciones.",
    confirmText: "Aplicar",
  },
  generic: {
    icon: AlertTriangle,
    variant: "default" as const,
    title: "¿Continuar?",
    description: "¿Estás seguro de que quieres realizar esta acción?",
    confirmText: "Continuar",
  },
} as const;

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  children,
  variant,
  type = "generic",
  confirmText,
  cancelText = "Cancelar",
  loading = false,
  disabled = false,
  showIcon = true,
  size = "md",
}) => {
  const config = typeConfig[type];
  const finalVariant = variant || config.variant;
  const styles = variantStyles[finalVariant];

  const Icon = config.icon;
  const finalTitle = title || config.title;
  const finalDescription = description || config.description;
  const finalConfirmText = confirmText || config.confirmText;

  const handleConfirm = () => {
    onConfirm();
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(sizeClasses[size], "gap-6")}>
        <DialogHeader className="space-y-4">
          {showIcon && (
            <div className={cn("mx-auto w-12 h-12 rounded-full flex items-center justify-center", styles.bg)}>
              <Icon className={cn("w-6 h-6", styles.icon)} />
            </div>
          )}
          <div className="text-center space-y-2">
            <DialogTitle className="text-lg font-semibold">{finalTitle}</DialogTitle>
            {finalDescription && (
              <DialogDescription className="text-sm text-muted-foreground">{finalDescription}</DialogDescription>
            )}
          </div>
        </DialogHeader>

        {children && <div className="py-2">{children}</div>}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
            {cancelText}
          </Button>
          <Button
            variant={styles.button as any}
            onClick={handleConfirm}
            disabled={disabled || loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Procesando...
              </>
            ) : (
              finalConfirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Componentes especializados para casos comunes
export const DeleteConfirmationDialog: React.FC<
  Omit<ConfirmationDialogProps, "type"> & {
    itemName?: string;
  }
> = ({ itemName, description, ...props }) => (
  <ConfirmationDialog
    {...props}
    type="delete"
    title={itemName ? `¿Eliminar ${itemName}?` : undefined}
    description={description || `Se eliminará ${itemName || "este elemento"} permanentemente.`}
  />
);

export const ResetConfirmationDialog: React.FC<Omit<ConfirmationDialogProps, "type">> = (props) => (
  <ConfirmationDialog {...props} type="reset" />
);

export const LocationDeleteDialog: React.FC<
  Omit<ConfirmationDialogProps, "type"> & {
    locationName?: string;
  }
> = ({ locationName, children, ...props }) => (
  <ConfirmationDialog {...props} type="location" title={locationName ? `¿Eliminar "${locationName}"?` : undefined}>
    {children || (
      <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
        <p>Se eliminará:</p>
        <ul className="mt-1 ml-4 space-y-1">
          <li>• La ubicación guardada</li>
          <li>• Timer de parking asociado</li>
          <li>• Fotos relacionadas</li>
          <li>• Historial de la ubicación</li>
        </ul>
      </div>
    )}
  </ConfirmationDialog>
);

// Hook para manejar confirmaciones
export const useConfirmation = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [config, setConfig] = React.useState<Partial<ConfirmationDialogProps>>({});
  const resolveRef = React.useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = React.useCallback((options: Partial<ConfirmationDialogProps> = {}): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfig(options);
      setIsOpen(true);
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = React.useCallback(() => {
    resolveRef.current?.(true);
    setIsOpen(false);
    resolveRef.current = null;
  }, []);

  const handleCancel = React.useCallback(() => {
    resolveRef.current?.(false);
    setIsOpen(false);
    resolveRef.current = null;
  }, []);

  const ConfirmationComponent = React.useCallback(
    () => <ConfirmationDialog {...config} isOpen={isOpen} onConfirm={handleConfirm} onClose={handleCancel} />,
    [config, isOpen, handleConfirm, handleCancel]
  );

  return {
    confirm,
    ConfirmationDialog: ConfirmationComponent,
    isOpen,
  };
};

// Ejemplos de uso para documentación
export const ConfirmationDialogExamples: React.FC = () => {
  const [showExample, setShowExample] = React.useState<string | null>(null);

  return (
    <div className="space-y-4 p-6">
      <h3 className="text-lg font-semibold">Ejemplos de ConfirmationDialog</h3>

      <div className="grid grid-cols-2 gap-4">
        <Button variant="destructive" onClick={() => setShowExample("delete")}>
          Eliminar ubicación
        </Button>

        <Button variant="outline" onClick={() => setShowExample("reset")}>
          Reset configuración
        </Button>

        <Button variant="secondary" onClick={() => setShowExample("cancel")}>
          Cancelar timer
        </Button>

        <Button onClick={() => setShowExample("custom")}>Personalizado</Button>
      </div>

      {/* Ejemplos de diálogos */}
      <DeleteConfirmationDialog
        isOpen={showExample === "delete"}
        onClose={() => setShowExample(null)}
        onConfirm={() => console.log("Ubicación eliminada")}
        itemName="ubicación del trabajo"
      />

      <ResetConfirmationDialog
        isOpen={showExample === "reset"}
        onClose={() => setShowExample(null)}
        onConfirm={() => console.log("Configuración reseteada")}
      />

      <ConfirmationDialog
        isOpen={showExample === "cancel"}
        onClose={() => setShowExample(null)}
        onConfirm={() => console.log("Timer cancelado")}
        type="cancel"
        title="¿Cancelar timer de parking?"
        description="Se perderá el tiempo restante configurado."
      />

      <ConfirmationDialog
        isOpen={showExample === "custom"}
        onClose={() => setShowExample(null)}
        onConfirm={() => console.log("Acción personalizada")}
        variant="success"
        title="¿Guardar cambios?"
        description="Se aplicarán las nuevas configuraciones."
        confirmText="Guardar"
        showIcon={true}
      >
        <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg text-sm">
          <p className="font-medium text-green-800 dark:text-green-200">Cambios detectados:</p>
          <ul className="mt-1 text-green-700 dark:text-green-300">
            <li>• Tema cambiado a oscuro</li>
            <li>• Notificaciones activadas</li>
            <li>• Recordatorio a 15 minutos</li>
          </ul>
        </div>
      </ConfirmationDialog>
    </div>
  );
};
