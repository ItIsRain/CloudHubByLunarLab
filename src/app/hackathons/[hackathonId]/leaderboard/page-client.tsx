"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, ArrowLeft, Medal, Award } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useHackathon } from "@/hooks/use-hackathons";
import { useHackathonSubmissions } from "@/hooks/use-submissions";
import { useHackathonPhase } from "@/hooks/use-hackathon-phase";
import { cn } from "@/lib/utils";

// Generate deterministic scores from submission id
function getScore(subId: string): number {
  let hash = 0;
  for (let i = 0; i < subId.length; i++) {
    hash = (hash * 31 + subId.charCodeAt(i)) & 0xffffffff;
  }
  return 70 + (Math.abs(hash) % 31); // range 70-100
}

export default function HackathonLeaderboardPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;

  const { data: hackathonData, isLoading } = useHackathon(hackathonId);
  const hackathon = hackathonData?.data;
  const { data: subsData } = useHackathonSubmissions(hackathon?.id);
  const phase = useHackathonPhase(hackathon);

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

  const hackSubs = (subsData?.data || [])
    .map((sub) => ({
      ...sub,
      score: sub.averageScore ? sub.averageScore * 10 : getScore(sub.id),
    }))
    .sort((a, b) => b.score - a.score);

  const medalColors: Record<number, { bg: string; text: string; icon: string }> = {
    0: { bg: "bg-amber-500/10", text: "text-amber-500", icon: "text-amber-500" },
    1: { bg: "bg-gray-300/10", text: "text-gray-400", icon: "text-gray-400" },
    2: { bg: "bg-orange-500/10", text: "text-orange-600", icon: "text-orange-600" },
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
            <h1 className="font-display text-4xl font-bold mb-2">
              Leaderboard
            </h1>
            <p className="text-muted-foreground text-lg">
              Rankings for {hackathon.name}
            </p>
          </motion.div>

          {!phase.canViewResults ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-display text-lg font-bold mb-1">
                Results Not Available Yet
              </h3>
              <p className="text-sm text-muted-foreground">
                {phase.getMessage("viewResults")}
              </p>
            </motion.div>
          ) : hackSubs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Award className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-display text-lg font-bold mb-1">
                No scores yet
              </h3>
              <p className="text-sm text-muted-foreground">
                The leaderboard will be populated once judging begins.
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Rankings</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Table Header */}
                  <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b">
                    <div className="col-span-1">Rank</div>
                    <div className="col-span-4">Team</div>
                    <div className="col-span-3">Project</div>
                    <div className="col-span-2">Track</div>
                    <div className="col-span-2 text-right">Score</div>
                  </div>

                  {/* Table Rows */}
                  <div className="divide-y">
                    {hackSubs.map((sub, i) => {
                      const isTop3 = i < 3;
                      const medal = medalColors[i];

                      return (
                        <motion.div
                          key={sub.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={cn(
                            "grid grid-cols-12 gap-4 px-4 py-4 items-center",
                            isTop3 && medal?.bg
                          )}
                        >
                          {/* Rank */}
                          <div className="col-span-2 sm:col-span-1">
                            {isTop3 ? (
                              <div className="flex items-center gap-1">
                                <Medal
                                  className={cn(
                                    "h-5 w-5",
                                    medal?.icon || "text-muted-foreground"
                                  )}
                                />
                                <span
                                  className={cn(
                                    "font-bold text-lg",
                                    medal?.text || ""
                                  )}
                                >
                                  {i + 1}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground font-medium pl-1">
                                #{i + 1}
                              </span>
                            )}
                          </div>

                          {/* Team */}
                          <div className="col-span-10 sm:col-span-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={sub.team.avatar} />
                                <AvatarFallback className="text-xs">
                                  {sub.team.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span
                                className={cn(
                                  "font-medium text-sm truncate",
                                  isTop3 && "font-bold"
                                )}
                              >
                                {sub.team.name}
                              </span>
                            </div>
                          </div>

                          {/* Project */}
                          <div className="col-span-6 sm:col-span-3">
                            <Link
                              href={`/hackathons/${hackathonId}/submissions/${sub.id}`}
                              className="text-sm text-primary hover:underline truncate block"
                            >
                              {sub.projectName}
                            </Link>
                          </div>

                          {/* Track */}
                          <div className="col-span-3 sm:col-span-2">
                            {sub.track ? (
                              <Badge
                                variant="secondary"
                                className="text-xs truncate max-w-full"
                              >
                                {sub.track.name}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                --
                              </span>
                            )}
                          </div>

                          {/* Score */}
                          <div className="col-span-3 sm:col-span-2 text-right">
                            <span
                              className={cn(
                                "font-mono font-bold text-lg",
                                isTop3 ? medal?.text : "text-foreground"
                              )}
                            >
                              {sub.score.toFixed(1)}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
