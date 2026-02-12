"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
};

const gapClasses = {
  sm: "gap-0.5",
  md: "gap-1",
  lg: "gap-1.5",
};

export function Rating({
  value,
  onChange,
  max = 5,
  size = "md",
  readOnly = false,
  className,
}: RatingProps) {
  const [hoveredValue, setHoveredValue] = React.useState<number | null>(null);

  const displayValue = hoveredValue ?? value;

  return (
    <div
      className={cn("inline-flex items-center", gapClasses[size], className)}
      onMouseLeave={() => {
        if (!readOnly) setHoveredValue(null);
      }}
    >
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= displayValue;

        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            className={cn(
              "transition-colors duration-150",
              readOnly
                ? "cursor-default"
                : "cursor-pointer hover:scale-110 active:scale-95 transition-transform"
            )}
            onClick={() => {
              if (!readOnly) onChange?.(starValue);
            }}
            onMouseEnter={() => {
              if (!readOnly) setHoveredValue(starValue);
            }}
          >
            <Star
              className={cn(
                sizeClasses[size],
                isFilled
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-transparent text-muted-foreground/40"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
