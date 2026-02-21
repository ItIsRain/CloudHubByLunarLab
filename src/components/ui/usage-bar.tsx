"use client";

import { cn } from "@/lib/utils";

interface UsageBarProps {
  used: number;
  limit: number; // -1 = unlimited
  label: string;
  className?: string;
}

export function UsageBar({ used, limit, label, className }: UsageBarProps) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 100 : limit === 0 ? 100 : Math.min((used / limit) * 100, 100);
  const isAtLimit = !isUnlimited && used >= limit;
  const isNearLimit = !isUnlimited && !isAtLimit && percentage >= 70;

  const barColor = isUnlimited
    ? "bg-emerald-500/30"
    : isAtLimit
      ? "bg-red-500"
      : isNearLimit
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {isUnlimited ? (
            <span className="flex items-center gap-1">
              {used}
              <span className="text-muted-foreground">/</span>
              <span className="text-emerald-500">∞</span>
            </span>
          ) : (
            <span className={cn(isAtLimit && "text-red-500", isNearLimit && "text-amber-500")}>
              {used}
              <span className="text-muted-foreground"> / {limit}</span>
            </span>
          )}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
