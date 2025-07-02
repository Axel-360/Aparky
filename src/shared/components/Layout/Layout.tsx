// src/shared/components/Layout/Layout.tsx
import React from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary/ErrorBoundary";
import Header from "@/shared/components/Header/Header";
import { useTheme } from "@/shared/ui/theme-provider";

interface LayoutProps {
  children: ReactNode;
  className?: string;
  headerProps: {
    currentView: "map" | "proximity";
    onViewChange: (view: "map" | "proximity") => void;
    onShowStats: () => void;
    onShowSettings: () => void;
  };
  sidebar?: ReactNode;
  showFooter?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, className, headerProps, sidebar, showFooter = true }) => {
  const { theme } = useTheme();

  // Función para obtener el texto del tema actual
  const getThemeDisplayText = () => {
    switch (theme) {
      case "light":
        return "☀️ Modo Claro";
      case "dark":
        return "🌙 Modo Oscuro";
      case "system":
        // Detectar si el sistema está en modo oscuro
        const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        return `🖥️ Modo Sistema (${isSystemDark ? "Oscuro" : "Claro"})`;
      default:
        return "🌙 Modo Oscuro";
    }
  };

  return (
    <div className={cn("min-h-screen bg-background text-foreground transition-colors duration-300", className)}>
      {/* Header */}
      <ErrorBoundary>
        <Header {...headerProps} />
      </ErrorBoundary>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {sidebar ? (
          // Layout con sidebar (tu estructura actual)
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar izquierdo */}
            <aside className="lg:col-span-4 space-y-6">
              <ErrorBoundary>{sidebar}</ErrorBoundary>
            </aside>

            {/* Contenido principal */}
            <main className="lg:col-span-8 space-y-6">
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
          </div>
        ) : (
          // Layout sin sidebar (para futuras páginas)
          <div className="max-w-4xl mx-auto">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        )}
      </main>

      {/* Footer */}
      {showFooter && (
        <footer className="bg-muted/30 border-t mt-12">
          <div className="container mx-auto max-w-7xl px-4 py-8">
            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground">Creado con ❤️ por David Rovira</p>
              <div className="flex justify-center items-center gap-4 text-xs text-muted-foreground">
                <span>🚗 Aparky</span>
                <span>•</span>
                <span>📱 Aplicación Web</span>
                <span>•</span>
                <span>{getThemeDisplayText()}</span>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

// Layout específico para la página principal (con sidebar)
export const MainLayout: React.FC<{
  children: ReactNode;
  sidebar: ReactNode;
  headerProps: LayoutProps["headerProps"];
  className?: string;
}> = ({ children, sidebar, headerProps, className }) => {
  return (
    <Layout className={className} headerProps={headerProps} sidebar={sidebar}>
      {children}
    </Layout>
  );
};
