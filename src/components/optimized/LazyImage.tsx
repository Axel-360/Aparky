// src/components/optimized/LazyImage.tsx
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjI0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PC9zdmc+",
  className,
  onLoad,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { ref, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    triggerOnce: true,
  });

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div ref={ref} className={cn("relative overflow-hidden bg-muted", className)}>
      {!isIntersecting ? (
        <img src={placeholder} alt="" className="w-full h-full object-cover opacity-50" />
      ) : (
        <>
          {!hasError && (
            <img
              src={src}
              alt={alt}
              onLoad={handleLoad}
              onError={handleError}
              className={cn(
                "w-full h-full object-cover transition-opacity duration-300",
                isLoaded ? "opacity-100" : "opacity-0"
              )}
              {...props}
            />
          )}
          {!isLoaded && !hasError && (
            <img src={placeholder} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
          )}
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
              <span className="text-sm">Error al cargar imagen</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
