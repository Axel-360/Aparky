// src/shared/components/StatusBadge.tsx
import React from "react";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type StatusType = "success" | "warning" | "error" | "info" | "neutral";

interface StatusBadgeProps {
  status: StatusType;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "default" | "lg";
}

const statusStyles: Record<StatusType, string> = {
  success: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300",
  error: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-300",
  info: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-300",
  neutral: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-300",
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  icon: Icon,
  children,
  className,
  size = "default",
}) => {
  return (
    <Badge
      variant="outline"
      className={cn(
        statusStyles[status],
        size === "sm" && "text-xs px-2 py-0.5",
        size === "lg" && "text-sm px-3 py-1",
        "flex items-center gap-1",
        className
      )}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </Badge>
  );
};
