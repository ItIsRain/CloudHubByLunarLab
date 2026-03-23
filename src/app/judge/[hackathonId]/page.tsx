"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Gavel,
  Loader2,
  Play,
  Trophy,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useMyReviewerPhases,
  useMyPhaseAssignments,
  useMyPhaseScores,
} from "@/hooks/use-phase-scoring";
import type { ReviewerPhase } from "@/hooks/use-phase-scoring";
import { useHackathon } from "@/hooks/use-hackathons";

function JudgingPageContent() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;

  const { data: hackathonData, isLoading: hackathonLoading } =
    useHackathon(hackathonId);
  const hackathon = hackathonData?.data;

  const { data: reviewerPhasesData, isLoading: phasesLoading } =
    useMyReviewerPhases();

  const isLoading = hackathonLoading || phasesLoading;

  // Filter phases for this hackathon
  const myPhases = React.useMemo(() => {
    if (!reviewerPhasesData?.data) return [];
    return reviewerPhasesData.data.filter(
      (p) => p.hackathonId === hackathonId
    );
  }, [reviewerPhasesData?.data, hackathonId]);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!hackathon) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <Gavel className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h1 className="font-display text-2xl font-bold">
                Hackathon Not Found
              </h1>
              <p className="text-muted-foreground mt-2">
                The hackathon you are looking for does not exist.
              </p>
              <Button asChild className="mt-6">
                <Link href="/judge">Back to Dashboard</Link>
              </Button>
            </motion.div>
          </div>
        </main>
      </>
    );
  }

  if (myPhases.length === 0) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Link
                href="/judge"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Judge Dashboard
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h1 className="font-display text-3xl font-bold">
                {hackathon.name}
              </h1>
              <p className="text-muted-foreground mt-1">Judging Phases</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center py-16"
            >
              <Trophy className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h2 className="font-display text-xl font-bold">
                No Phases Assigned
              </h2>
              <p className="text-muted-foreground mt-2 text-center max-w-md">
                You haven&apos;t been assigned to any judging phases for this
                hackathon yet. The organizer will assign you soon.
              </p>
            </motion.div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link
              href="/judge"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Judge Dashboard
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display text-3xl font-bold">
              {hackathon.name}
            </h1>
            <p className="text-muted-foreground mt-1">Your Judging Phases</p>
          </motion.div>

          {/* Phase Cards */}
          <div className="space-y-4">
            {myPhases.map((phase, i) => (
              <motion.div
                key={phase.phaseId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <PhaseCard
                  phase={phase}
                  hackathonId={hackathonId}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

function PhaseCard({
  phase,
  hackathonId,
}: {
  phase: ReviewerPhase;
  hackathonId: string;
}) {
  const { data: assignmentsData, isLoading: assignmentsLoading } =
    useMyPhaseAssignments(hackathonId, phase.phaseId);
  const { data: scoresData, isLoading: scoresLoading } = useMyPhaseScores(
    hackathonId,
    phase.phaseId
  );

  const assignments = assignmentsData?.data || [];
  const scores = scoresData?.data || [];
  const totalAssigned = assignments.length;

  // Build score map to count scored assignments
  const scoredRegIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const s of scores) {
      if (s.registrationId) ids.add(s.registrationId);
    }
    return ids;
  }, [scores]);

  const scoredCount = assignments.filter((a) =>
    scoredRegIds.has(a.registrationId)
  ).length;

  const isActive =
    phase.phaseStatus === "scoring" || phase.phaseStatus === "active";
  const isCompleted = phase.phaseStatus === "completed";
  const progressPct =
    totalAssigned > 0 ? (scoredCount / totalAssigned) * 100 : 0;

  const statusColor = isActive
    ? "text-green-500"
    : isCompleted
      ? "text-blue-500"
      : "text-muted-foreground";

  return (
    <Card
      className={cn(
        "group transition-all duration-200",
        isActive && "border-primary/20 hover:shadow-md hover:-translate-y-0.5"
      )}
    >
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-display text-lg font-bold truncate">
                {phase.phaseName}
              </h3>
              <Badge
                variant={
                  isActive
                    ? "success"
                    : isCompleted
                      ? "secondary"
                      : "outline"
                }
                className="text-[10px]"
              >
                {phase.phaseStatus}
              </Badge>
              {phase.campusFilter && (
                <Badge variant="outline" className="text-[10px]">
                  {phase.campusFilter}
                </Badge>
              )}
            </div>

            {/* Progress */}
            <div className="flex items-center gap-3 mt-3">
              {assignmentsLoading || scoresLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <span className="text-sm font-medium">
                    <span className={statusColor}>{scoredCount}</span>
                    <span className="text-muted-foreground">
                      /{totalAssigned} reviewed
                    </span>
                  </span>
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  {scoredCount === totalAssigned && totalAssigned > 0 && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </>
              )}
            </div>

            {totalAssigned === 0 && !assignmentsLoading && (
              <p className="text-xs text-muted-foreground mt-2">
                No applicants assigned yet. The organizer will assign them soon.
              </p>
            )}
          </div>

          {/* Action */}
          <div className="shrink-0">
            {isActive && totalAssigned > 0 ? (
              <Button asChild size="sm">
                <Link
                  href={`/judge/${hackathonId}/phases/${phase.phaseId}/quick-score`}
                >
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  {scoredCount > 0 ? "Continue" : "Start"} Judging
                </Link>
              </Button>
            ) : isActive && totalAssigned === 0 ? (
              <Button size="sm" variant="outline" disabled>
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Awaiting Assignments
              </Button>
            ) : isCompleted && totalAssigned > 0 ? (
              <Button asChild size="sm" variant="outline">
                <Link
                  href={`/judge/${hackathonId}/phases/${phase.phaseId}/quick-score`}
                >
                  Review Scores
                </Link>
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled>
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                {phase.phaseStatus === "draft" ? "Not Started" : phase.phaseStatus}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HackathonJudgingPage() {
  return (
    <React.Suspense
      fallback={
        <>
          <Navbar />
          <main className="min-h-screen bg-background pt-24 pb-16">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
              <div className="shimmer rounded-xl h-96 w-full" />
            </div>
          </main>
        </>
      }
    >
      <JudgingPageContent />
    </React.Suspense>
  );
}
