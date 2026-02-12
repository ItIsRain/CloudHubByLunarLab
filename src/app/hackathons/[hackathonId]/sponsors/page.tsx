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
import { mockHackathons, mockSponsors } from "@/lib/mock-data";
import { cn, getInitials } from "@/lib/utils";

const tierConfig: Record<
  string,
  {
    label: string;
    gridClass: string;
    cardPadding: string;
    avatarSize: string;
    textSize: string;
    showDescription: boolean;
    showLogo: boolean;
  }
> = {
  platinum: {
    label: "Platinum Sponsors",
    gridClass: "grid-cols-1 sm:grid-cols-2",
    cardPadding: "p-8",
    avatarSize: "h-20 w-20 text-3xl",
    textSize: "text-xl",
    showDescription: true,
    showLogo: true,
  },
  gold: {
    label: "Gold Sponsors",
    gridClass: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    cardPadding: "p-6",
    avatarSize: "h-16 w-16 text-2xl",
    textSize: "text-lg",
    showDescription: true,
    showLogo: true,
  },
  silver: {
    label: "Silver Sponsors",
    gridClass: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    cardPadding: "p-4",
    avatarSize: "h-12 w-12 text-lg",
    textSize: "text-base",
    showDescription: false,
    showLogo: true,
  },
  bronze: {
    label: "Bronze Sponsors",
    gridClass: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    cardPadding: "p-4",
    avatarSize: "h-12 w-12 text-lg",
    textSize: "text-base",
    showDescription: false,
    showLogo: true,
  },
  community: {
    label: "Community Partners",
    gridClass: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6",
    cardPadding: "p-3",
    avatarSize: "h-10 w-10 text-sm",
    textSize: "text-sm",
    showDescription: false,
    showLogo: true,
  },
};

const tierColors: Record<string, string> = {
  platinum: "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800",
  gold: "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-900",
  silver: "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700",
  bronze: "bg-gradient-to-br from-orange-300 to-orange-500 text-orange-900",
  community: "bg-gradient-to-br from-primary/60 to-accent/60 text-white",
};

const tierOrder = ["platinum", "gold", "silver", "bronze", "community"] as const;

export default function HackathonSponsorsPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;

  const hackathon = mockHackathons.find(
    (h) => h.id === hackathonId || h.slug === hackathonId
  );

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
              <Link href="/hackathons">Browse Hackathons</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Use hackathon sponsors + fill in with mockSponsors for a fuller display
  const allSponsors = [
    ...hackathon.sponsors,
    ...mockSponsors.filter(
      (s) => !hackathon.sponsors.find((hs) => hs.id === s.id)
    ),
  ];

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
            {tierOrder.map((tier, ti) => {
              const sponsors = allSponsors.filter((s) => s.tier === tier);
              if (sponsors.length === 0) return null;

              const config = tierConfig[tier];

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
                        tierColors[tier]
                      )}
                    >
                      <Heart className="h-4 w-4" />
                    </div>
                    <h2 className="font-display text-2xl font-bold capitalize">
                      {config.label}
                    </h2>
                  </div>

                  {/* Sponsor Cards */}
                  <div className={cn("grid gap-4", config.gridClass)}>
                    {sponsors.map((sponsor, si) => (
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
                                tierColors[tier]
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
                            {sponsor.website && tier !== "community" && (
                              <a
                                href={sponsor.website}
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
