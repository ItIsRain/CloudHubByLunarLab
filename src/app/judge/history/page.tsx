"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Edit3,
  Flag,
  History,
  Layers,
  MessageSquare,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trophy,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useJudgeScoreHistory } from "@/hooks/use-phase-scoring";
import type {
  ScoreHistoryPhase,
  CriteriaScore,
  ScoringCriteria,
  PhaseScore,
} from "@/hooks/use-phase-scoring";

// ── Types for grouping ──────────────────────────────────

interface HackathonGroup {
  hackathonId: string;
  hackathonName: string;
  hackathonTagline: string | null;
  hackathonStatus: string;
  hackathonBanner: string | null;
  phases: ScoreHistoryPhase[];
  totalScored: number;
  totalAssigned: number;
  averageScore: number | null;
}

// ── Skeleton Components ─────────────────────────────────

function StatSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 flex items-center gap-4">
        <div className="shimmer h-12 w-12 rounded-xl" />
        <div className="space-y-2 flex-1">
          <div className="shimmer h-3 w-24 rounded" />
          <div className="shimmer h-7 w-16 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

function HackathonSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="shimmer h-5 w-48 rounded" />
          <div className="shimmer h-5 w-20 rounded-full" />
        </div>
        <div className="shimmer h-4 w-64 rounded" />
        <div className="flex gap-4">
          <div className="shimmer h-4 w-28 rounded" />
          <div className="shimmer h-4 w-28 rounded" />
          <div className="shimmer h-4 w-28 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ───────────────────────────────────────────

