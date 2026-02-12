"use client";

import { cn } from "@/lib/utils";

interface LiveIndicatorProps {
  isLive?: boolean;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: {
    dot: "h-2 w-2",
    text: "text-xs",
    gap: "gap-1.5",
    ring: "ring-[3px]",
  },
  md: {
    dot: "h-2.5 w-2.5",
    text: "text-sm",
    gap: "gap-2",
    ring: "ring-4",
  },
  lg: {
    dot: "h-3 w-3",
    text: "text-base",
    gap: "gap-2.5",
    ring: "ring-4",
  },
};

export function LiveIndicator({
  isLive = true,
  label,
  size = "md",
  className,
}: LiveIndicatorProps) {
  const s = sizeClasses[size];
  const displayLabel = label ?? (isLive ? "LIVE" : "Offline");

  return (
    <div
      className={cn("inline-flex items-center", s.gap, className)}
    >
      <span className="relative inline-flex">
        <span
          className={cn(
            "rounded-full",
            s.dot,
            isLive ? "bg-red-500" : "bg-muted-foreground/50"
          )}
        />
        {isLive && (
          <span
            className={cn(
              "absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75"
            )}
          />
        )}
      </span>
      <span
        className={cn(
          "font-semibold tracking-wide",
          s.text,
          isLive ? "text-red-500" : "text-muted-foreground"
        )}
      >
        {displayLabel}
      </span>
    </div>
  );
}
