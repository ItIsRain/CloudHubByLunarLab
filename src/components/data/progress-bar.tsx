"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  color?: "primary" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  className?: string;
}

const colorClasses = {
  primary: "bg-primary",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
};

const trackSizeClasses = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = false,
  color = "primary",
  size = "md",
  animated = true,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn("w-full", className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-sm font-medium text-foreground">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="text-sm font-mono text-muted-foreground">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          "w-full rounded-full bg-muted overflow-hidden",
          trackSizeClasses[size]
        )}
      >
        {animated ? (
          <motion.div
            className={cn("h-full rounded-full", colorClasses[color])}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        ) : (
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              colorClasses[color]
            )}
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
    </div>
  );
}
