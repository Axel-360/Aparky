import React, { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Actualiza el estado para mostrar la UI de error
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Registra el error
    console.error("ErrorBoundary capturó un error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Callback personalizado para logging
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // En producción, aquí podrías enviar el error a un servicio de monitoring
    // como Sentry, LogRocket, etc.
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    // Reload the page to reset the app state
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI personalizada si se proporciona
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI de error por defecto
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">¡Oops! Algo salió mal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Se produjo un error inesperado. No te preocupes, tus datos están seguros.
                </AlertDescription>
              </Alert>

              {/* Detalles del error (solo en desarrollo) */}
              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="bg-muted p-3 rounded-md text-sm">
                  <summary className="cursor-pointer font-medium mb-2">Detalles técnicos (desarrollo)</summary>
                  <pre className="whitespace-pre-wrap text-xs">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              {/* Botones de acción */}
              <div className="flex flex-col gap-2">
                <Button onClick={this.handleRetry} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Intentar de nuevo
                </Button>
                <Button variant="outline" onClick={this.handleGoHome} className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  Volver al inicio
                </Button>
              </div>

              {/* Información adicional */}
              <div className="text-center text-sm text-muted-foreground">
                <p>Si el problema persiste, intenta:</p>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>• Recargar la página</li>
                  <li>• Limpiar caché del navegador</li>
                  <li>• Verificar tu conexión a internet</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Si no hay error, renderiza los children normalmente
    return this.props.children;
  }
}

// Hook para usar en componentes funcionales
export const withErrorBoundary = <P extends object>(Component: React.ComponentType<P>, fallback?: ReactNode) => {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};
