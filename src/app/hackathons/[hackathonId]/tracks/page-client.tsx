"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Brain,
  Link as LinkIcon,
  Wrench,
  Heart,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHackathon } from "@/hooks/use-hackathons";
import { cn, formatCurrency } from "@/lib/utils";

const trackIcons: Record<string, React.ElementType> = {
  brain: Brain,
  link: LinkIcon,
  wrench: Wrench,
  heart: Heart,
};

export default function HackathonTracksPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;

  const { data: hackathonData, isLoading } = useHackathon(hackathonId);
  const hackathon = hackathonData?.data;

  const [expandedTrack, setExpandedTrack] = React.useState<string | null>(null);

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
              <Link href="/hackathons">Browse Hackathons</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const toggleExpand = (trackId: string) => {
    setExpandedTrack((prev) => (prev === trackId ? null : trackId));
  };

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
            className="mb-8"
          >
            <h1 className="font-display text-4xl font-bold mb-2">Tracks</h1>
            <p className="text-muted-foreground text-lg">
              {hackathon.tracks.length} track
              {hackathon.tracks.length !== 1 ? "s" : ""} available for{" "}
              {hackathon.name}
            </p>
          </motion.div>

          {/* Tracks Grid */}
          {hackathon.tracks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-display text-lg font-bold mb-1">
                No tracks defined yet
              </h3>
              <p className="text-sm text-muted-foreground">
                Tracks will be announced soon.
              </p>
            </motion.div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-6">
              {hackathon.tracks.map((track, i) => {
                const isExpanded = expandedTrack === track.id;
                const IconComponent = trackIcons[track.icon || ""] || Trophy;

                return (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card
                      className={cn(
                        "h-full transition-shadow",
                        isExpanded && "shadow-md ring-1 ring-primary/20"
                      )}
                    >
                      <CardContent className="p-6">
                        {/* Track Header */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <IconComponent className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display text-xl font-bold">
                              {track.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {track.description}
                            </p>
                          </div>
                        </div>

                        {/* Sponsor */}
                        {track.sponsor && (
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-xs text-muted-foreground">
                              Sponsored by
                            </span>
                            <Badge variant="outline">{track.sponsor.name}</Badge>
                          </div>
                        )}

                        {/* Prizes */}
                        {track.prizes.length > 0 && (
                          <div className="space-y-2 mb-4">
                            <h4 className="text-sm font-medium">Track Prizes</h4>
                            {track.prizes.map((prize) => (
                              <div
                                key={prize.id}
                                className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-muted/50"
                              >
                                <div className="flex items-center gap-2">
                                  <Trophy
                                    className={cn(
                                      "h-4 w-4",
                                      prize.place === 1
                                        ? "text-amber-500"
                                        : prize.place === 2
                                          ? "text-gray-400"
                                          : "text-orange-600"
                                    )}
                                  />
                                  <span>{prize.name}</span>
                                </div>
                                <span className="font-bold">
                                  {formatCurrency(prize.value, prize.currency)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Expand/Collapse Toggle */}
                        <button
                          onClick={() => toggleExpand(track.id)}
                          className="flex items-center gap-1.5 text-sm text-primary hover:underline mt-2"
                        >
                          {isExpanded ? "Hide details" : "Show details"}
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mt-4 pt-4 border-t space-y-4"
                          >
                            {/* Requirements */}
                            {track.requirements && track.requirements.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-2">
                                  Requirements
                                </h4>
                                <ul className="space-y-1.5">
                                  {track.requirements.map((req, ri) => (
                                    <li
                                      key={ri}
                                      className="flex items-center gap-2 text-sm text-muted-foreground"
                                    >
                                      <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                                      {req}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Suggested Tech */}
                            {track.suggestedTech &&
                              track.suggestedTech.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium mb-2">
                                    Suggested Technologies
                                  </h4>
                                  <div className="flex flex-wrap gap-1.5">
                                    {track.suggestedTech.map((tech) => (
                                      <Badge
                                        key={tech}
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {tech}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
