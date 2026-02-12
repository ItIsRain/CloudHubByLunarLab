"use client";

import * as React from "react";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineItem {
  title: string;
  description?: string;
  date?: string;
  icon?: React.ElementType;
  status?: "completed" | "active" | "pending";
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

const statusDotClasses = {
  completed:
    "bg-emerald-500 text-white border-emerald-500",
  active:
    "bg-background text-primary border-primary ring-4 ring-primary/20",
  pending:
    "bg-background text-muted-foreground border-muted-foreground/30",
};

const statusLineClasses = {
  completed: "bg-emerald-500",
  active: "bg-primary/30",
  pending: "bg-muted-foreground/20",
};

export function Timeline({ items, className }: TimelineProps) {
  return (
    <div className={cn("relative", className)}>
      {items.map((item, index) => {
        const status = item.status ?? "pending";
        const Icon = item.icon;

        return (
          <div key={index} className="relative flex gap-4 pb-8 last:pb-0">
            {/* Connecting line */}
            {index < items.length - 1 && (
              <div
                className={cn(
                  "absolute left-[17px] top-9 w-0.5 bottom-0",
                  statusLineClasses[status]
                )}
              />
            )}

            {/* Dot / Icon */}
            <div
              className={cn(
                "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                statusDotClasses[status]
              )}
            >
              {Icon ? (
                <Icon className="h-4 w-4" />
              ) : status === "completed" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Circle className="h-3 w-3 fill-current" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
              <div className="flex items-center justify-between gap-2">
                <h4
                  className={cn(
                    "text-sm font-semibold",
                    status === "pending"
                      ? "text-muted-foreground"
                      : "text-foreground"
                  )}
                >
                  {item.title}
                </h4>
                {item.date && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {item.date}
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
