"use client";

import { cn } from "@/lib/utils";

interface SkeletonBaseProps {
  className?: string;
}

function SkeletonBlock({ className }: SkeletonBaseProps) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-muted", className)}
    />
  );
}

export function SkeletonCard({ className }: SkeletonBaseProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card overflow-hidden",
        className
      )}
    >
      {/* Image area */}
      <SkeletonBlock className="h-48 w-full rounded-none" />

      {/* Content area */}
      <div className="p-4 space-y-3">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function SkeletonTable({ className }: SkeletonBaseProps) {
  return (
    <div className={cn("w-full space-y-3", className)}>
      {/* Header row */}
      <div className="flex gap-4 pb-3 border-b">
        <SkeletonBlock className="h-4 w-1/4" />
        <SkeletonBlock className="h-4 w-1/4" />
        <SkeletonBlock className="h-4 w-1/4" />
        <SkeletonBlock className="h-4 w-1/4" />
      </div>

      {/* Data rows */}
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex gap-4 py-2">
          <SkeletonBlock className="h-4 w-1/4" />
          <SkeletonBlock className="h-4 w-1/4" />
          <SkeletonBlock className="h-4 w-1/4" />
          <SkeletonBlock className="h-4 w-1/4" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonProfile({ className }: SkeletonBaseProps) {
  return (
    <div className={cn("flex items-start gap-4", className)}>
      {/* Avatar circle */}
      <SkeletonBlock className="h-16 w-16 rounded-full shrink-0" />

      {/* Text lines */}
      <div className="flex-1 space-y-3 pt-1">
        <SkeletonBlock className="h-5 w-1/3" />
        <SkeletonBlock className="h-3 w-2/3" />
        <SkeletonBlock className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonText({ className }: SkeletonBaseProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-[90%]" />
      <SkeletonBlock className="h-4 w-3/4" />
      <SkeletonBlock className="h-4 w-1/2" />
    </div>
  );
}
