"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Shield,
  ScrollText,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHackathon } from "@/hooks/use-hackathons";
import { cn, formatDate, formatCurrency } from "@/lib/utils";

const phases = [
  { key: "registration", label: "Registration" },
  { key: "kickoff", label: "Kickoff" },
  { key: "hacking", label: "Hacking" },
  { key: "submission", label: "Submission" },
  { key: "judging", label: "Judging" },
  { key: "winners", label: "Winners" },
];

function getPhaseIndex(status: string): number {
  switch (status) {
    case "registration-open":
      return 0;
    case "registration-closed":
      return 1;
    case "hacking":
      return 2;
    case "submission":
      return 3;
    case "judging":
      return 4;
    case "completed":
      return 5;
    default:
      return -1;
  }
}

export default function HackathonOverviewPage() {
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
              <Link href="/hackathons">Browse Hackathons</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const currentPhaseIndex = getPhaseIndex(hackathon.status);

  const timeline = [
    { label: "Registration Opens", date: hackathon.registrationStart },
    { label: "Registration Closes", date: hackathon.registrationEnd },
    { label: "Hacking Starts", date: hackathon.hackingStart },
    { label: "Submission Deadline", date: hackathon.submissionDeadline },
    { label: "Judging Begins", date: hackathon.judgingStart },
    { label: "Winners Announced", date: hackathon.winnersAnnouncement },
  ];

  const topPrizes = hackathon.prizes
    .filter((p) => typeof p.place === "number" && p.place <= 3)
    .sort((a, b) => (a.place as number) - (b.place as number));

  const trophyColors: Record<number, string> = {
    1: "text-amber-500",
    2: "text-gray-400",
    3: "text-orange-600",
  };
  const borderColors: Record<number, string> = {
    1: "border-amber-500 bg-amber-500/5",
    2: "border-gray-400 bg-gray-400/5",
    3: "border-orange-600 bg-orange-600/5",
  };
  const placeLabels: Record<number, string> = {
    1: "1st Place",
    2: "2nd Place",
    3: "3rd Place",
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
            <h1 className="font-display text-4xl font-bold mb-2">Overview</h1>
            <p className="text-muted-foreground text-lg">
              Everything you need to know about {hackathon.name}
            </p>
          </motion.div>

          <div className="space-y-8">
            {/* About Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:my-1 [&_p:empty]:hidden"
                    dangerouslySetInnerHTML={{ __html: hackathon.description }}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Timeline Stepper */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Horizontal stepper for desktop */}
                  <div className="hidden md:block">
                    <div className="flex items-center justify-between relative">
                      {/* Connecting line */}
                      <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted" />
                      <div
                        className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
                        style={{
                          width: `${currentPhaseIndex >= 0 ? (currentPhaseIndex / (phases.length - 1)) * 100 : 0}%`,
                        }}
                      />

                      {phases.map((phase, i) => {
                        const isPast = i < currentPhaseIndex;
                        const isCurrent = i === currentPhaseIndex;
                        const isFuture = i > currentPhaseIndex;

                        return (
                          <div
                            key={phase.key}
                            className="flex flex-col items-center relative z-10"
                          >
                            <div
                              className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all",
                                isPast &&
                                  "bg-primary border-primary text-primary-foreground",
                                isCurrent &&
                                  "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20",
                                isFuture && "bg-background border-muted"
                              )}
                            >
                              {isPast ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : isCurrent ? (
                                <div className="h-3 w-3 rounded-full bg-white animate-pulse" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <span
                              className={cn(
                                "text-xs font-medium mt-2 text-center",
                                isCurrent
                                  ? "text-primary"
                                  : isPast
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                              )}
                            >
                              {phase.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-0.5">
                              {formatDate(timeline[i]?.date || "")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Vertical timeline for mobile */}
                  <div className="md:hidden space-y-4">
                    {timeline.map((item, i) => {
                      const isPast = new Date(item.date) < new Date();
                      return (
                        <div key={i} className="flex items-start gap-4">
                          <div className="flex flex-col items-center">
                            <div
                              className={cn(
                                "h-3 w-3 rounded-full",
                                isPast ? "bg-primary" : "bg-muted"
                              )}
                            />
                            {i < timeline.length - 1 && (
                              <div className="w-0.5 h-8 bg-muted mt-1" />
                            )}
                          </div>
                          <div className="flex-1 -mt-1">
                            <p className="text-sm font-medium">{item.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(item.date)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Prize Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    Prize Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-3 gap-6 mb-6">
                    {topPrizes.map((prize, i) => {
                      const place = prize.place as number;
                      return (
                        <motion.div
                          key={prize.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 + i * 0.05 }}
                          className={cn(
                            "p-6 rounded-xl border-2 text-center",
                            borderColors[place] || "border-muted"
                          )}
                        >
                          <Trophy
                            className={cn(
                              "h-10 w-10 mx-auto mb-3",
                              trophyColors[place] || "text-primary"
                            )}
                          />
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            {placeLabels[place] || prize.name}
                          </p>
                          <p className="font-display text-3xl font-bold">
                            {formatCurrency(prize.value, prize.currency)}
                          </p>
                          {prize.description && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {prize.description}
                            </p>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Special prizes */}
                  {hackathon.prizes.filter((p) => p.place === "special")
                    .length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-3">
                        Special Awards
                      </h4>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {hackathon.prizes
                          .filter((p) => p.place === "special")
                          .map((prize, i) => (
                            <motion.div
                              key={prize.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 + i * 0.05 }}
                              className="p-4 rounded-lg border text-center"
                            >
                              <p className="font-medium text-sm">
                                {prize.name}
                              </p>
                              <p className="font-display text-xl font-bold text-primary">
                                {prize.value > 0
                                  ? formatCurrency(prize.value, prize.currency)
                                  : prize.type === "incubation"
                                    ? "Incubation"
                                    : prize.type}
                              </p>
                              {prize.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {prize.description}
                                </p>
                              )}
                            </motion.div>
                          ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Eligibility */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Eligibility
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {hackathon.eligibility.map((item, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 + i * 0.05 }}
                        className="flex items-start gap-3"
                      >
                        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        <span
                          className="text-sm [&_p]:inline [&_ul]:hidden [&_ol]:hidden"
                          dangerouslySetInnerHTML={{ __html: item }}
                        />
                      </motion.li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
                    <Badge variant="outline">
                      Team size: {hackathon.minTeamSize}-{hackathon.maxTeamSize}
                    </Badge>
                    {hackathon.allowSolo && (
                      <Badge variant="secondary">Solo participation allowed</Badge>
                    )}
                    <Badge variant="outline">
                      {hackathon.type === "online"
                        ? "Online"
                        : hackathon.type === "hybrid"
                          ? "Hybrid"
                          : "In-person"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Rules */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ScrollText className="h-5 w-5 text-primary" />
                    Rules
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:my-1 [&_p:empty]:hidden"
                    dangerouslySetInnerHTML={{ __html: hackathon.rules }}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
