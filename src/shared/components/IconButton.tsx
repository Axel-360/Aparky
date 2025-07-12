// src/shared/components/IconButton.tsx
import React from "react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface IconButtonProps {
  icon: LucideIcon;
  onClick?: (e: React.MouseEvent) => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
  "aria-label"?: string;
  children?: React.ReactNode;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  onClick,
  variant = "ghost",
  size = "sm",
  className,
  disabled,
  loading,
  tooltip,
  "aria-label": ariaLabel,
  children,
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn("flex items-center gap-2", className)}
      title={tooltip}
      aria-label={ariaLabel || tooltip}
    >
      <Icon className={cn("h-4 w-4", loading && "animate-spin")} />
      {children}
    </Button>
  );
};
