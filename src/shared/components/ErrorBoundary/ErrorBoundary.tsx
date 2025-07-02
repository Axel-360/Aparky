// src/shared/components/ErrorBoundary/ErrorBoundary.tsx
import React, { Component } from "react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Alert, AlertDescription } from "@/shared/ui";
import { AlertTriangle, RefreshCw, Home, FileText } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Actualiza el state para que el siguiente renderizado muestre la UI de error
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log del error
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Actualizar el estado con la información del error
    this.setState({
      error,
      errorInfo,
    });

    // Llamar al callback de error si se proporciona
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Enviar error a servicio de monitoreo (si está configurado)
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Aquí podrías enviar el error a un servicio como Sentry, LogRocket, etc.
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorId: this.state.errorId,
    };

    // En desarrollo, mostrar en consola
    if (process.env.NODE_ENV === "development") {
      console.group("🚨 Error Report");
      console.error("Error:", error);
      console.error("Error Info:", errorInfo);
      console.error("Full Report:", errorReport);
      console.groupEnd();
    }

    // Aquí podrías enviar a tu servicio de logging
    // sendToErrorService(errorReport);
  };

  private handleRetry = () => {
    // Resetear el estado del error
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
    });
  };

  private handleGoHome = () => {
    // Navegar al inicio y resetear
    window.location.href = "/";
  };

  private handleReportIssue = () => {
    // Crear reporte para el usuario
    const reportData = {
      error: this.state.error?.message,
      timestamp: new Date().toISOString(),
      errorId: this.state.errorId,
      userAgent: navigator.userAgent,
    };

    const emailBody = encodeURIComponent(
      `Hola,\n\nEncontré un error en la aplicación Aparky:\n\n` +
        `Error ID: ${reportData.errorId}\n` +
        `Timestamp: ${reportData.timestamp}\n` +
        `Error: ${reportData.error}\n` +
        `Navegador: ${reportData.userAgent}\n\n` +
        `Por favor, ayúdame a resolverlo.\n\nGracias!`
    );

    window.open(`mailto:support@aparky.app?subject=Error Report - ${reportData.errorId}&body=${emailBody}`);
  };

  render() {
    // Si hay un error, mostrar la UI de error
    if (this.state.hasError) {
      // Si se proporciona un fallback personalizado, usarlo
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI de error por defecto
      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-lg mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-xl">¡Algo salió mal!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Se produjo un error inesperado. No te preocupes, tus datos están seguros.
                </AlertDescription>
              </Alert>

              {/* Información del error en desarrollo */}
              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="bg-muted p-3 rounded-md text-sm">
                  <summary className="cursor-pointer font-medium mb-2">Detalles técnicos (desarrollo)</summary>
                  <div className="space-y-2 text-xs">
                    <div>
                      <strong>Error:</strong>
                      <pre className="mt-1 whitespace-pre-wrap break-words">{this.state.error.toString()}</pre>
                    </div>
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="mt-1 whitespace-pre-wrap break-words text-[10px]">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                    <div>
                      <strong>Error ID:</strong> {this.state.errorId}
                    </div>
                  </div>
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
                <Button variant="ghost" onClick={this.handleReportIssue} className="w-full text-sm">
                  <FileText className="mr-2 h-4 w-4" />
                  Reportar problema
                </Button>
              </div>

              {/* Información adicional */}
              <div className="text-center text-sm text-muted-foreground">
                <p>Si el problema persiste, intenta:</p>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>• Recargar la página (Ctrl+F5)</li>
                  <li>• Limpiar caché del navegador</li>
                  <li>• Verificar tu conexión a internet</li>
                  <li>• Actualizar el navegador</li>
                </ul>
              </div>

              {/* Error ID para soporte */}
              {this.state.errorId && (
                <div className="bg-muted p-2 rounded text-center">
                  <p className="text-xs text-muted-foreground">
                    ID del error: <code className="font-mono">{this.state.errorId}</code>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    // Si no hay error, renderiza los children normalmente
    return this.props.children;
  }
}

// HOC para usar en componentes funcionales
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
) => {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};

// Hook para trigger manual de errores (útil para testing)
export const useErrorHandler = () => {
  return (error: Error) => {
    throw error;
  };
};
