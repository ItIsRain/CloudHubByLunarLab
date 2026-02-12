"use client";

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Sponsor } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface SponsorCardProps {
  sponsor: Sponsor;
  className?: string;
}

const tierColors: Record<string, string> = {
  platinum: "border-violet-400/60",
  gold: "border-amber-400/60",
  silver: "border-zinc-400/60",
  bronze: "border-orange-700/40",
  community: "border-border",
};

const tierBadgeVariant: Record<
  string,
  "default" | "secondary" | "warning" | "muted" | "outline"
> = {
  platinum: "default",
  gold: "warning",
  silver: "secondary",
  bronze: "muted",
  community: "outline",
};

const logoColors: Record<string, string> = {
  platinum: "bg-violet-500/20 text-violet-500",
  gold: "bg-amber-500/20 text-amber-500",
  silver: "bg-zinc-400/20 text-zinc-500",
  bronze: "bg-orange-700/20 text-orange-700",
  community: "bg-muted text-muted-foreground",
};

export function SponsorCard({ sponsor, className }: SponsorCardProps) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Card
        className={cn(
          "overflow-hidden border-2 transition-shadow duration-300 hover:shadow-lg",
          tierColors[sponsor.tier] ?? "border-border",
          className
        )}
      >
        <CardHeader className="flex flex-row items-center gap-4 pb-3">
          {/* Logo placeholder (colored circle with initial) */}
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl font-display text-xl font-bold",
              logoColors[sponsor.tier] ?? "bg-muted text-muted-foreground"
            )}
          >
            {sponsor.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-bold text-lg truncate">
              {sponsor.name}
            </h3>
            <Badge
              variant={tierBadgeVariant[sponsor.tier] ?? "muted"}
              className="text-xs capitalize mt-1"
            >
              {sponsor.tier}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {sponsor.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {sponsor.description}
            </p>
          )}

          {sponsor.website && (
            <a
              href={sponsor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Visit website
            </a>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
