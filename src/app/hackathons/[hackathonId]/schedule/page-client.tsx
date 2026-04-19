"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy,
  ArrowLeft,
  Clock,
  MapPin,
  Flag,
  CheckCircle2,
  Circle,
  CalendarDays,
  Layers,
  Users,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHackathon } from "@/hooks/use-hackathons";
import { usePhases } from "@/hooks/use-phases";
import { cn, formatDate } from "@/lib/utils";
import type { CompetitionPhase } from "@/lib/types";

// ── Timeline entry type ─────────────────────────────────

interface TimelineEntry {
  id: string;
  label: string;
  date: string;
  endDate?: string;
  description?: string;
  isPhase: boolean;
  phaseType?: CompetitionPhase["phaseType"];
  status?: CompetitionPhase["status"];
  campusFilter?: string | null;
  reviewerCount?: number;
}

// ── Phase status styles ─────────────────────────────────

const phaseStatusStyles: Record<string, { badge: string; label: string }> = {
  draft: { badge: "bg-muted text-muted-foreground", label: "Upcoming" },
  active: { badge: "bg-green-500/10 text-green-600 border-green-500/20", label: "Active" },
  scoring: { badge: "bg-blue-500/10 text-blue-600 border-blue-500/20", label: "Scoring" },
  calibration: { badge: "bg-amber-500/10 text-amber-600 border-amber-500/20", label: "Calibration" },
  completed: { badge: "bg-primary/10 text-primary border-primary/20", label: "Completed" },
};

const phaseTypeLabels: Record<string, string> = {
  bootcamp: "Bootcamp",
  pitch: "Pitch Round",
  review: "Review",
  final: "Final Event",
  screening: "Screening",
};

// ── Main page component ─────────────────────────────────

