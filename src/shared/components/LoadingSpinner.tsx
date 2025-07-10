// src/shared/components/LoadingSpinner/LoadingSpinner.tsx
import React from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Loader2, MapPin, Save, Navigation, Camera, Clock } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "overlay" | "inline" | "card";
  message?: string;
  type?: "generic" | "location" | "saving" | "navigation" | "camera" | "timer";
  className?: string;
  children?: ReactNode;
  showIcon?: boolean;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

const messageClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

const typeIcons = {
  generic: Loader2,
  location: MapPin,
  saving: Save,
  navigation: Navigation,
  camera: Camera,
  timer: Clock,
};

const typeMessages = {
  generic: "Cargando...",
  location: "Obteniendo ubicación...",
  saving: "Guardando...",
  navigation: "Calculando ruta...",
  camera: "Procesando imagen...",
  timer: "Actualizando temporizador...",
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  variant = "default",
  message,
  type = "generic",
  className,
  children,
  showIcon = true,
}) => {
  const Icon = typeIcons[type];
  const defaultMessage = typeMessages[type];
  const displayMessage = message || defaultMessage;

  const spinnerElement = (
    <Icon className={cn(sizeClasses[size], "animate-spin text-primary", !showIcon && "sr-only")} />
  );

  const contentElement = (
    <div className="flex flex-col items-center gap-3">
      {showIcon && spinnerElement}
      {displayMessage && (
        <p className={cn(messageClasses[size], "text-muted-foreground font-medium animate-pulse")}>{displayMessage}</p>
      )}
      {children}
    </div>
  );

  if (variant === "overlay") {
    return (
      <div
        className={cn(
          "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm",
          "flex items-center justify-center",
          className
        )}
      >
        <div className="bg-card border rounded-lg p-8 shadow-lg">{contentElement}</div>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={cn(
          "bg-card border rounded-lg p-6 shadow-sm",
          "flex items-center justify-center min-h-32",
          className
        )}
      >
        {contentElement}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {showIcon && spinnerElement}
        {displayMessage && <span className={cn(messageClasses[size], "text-muted-foreground")}>{displayMessage}</span>}
        {children}
      </div>
    );
  }

  return <div className={cn("flex items-center justify-center p-4", className)}>{contentElement}</div>;
};

export const LocationSpinner: React.FC<Omit<LoadingSpinnerProps, "type">> = (props) => (
  <LoadingSpinner {...props} type="location" />
);

export const SavingSpinner: React.FC<Omit<LoadingSpinnerProps, "type">> = (props) => (
  <LoadingSpinner {...props} type="saving" />
);

export const NavigationSpinner: React.FC<Omit<LoadingSpinnerProps, "type">> = (props) => (
  <LoadingSpinner {...props} type="navigation" />
);

export const CameraSpinner: React.FC<Omit<LoadingSpinnerProps, "type">> = (props) => (
  <LoadingSpinner {...props} type="camera" />
);

export const TimerSpinner: React.FC<Omit<LoadingSpinnerProps, "type">> = (props) => (
  <LoadingSpinner {...props} type="timer" />
);

export const withLoading = <P extends object>(
  Component: React.ComponentType<P>,
  spinnerProps?: Partial<LoadingSpinnerProps>
) => {
  return function WithLoadingComponent(props: P & { isLoading?: boolean }) {
    const { isLoading, ...componentProps } = props;

    if (isLoading) {
      return <LoadingSpinner {...spinnerProps} />;
    }

    return <Component {...(componentProps as P)} />;
  };
};

export const useLoadingState = (initialState = false) => {
  const [isLoading, setIsLoading] = React.useState(initialState);

  const startLoading = React.useCallback(() => setIsLoading(true), []);
  const stopLoading = React.useCallback(() => setIsLoading(false), []);
  const toggleLoading = React.useCallback(() => setIsLoading((prev) => !prev), []);

  return {
    isLoading,
    startLoading,
    stopLoading,
    toggleLoading,
    setIsLoading,
  };
};

export const LoadingSpinnerDemo: React.FC = () => {
  return (
    <div className="space-y-8 p-8">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Variantes</h3>
        <div className="grid grid-cols-2 gap-4">
          <LoadingSpinner variant="default" message="Variante por defecto" />
          <LoadingSpinner variant="inline" message="Variante en línea" />
          <LoadingSpinner variant="card" message="Variante tarjeta" />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Tamaños</h3>
        <div className="flex items-center gap-4">
          <LoadingSpinner size="sm" />
          <LoadingSpinner size="md" />
          <LoadingSpinner size="lg" />
          <LoadingSpinner size="xl" />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Tipos especializados</h3>
        <div className="grid grid-cols-2 gap-4">
          <LocationSpinner variant="card" />
          <SavingSpinner variant="card" />
          <NavigationSpinner variant="card" />
          <CameraSpinner variant="card" />
        </div>
      </div>
    </div>
  );
};
