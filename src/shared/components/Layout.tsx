// src/shared/components/Layout.tsx
import React from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import Header from "@/shared/components/Header";
import { useTheme } from "@/shared/ui/theme-provider";
import { Car, Smartphone, Heart, Sun, Moon, Monitor } from "lucide-react";

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

  const getThemeDisplayText = () => {
    switch (theme) {
      case "light":
        return (
          <span className="flex items-center gap-1">
            <Sun className="w-3 h-3" />
            Modo Claro
          </span>
        );
      case "dark":
        return (
          <span className="flex items-center gap-1">
            <Moon className="w-3 h-3" />
            Modo Oscuro
          </span>
        );
      case "system":
        const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        return (
          <span className="flex items-center gap-1">
            <Monitor className="w-3 h-3" />
            Modo Sistema ({isSystemDark ? "Oscuro" : "Claro"})
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1">
            <Moon className="w-3 h-3" />
            Modo Oscuro
          </span>
        );
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar izquierdo */}
            <aside className="lg:col-span-4 space-y-6">
              <ErrorBoundary>{sidebar}</ErrorBoundary>
            </aside>

            {/* Contenido principal */}
            <section className="lg:col-span-8 space-y-6">
              <ErrorBoundary>{children}</ErrorBoundary>
            </section>
          </div>
        ) : (
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
              <p className="text-xs text-muted-foreground">
                Creado con <Heart className="w-4 h-4 inline mr-1 text-red-500" />
                por David Rovira
              </p>
              <div className="flex justify-center items-center gap-4 text-xs text-muted-foreground">
                <span>
                  <Car className="w-4 h-4 inline mr-1" />
                  Aparky
                </span>
                <span>•</span>
                <span>
                  <Smartphone className="w-4 h-4 inline mr-1" />
                  Aplicación Web
                </span>
                <span>•</span>
                <span>{getThemeDisplayText()}</span>
              </div>
              <div className="flex justify-center items-center gap-2 text-[10px] text-muted-foreground/80">
                <span>v1.0.0</span>
                <span>•</span>
                <span>PWA</span>
                <span>•</span>
                <span>Funciona sin conexión</span>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

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

export const SimpleLayout: React.FC<{
  children: ReactNode;
  headerProps: LayoutProps["headerProps"];
  className?: string;
  showFooter?: boolean;
}> = ({ children, headerProps, className, showFooter = true }) => {
  return (
    <Layout className={className} headerProps={headerProps} showFooter={showFooter}>
      {children}
    </Layout>
  );
};

export const ModalLayout: React.FC<{
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}> = ({ children, title, description, className }) => {
  return (
    <div className={cn("min-h-screen bg-background text-foreground", className)}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {(title || description) && (
          <div className="text-center mb-8">
            {title && <h1 className="text-3xl font-bold mb-2">{title}</h1>}
            {description && <p className="text-muted-foreground">{description}</p>}
          </div>
        )}
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </div>
  );
};