export default function HackathonSchedulePage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;

  const { data: hackathonData, isLoading: hackathonLoading } = useHackathon(hackathonId);
  const { data: phasesData, isLoading: phasesLoading } = usePhases(hackathonId);

  const hackathon = hackathonData?.data;
  const phases = phasesData?.data ?? [];
  const isLoading = hackathonLoading || phasesLoading;

  // Build merged timeline (milestones + phases)
  const timeline = React.useMemo(() => {
    if (!hackathon) return [];

    const milestones: TimelineEntry[] = [
      hackathon.registrationStart && {
        id: "reg-open",
        label: "Registration Opens",
        date: hackathon.registrationStart,
        isPhase: false,
      },
      hackathon.registrationEnd && {
        id: "reg-close",
        label: "Registration Closes",
        date: hackathon.registrationEnd,
        isPhase: false,
      },
      hackathon.hackingStart && {
        id: "hack-start",
        label: "Competition Begins",
        date: hackathon.hackingStart,
        isPhase: false,
      },
      hackathon.submissionDeadline && {
        id: "sub-deadline",
        label: "Submission Deadline",
        date: hackathon.submissionDeadline,
        isPhase: false,
      },
      hackathon.judgingStart && {
        id: "judge-start",
        label: "Judging Begins",
        date: hackathon.judgingStart,
        isPhase: false,
      },
      hackathon.winnersAnnouncement && {
        id: "winners",
        label: "Winners Announced",
        date: hackathon.winnersAnnouncement,
        isPhase: false,
      },
    ].filter(Boolean) as TimelineEntry[];

    const phaseEntries: TimelineEntry[] = phases
      .filter((p) => p.startDate)
      .map((p) => ({
        id: p.id,
        label: p.name,
        date: p.startDate!,
        endDate: p.endDate ?? undefined,
        description: p.description,
        isPhase: true,
        phaseType: p.phaseType,
        status: p.status,
        campusFilter: p.campusFilter,
        reviewerCount: p.reviewerCount,
      }));

    return [...milestones, ...phaseEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [hackathon, phases]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-4">
            <div className="shimmer rounded-xl h-10 w-48" />
            <div className="shimmer rounded-xl h-6 w-96" />
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

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
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
              Timeline & Schedule
            </h1>
            <p className="text-muted-foreground text-lg">
              Full competition timeline for {hackathon.name}
            </p>
          </motion.div>

          {/* Phase Summary Cards */}
          {phases.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
            >
              {phases.map((phase, i) => {
                const statusInfo = phaseStatusStyles[phase.status] ?? phaseStatusStyles.draft;
                return (
                  <motion.div
                    key={phase.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                  >
                    <Card className="h-full hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-sm font-medium truncate">
                            {phase.name}
                          </CardTitle>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] px-1.5 py-0 h-5 shrink-0", statusInfo.badge)}
                          >
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        {phase.phaseType && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Layers className="h-3 w-3" />
                            {phaseTypeLabels[phase.phaseType] ?? phase.phaseType}
                          </div>
                        )}
                        {phase.startDate && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            {formatDate(phase.startDate)}
                            {phase.endDate && ` — ${formatDate(phase.endDate)}`}
                          </div>
                        )}
                        {phase.campusFilter && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {phase.campusFilter}
                          </div>
                        )}
                        {(phase.reviewerCount ?? 0) > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {phase.reviewerCount} reviewer{phase.reviewerCount !== 1 ? "s" : ""} per applicant
                          </div>
                        )}
                        {phase.description && (
                          <p className="text-xs text-muted-foreground/80 line-clamp-2 mt-1">
                            {phase.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Full Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Competition Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CalendarDays className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No timeline dates have been set yet. Check back later for the full schedule.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {timeline.map((entry, i) => {
                      const now = new Date();
                      const entryDate = new Date(entry.date);
                      const isPast = entryDate < now;
                      const isCurrent = isPast && entry.endDate && new Date(entry.endDate) > now;
                      const statusInfo = entry.status ? phaseStatusStyles[entry.status] : undefined;

                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.15 + i * 0.03 }}
                          className="flex items-start gap-4 py-3"
                        >
                          {/* Timeline dot + connector */}
                          <div className="flex flex-col items-center pt-0.5">
                            <div
                              className={cn(
                                "rounded-full flex items-center justify-center shrink-0",
                                entry.isPhase ? "h-8 w-8" : "h-5 w-5",
                                isCurrent
                                  ? "bg-primary ring-2 ring-primary/20"
                                  : isPast
                                    ? "bg-primary"
                                    : "bg-muted",
                                entry.isPhase && !isPast && !isCurrent && "border border-accent bg-accent/10"
                              )}
                            >
                              {entry.isPhase ? (
                                <Flag
                                  className={cn(
                                    "h-3.5 w-3.5",
                                    isPast || isCurrent ? "text-primary-foreground" : "text-accent"
                                  )}
                                />
                              ) : isPast ? (
                                <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                              ) : (
                                <Circle className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                            {i < timeline.length - 1 && (
                              <div className="w-0.5 h-full min-h-[20px] bg-muted mt-1" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 -mt-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p
                                className={cn(
                                  "text-sm font-medium",
                                  isCurrent && "text-primary",
                                  entry.isPhase && "text-base"
                                )}
                              >
                                {entry.label}
                              </p>
                              {entry.isPhase && entry.phaseType && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 capitalize">
                                  {phaseTypeLabels[entry.phaseType] ?? entry.phaseType}
                                </Badge>
                              )}
                              {statusInfo && (
                                <Badge
                                  variant="outline"
                                  className={cn("text-[10px] px-1.5 py-0 h-4", statusInfo.badge)}
                                >
                                  {statusInfo.label}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDate(entry.date)}
                              {entry.endDate && ` — ${formatDate(entry.endDate)}`}
                            </p>
                            {entry.description && (
                              <p className="text-xs text-muted-foreground/80 mt-1 leading-relaxed">
                                {entry.description}
                              </p>
                            )}
                            {entry.campusFilter && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <span className="text-[11px] text-muted-foreground">
                                  {entry.campusFilter}
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
