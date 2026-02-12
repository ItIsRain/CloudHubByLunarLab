"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down";
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  change,
  trend,
  className,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>

            {change !== undefined && trend && (
              <div
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                  trend === "up"
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-red-500/10 text-red-500"
                )}
              >
                {trend === "up" ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(change)}%
              </div>
            )}
          </div>

          <div className="mt-4">
            <p className="font-display text-3xl font-bold tracking-tight">
              {value}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{label}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