export default function JudgingHistoryPage() {
  const { data, isLoading, isError } = useJudgeScoreHistory();

  const phases = data?.data?.phases || [];
  const stats = data?.data?.stats || {
    hackathonCount: 0,
    scoreCount: 0,
    averageScore: 0,
  };

  // Group phases by hackathon
  const hackathonGroups = React.useMemo(() => {
    const map = new Map<string, HackathonGroup>();

    for (const phase of phases) {
      const hid = phase.hackathonId;
      if (!hid) continue;

      if (!map.has(hid)) {
        map.set(hid, {
          hackathonId: hid,
          hackathonName: phase.hackathonName,
          hackathonTagline: phase.hackathonTagline,
          hackathonStatus: phase.hackathonStatus,
          hackathonBanner: phase.hackathonBanner,
          phases: [],
          totalScored: 0,
          totalAssigned: 0,
          averageScore: null,
        });
      }

      const group = map.get(hid)!;
      group.phases.push(phase);
      group.totalScored += phase.totalScored;
      group.totalAssigned += phase.totalAssigned;
    }

    // Calculate per-hackathon average
    for (const group of map.values()) {
      const allScores = group.phases.flatMap((p) => p.scores);
      if (allScores.length > 0) {
        const sum = allScores.reduce(
          (acc, s) => acc + Number(s.total_score || 0),
          0
        );
        group.averageScore = Math.round((sum / allScores.length) * 100) / 100;
      }
    }

    return Array.from(map.values());
  }, [phases]);

  const summaryStats = [
    {
      label: "Hackathons Judged",
      value: stats.hackathonCount,
      icon: Trophy,
    },
    {
      label: "Total Scores Submitted",
      value: stats.scoreCount,
      icon: ClipboardCheck,
    },
    {
      label: "Average Score",
      value: stats.scoreCount > 0 ? stats.averageScore.toFixed(1) : "-",
      icon: Star,
    },
  ];

  // Loading state
  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="shimmer h-5 w-40 rounded mb-6" />
            <div className="flex items-center gap-3 mb-8">
              <div className="shimmer h-10 w-10 rounded-xl" />
              <div className="space-y-2">
                <div className="shimmer h-7 w-48 rounded" />
                <div className="shimmer h-4 w-64 rounded" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
              {[0, 1, 2].map((i) => (
                <StatSkeleton key={i} />
              ))}
            </div>
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <HackathonSkeleton key={i} />
              ))}
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                <History className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold">
                  Judging History
                </h1>
                <p className="text-muted-foreground">
                  Your scoring activity across all hackathons and phases.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
            {summaryStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card>
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <stat.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-bold font-display">
                        {stat.value}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Error state */}
          {isError && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-destructive">
                    Failed to load your score history. Please try again later.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Empty state */}
          {!isError && hackathonGroups.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardContent className="py-16 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <History className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="font-display text-xl font-bold mb-2">
                    No Judging History Yet
                  </h3>
                  <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                    You haven&apos;t been assigned to any hackathon phases yet.
                    Once you accept a reviewer invitation and start scoring,
                    your history will appear here.
                  </p>
                  <Button asChild>
                    <Link href="/judge">
                      Go to Judge Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Hackathon Groups */}
          <div className="space-y-4">
            {hackathonGroups.map((group, i) => (
              <motion.div
                key={group.hackathonId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
              >
                <HackathonAccordion group={group} />
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

// ── Hackathon Accordion ─────────────────────────────────

function HackathonAccordion({ group }: { group: HackathonGroup }) {
  const [isOpen, setIsOpen] = React.useState(false);

  const hasIncomplete = group.phases.some(
    (p) =>
      p.totalScored < p.totalAssigned &&
      (p.phaseStatus === "active" || p.phaseStatus === "scoring")
  );

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200",
        isOpen && "ring-1 ring-primary/20"
      )}
    >
      {/* Hackathon Header (clickable) */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full text-left"
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-display text-lg font-bold">
                  {group.hackathonName}
                </h3>
                <Badge
                  variant={
                    group.hackathonStatus === "completed"
                      ? "muted"
                      : group.hackathonStatus === "judging" ||
                          group.hackathonStatus === "submission"
                        ? "default"
                        : "secondary"
                  }
                >
                  {group.hackathonStatus}
                </Badge>
                {hasIncomplete && (
                  <Badge variant="warning" dot pulse>
                    In Progress
                  </Badge>
                )}
              </div>
              {group.hackathonTagline && (
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {group.hackathonTagline}
                </p>
              )}
              <div className="mt-2 flex items-center gap-4 text-sm flex-wrap">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Layers className="h-3.5 w-3.5" />
                  {group.phases.length}{" "}
                  {group.phases.length === 1 ? "phase" : "phases"}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  {group.totalScored} / {group.totalAssigned} scored
                </span>
                {group.averageScore !== null && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Star className="h-3.5 w-3.5" />
                    Avg: {group.averageScore.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              </motion.div>
            </div>
          </div>
        </CardContent>
      </button>

      {/* Expanded Phase Details */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-6 pb-6 pt-4 space-y-4">
              {group.phases.map((phase) => (
                <PhaseSection
                  key={phase.phaseId}
                  phase={phase}
                  hackathonId={group.hackathonId}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ── Phase Section ───────────────────────────────────────

function PhaseSection({
  phase,
  hackathonId,
}: {
  phase: ScoreHistoryPhase;
  hackathonId: string;
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const canContinueScoring =
    phase.totalScored < phase.totalAssigned &&
    (phase.phaseStatus === "active" || phase.phaseStatus === "scoring") &&
    phase.reviewerStatus === "accepted";

  const progressPercent =
    phase.totalAssigned > 0
      ? Math.round((phase.totalScored / phase.totalAssigned) * 100)
      : 0;

  return (
    <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
      {/* Phase Header */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full text-left p-4"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm">{phase.phaseName}</h4>
              <Badge
                variant={
                  phase.phaseStatus === "completed"
                    ? "muted"
                    : phase.phaseStatus === "scoring" ||
                        phase.phaseStatus === "active"
                      ? "success"
                      : "secondary"
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
              {phase.blindReview && (
                <Badge variant="outline" className="text-[10px]">
                  Blind
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                {phase.totalScored} / {phase.totalAssigned} scored
              </span>
              {phase.averageScore !== null && (
                <span>Avg: {phase.averageScore.toFixed(1)}</span>
              )}
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  progressPercent >= 100
                    ? "bg-green-500"
                    : "bg-gradient-to-r from-primary to-accent"
                )}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canContinueScoring && (
              <Button
                size="sm"
                variant="default"
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <Link
                  href={`/judge/${hackathonId}/phases/${phase.phaseId}/quick-score`}
                >
                  Continue Scoring
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          </div>
        </div>
      </button>

      {/* Score Details */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border">
              {phase.scores.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No scores submitted yet for this phase.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {phase.scores.map((score, idx) => (
                    <ScoreRow
                      key={score.id}
                      score={score}
                      index={idx}
                      phase={phase}
                      hackathonId={hackathonId}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Score Row ───────────────────────────────────────────

interface ScoreRowProps {
  score: PhaseScore;
  index: number;
  phase: ScoreHistoryPhase;
  hackathonId: string;
}

function ScoreRow({ score, index, phase, hackathonId }: ScoreRowProps) {
  const registration = score.registration ?? null;

  const applicantName = phase.blindReview
    ? `Applicant #${index + 1}`
    : registration?.applicant?.name || `Applicant #${index + 1}`;

  const criteriaScores = score.criteria_scores || [];
  const totalScore = Number(score.total_score || 0);
  const recommendation = score.recommendation;
  const flagged = score.flagged;
  const overallFeedback = score.overall_feedback;
  const scoringCriteria = (phase.scoringCriteria || []) as ScoringCriteria[];

  // Build a lookup for criteria names
  const criteriaMap = React.useMemo(() => {
    const m = new Map<string, ScoringCriteria>();
    for (const c of scoringCriteria) {
      m.set(c.id, c);
    }
    return m;
  }, [scoringCriteria]);

  const canEdit =
    phase.phaseStatus === "active" || phase.phaseStatus === "scoring";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03 }}
      className="p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: applicant info and scores */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-medium text-sm">{applicantName}</span>
            {flagged && (
              <Badge
                variant="destructive"
                className="text-[10px] gap-1"
              >
                <Flag className="h-2.5 w-2.5" />
                Flagged
              </Badge>
            )}
            {recommendation === "recommend" && (
              <Badge
                variant="outline"
                className="text-[10px] text-green-600 border-green-500/30 gap-1"
              >
                <ThumbsUp className="h-2.5 w-2.5" />
                Recommend
              </Badge>
            )}
            {recommendation === "do_not_recommend" && (
              <Badge
                variant="outline"
                className="text-[10px] text-red-500 border-red-500/30 gap-1"
              >
                <ThumbsDown className="h-2.5 w-2.5" />
                Do Not Recommend
              </Badge>
            )}
          </div>

          {/* Per-criteria score badges */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {criteriaScores.map((cs) => {
              const def = criteriaMap.get(cs.criteriaId);
              const max = def?.maxScore ?? 10;
              const pct = max > 0 ? (cs.score / max) * 100 : 0;
              return (
                <span
                  key={cs.criteriaId}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium",
                    pct >= 70
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : pct >= 40
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                  )}
                  title={def?.name || cs.criteriaId}
                >
                  {def?.name
                    ? def.name.length > 18
                      ? def.name.slice(0, 16) + "..."
                      : def.name
                    : "Criteria"}
                  : {cs.score}/{max}
                </span>
              );
            })}
          </div>

          {/* Overall feedback excerpt */}
          {overallFeedback && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{overallFeedback}</span>
            </div>
          )}
        </div>

        {/* Right: total score + edit button */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-right">
            <p className="font-display text-xl font-bold tabular-nums">
              {totalScore.toFixed(1)}
            </p>
            <p className="text-[10px] text-muted-foreground">Total Score</p>
          </div>
          {canEdit && registration && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 gap-1"
              asChild
            >
              <Link
                href={`/judge/${hackathonId}/phases/${phase.phaseId}/quick-score`}
              >
                <Edit3 className="h-3 w-3" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
