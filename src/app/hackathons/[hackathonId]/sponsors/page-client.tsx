"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy,
  ArrowLeft,
  ExternalLink,
  Heart,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { mockSponsors } from "@/lib/mock-data";
import { useHackathon } from "@/hooks/use-hackathons";
import { cn, getInitials, safeHref } from "@/lib/utils";
import type { Sponsor } from "@/lib/types";
import {
  compareSponsorTiers,
  distinctSponsorTiers,
  normalizeSponsorTier,
  sponsorTierGradientClass,
  sponsorTierHeading,
} from "@/lib/sponsor-tiers";

// Per-tier layout configuration. Known presets get bespoke density; any
// custom tier (e.g. "Title Sponsor") falls through to the default config.
interface TierConfig {
  gridClass: string;
  cardPadding: string;
  avatarSize: string;
  textSize: string;
  showDescription: boolean;
  // When false, the external website link is hidden (used for "community" where
  // logos-only treatment keeps the grid compact).
  showWebsite: boolean;
}

const DEFAULT_TIER_CONFIG: TierConfig = {
  gridClass: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  cardPadding: "p-4",
  avatarSize: "h-12 w-12 text-lg",
  textSize: "text-base",
  showDescription: false,
  showWebsite: true,
};

const TIER_CONFIG: Record<string, TierConfig> = {
  platinum: {
    gridClass: "grid-cols-1 sm:grid-cols-2",
    cardPadding: "p-8",
    avatarSize: "h-20 w-20 text-3xl",
    textSize: "text-xl",
    showDescription: true,
    showWebsite: true,
  },
  gold: {
    gridClass: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    cardPadding: "p-6",
    avatarSize: "h-16 w-16 text-2xl",
    textSize: "text-lg",
    showDescription: true,
    showWebsite: true,
  },
  silver: {
    gridClass: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    cardPadding: "p-4",
    avatarSize: "h-12 w-12 text-lg",
    textSize: "text-base",
    showDescription: false,
    showWebsite: true,
  },
  bronze: {
    gridClass: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    cardPadding: "p-4",
    avatarSize: "h-12 w-12 text-lg",
    textSize: "text-base",
    showDescription: false,
    showWebsite: true,
  },
  community: {
    gridClass: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6",
    cardPadding: "p-3",
    avatarSize: "h-10 w-10 text-sm",
    textSize: "text-sm",
    showDescription: false,
    showWebsite: false,
  },
};

export default function HackathonSponsorsPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;

  const { data: hackathonData, isLoading } = useHackathon(hackathonId);
  const hackathon = hackathonData?.data;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="shimmer rounded-xl h-96 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16 text-center">
          <div className="mx-auto max-w-md">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h1 className="font-display text-3xl font-bold mb-2">
              Hackathon Not Found
            </h1>
            <p className="text-muted-foreground mb-6">
              The hackathon you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Button asChild>
              <Link href="/hackathons">Browse Competitions</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Use hackathon sponsors + fill in with mockSponsors for a fuller display
  const allSponsors: Sponsor[] = [
    ...hackathon.sponsors,
    ...mockSponsors.filter(
      (s) => !hackathon.sponsors.find((hs) => hs.id === s.id)
    ),
  ];

  // Tiers actually present in the data — presets first, then any custom ones.
  const tiersPresent = distinctSponsorTiers(allSponsors);

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link
              href={`/hackathons/${hackathonId}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {hackathon.name}
            </Link>
          </motion.div>

          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <h1 className="font-display text-4xl font-bold mb-2">Sponsors</h1>
            <p className="text-muted-foreground text-lg">
              {hackathon.name} is made possible by these amazing sponsors and
              partners
            </p>
          </motion.div>

          {/* Tiered Layout */}
          <div className="space-y-12">
            {tiersPresent.map((tier, ti) => {
              const sponsors = allSponsors.filter(
                (s) => normalizeSponsorTier(s.tier) === tier
              );
              if (sponsors.length === 0) return null;

              const config =
                TIER_CONFIG[tier] ?? DEFAULT_TIER_CONFIG;
              const gradientClass = sponsorTierGradientClass(tier);

              return (
                <motion.div
                  key={tier}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: ti * 0.1 }}
                >
                  {/* Tier Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center",
                        gradientClass
                      )}
                    >
                      <Heart className="h-4 w-4" />
                    </div>
                    <h2 className="font-display text-2xl font-bold">
                      {sponsorTierHeading(tier)}
                    </h2>
                  </div>

                  {/* Sponsor Cards */}
                  <div className={cn("grid gap-4", config.gridClass)}>
                    {sponsors
                      .slice()
                      .sort((a, b) =>
                        compareSponsorTiers(a.tier, b.tier)
                      )
                      .map((sponsor, si) => (
                        <motion.div
                          key={sponsor.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: ti * 0.1 + si * 0.05 }}
                        >
                          <Card className="h-full hover:shadow-md transition-shadow">
                            <CardContent
                              className={cn(
                                "flex flex-col items-center text-center",
                                config.cardPadding
                              )}
                            >
                              {/* Logo Placeholder (colored circle with initial) */}
                              <div
                                className={cn(
                                  "rounded-full flex items-center justify-center font-bold mb-3",
                                  config.avatarSize,
                                  gradientClass
                                )}
                              >
                                {getInitials(sponsor.name).charAt(0)}
                              </div>

                              {/* Name */}
                              <p
                                className={cn(
                                  "font-display font-bold",
                                  config.textSize
                                )}
                              >
                                {sponsor.name}
                              </p>

                              {/* Description (only for larger tiers) */}
                              {config.showDescription && sponsor.description && (
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                  {sponsor.description}
                                </p>
                              )}

                              {/* Website Link */}
                              {sponsor.website && config.showWebsite && (
                                <a
                                  href={safeHref(sponsor.website)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-3"
                                >
                                  Visit Website
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
