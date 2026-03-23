"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale,
  Users,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  MapPin,
  Shuffle,
  Gavel,
  Flag,
  UserCheck,
  Mail,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import type {
  Hackathon,
  CompetitionPhase,
  PhaseReviewer,
  ReviewerAssignment,
  PhaseScore,
  PhaseStatus,
  PhaseType,
} from "@/lib/types";
import {
  usePhases,
  usePhaseReviewers,
  usePhaseAssignments,
  usePhaseScores,
} from "@/hooks/use-phases";

// ── Props ──────────────────────────────────────────────────

interface JudgingTabProps {
  hackathon: Hackathon;
  hackathonId: string;
}

// ── Badge Variants ─────────────────────────────────────────

const phaseStatusVariant: Record<
  PhaseStatus,
  "muted" | "success" | "warning" | "secondary"
> = {
  draft: "muted",
  active: "success",
  scoring: "warning",
  calibration: "secondary",
  completed: "muted",
};

const phaseTypeVariant: Record<
  PhaseType,
  "gradient" | "warning" | "secondary"
> = {
  bootcamp: "gradient",
  final: "warning",
  custom: "secondary",
};

const reviewerStatusConfig: Record<
  string,
  { label: string; variant: "success" | "warning" | "destructive" | "muted"; icon: typeof CheckCircle2 }
> = {
  accepted: { label: "Accepted", variant: "success", icon: CheckCircle2 },
  invited: { label: "Invited", variant: "warning", icon: Mail },
  declined: { label: "Declined", variant: "destructive", icon: XCircle },
};

// ═════════════════════════════════════════════════════════════
// JudgingTab (main export) — "Jury Overview"
// ═════════════════════════════════════════════════════════════

export function JudgingTab({ hackathon, hackathonId }: JudgingTabProps) {
  const { data: phasesData, isLoading } = usePhases(hackathonId);
  const phases: CompetitionPhase[] = phasesData?.data ?? [];
  const meta = phasesData?.meta;

  // Sort by sortOrder then by creation
  const sortedPhases = [...phases].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Scale className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold">Jury Overview</h2>
          <p className="text-sm text-muted-foreground">
            All judges, their phase assignments, and scoring progress
          </p>
        </div>
      </motion.div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sortedPhases.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Scale className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-1">
                No competition phases yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-2">
                Create phases in the &quot;Phases&quot; tab first, then invite
                reviewers and configure assignments. They will appear here
                automatically.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Global jury summary */}
      {!isLoading && sortedPhases.length > 0 && (
        <JurySummary phases={sortedPhases} hackathonId={hackathonId} meta={meta} />
      )}

      {/* Per-phase jury breakdown */}
      <AnimatePresence mode="popLayout">
        {sortedPhases.map((phase, idx) => (
          <motion.div
            key={phase.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: idx * 0.05 }}
          >
            <PhaseJuryCard hackathonId={hackathonId} phase={phase} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// JurySummary — aggregated stats across all phases
// ═════════════════════════════════════════════════════════════

function JurySummary({
  phases,
  hackathonId,
  meta,
}: {
  phases: CompetitionPhase[];
  hackathonId: string;
  meta?: { uniqueReviewerCount: number };
}) {
  // Use aggregate counts from the API instead of phase.reviewers (which is not populated)
  const uniqueJudgeCount = meta?.uniqueReviewerCount ?? 0;
  const acceptedCount = phases.reduce(
    (sum, p) => sum + (p.reviewerAcceptedCount ?? 0),
    0
  );
  const invitedCount = phases.reduce(
    (sum, p) => sum + (p.reviewerInvitedCount ?? 0),
    0
  );

  const totalAssignments = phases.reduce(
    (sum, p) => sum + (p.assignmentCount ?? 0),
    0
  );
  const totalScores = phases.reduce(
    (sum, p) => sum + (p.scoreCount ?? 0),
    0
  );
  const totalApplicants = phases.reduce(
    (sum, p) => sum + (p.applicantCount ?? 0),
    0
  );

  const stats = [
    {
      label: "Unique Judges",
      value: uniqueJudgeCount,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Accepted",
      value: acceptedCount,
      icon: UserCheck,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Pending Invites",
      value: invitedCount,
      icon: Mail,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Assignments",
      value: totalAssignments,
      icon: Shuffle,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Scores Submitted",
      value: totalScores,
      icon: BarChart3,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
    {
      label: "Applicants",
      value: totalApplicants,
      icon: Gavel,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div
                className={cn(
                  "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                  stat.bgColor
                )}
              >
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
              <div className="min-w-0">
                <p className="font-display text-xl font-bold leading-none">
                  {stat.value}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {stat.label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════
// PhaseJuryCard — expandable card per phase showing reviewers
// ═════════════════════════════════════════════════════════════

function PhaseJuryCard({
  hackathonId,
  phase,
}: {
  hackathonId: string;
  phase: CompetitionPhase;
}) {
  const [expanded, setExpanded] = React.useState(false);

  const reviewerCount = phase.reviewerCount_agg ?? phase.reviewers?.length ?? 0;
  const acceptedReviewers = phase.reviewerAcceptedCount ?? reviewerCount;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <button
        type="button"
        className="w-full text-left p-5 flex items-start gap-4 hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Flag className="h-4 w-4 text-primary shrink-0" />
            <h3 className="font-display text-lg font-semibold truncate">
              {phase.name}
            </h3>
            <Badge variant={phaseTypeVariant[phase.phaseType]}>
              {phase.phaseType}
            </Badge>
            <Badge
              variant={phaseStatusVariant[phase.status]}
              dot
              pulse={phase.status === "scoring"}
            >
              {phase.status}
            </Badge>
            {phase.campusFilter && (
              <Badge variant="outline" className="gap-1">
                <MapPin className="h-3 w-3" />
                {phase.campusFilter}
              </Badge>
            )}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {acceptedReviewers}/{reviewerCount} Judges
            </span>
            <span className="flex items-center gap-1">
              <Shuffle className="h-3.5 w-3.5" />
              {phase.assignmentCount ?? 0} Assignments
            </span>
            <span className="flex items-center gap-1">
              <BarChart3 className="h-3.5 w-3.5" />
              {phase.scoreCount ?? 0} Scores
            </span>
            <span className="flex items-center gap-1">
              <Gavel className="h-3.5 w-3.5" />
              {phase.applicantCount ?? 0} Applicants
            </span>
            {phase.scoringCriteria.length > 0 && (
              <span className="flex items-center gap-1">
                <Scale className="h-3.5 w-3.5" />
                {phase.scoringCriteria.length} Criteria
              </span>
            )}
          </div>

          {/* Scoring criteria summary */}
          {phase.scoringCriteria.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {phase.scoringCriteria.map((c) => (
                <span
                  key={c.id}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
                >
                  {c.name} ({c.weight}%)
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 pt-1">
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded: reviewer details with assignments */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t pt-5">
              <PhaseJuryDetails hackathonId={hackathonId} phase={phase} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════
// PhaseJuryDetails — fetches reviewers, assignments, scores
// ═════════════════════════════════════════════════════════════

function PhaseJuryDetails({
  hackathonId,
  phase,
}: {
  hackathonId: string;
  phase: CompetitionPhase;
}) {
  const { data: reviewersData, isLoading: reviewersLoading } =
    usePhaseReviewers(hackathonId, phase.id);
  const { data: assignmentsData, isLoading: assignmentsLoading } =
    usePhaseAssignments(hackathonId, phase.id);
  const { data: scoresData, isLoading: scoresLoading } = usePhaseScores(
    hackathonId,
    phase.id
  );

  const reviewers: PhaseReviewer[] = reviewersData?.data ?? [];
  const assignments: ReviewerAssignment[] = assignmentsData?.data ?? [];
  const scores: PhaseScore[] = scoresData?.data ?? [];

  const isLoading = reviewersLoading || assignmentsLoading || scoresLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (reviewers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          No judges assigned to this phase yet.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Go to the &quot;Phases&quot; tab to invite reviewers.
        </p>
      </div>
    );
  }

  // Build a lookup: reviewerId -> their assignments
  const assignmentsByReviewer = new Map<string, ReviewerAssignment[]>();
  for (const a of assignments) {
    const existing = assignmentsByReviewer.get(a.reviewerId) ?? [];
    assignmentsByReviewer.set(a.reviewerId, [...existing, a]);
  }

  // Build a lookup: (reviewerId, registrationId) -> score
  const scoreKey = (rId: string, regId: string) => `${rId}:${regId}`;
  const scoreMap = new Map<string, PhaseScore>();
  for (const s of scores) {
    scoreMap.set(scoreKey(s.reviewerId, s.registrationId), s);
  }

  const isFinalPhase = phase.phaseType === "final";

  return (
    <div className="space-y-4">
      {/* Phase type explanation */}
      {isFinalPhase && assignments.length === 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-3">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <strong>Final phase — open judging:</strong> All judges can score
            any applicant who presents. No specific assignments required.
          </p>
        </div>
      )}

      {!isFinalPhase && assignments.length === 0 && reviewers.length > 0 && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-50 dark:bg-blue-950/20 p-3">
          <p className="text-xs text-blue-700 dark:text-blue-400">
            <strong>No assignments yet.</strong> Use the &quot;Phases&quot; tab
            to auto-assign applicants to judges.
          </p>
        </div>
      )}

      {/* Reviewer cards */}
      <div className="space-y-3">
        {reviewers.map((reviewer, idx) => {
          const myAssignments =
            assignmentsByReviewer.get(reviewer.userId) ?? [];
          const myScoreCount = myAssignments.filter((a) =>
            scoreMap.has(scoreKey(reviewer.userId, a.registrationId))
          ).length;

          // For open judging (finals), count all scores by this reviewer
          const totalScoresByReviewer = isFinalPhase
            ? scores.filter((s) => s.reviewerId === reviewer.userId).length
            : myScoreCount;

          const statusConfig =
            reviewerStatusConfig[reviewer.status] ??
            reviewerStatusConfig.invited;
          const StatusIcon = statusConfig.icon;

          return (
            <motion.div
              key={reviewer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="rounded-xl border p-4 space-y-3"
            >
              {/* Reviewer header */}
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">
                    {getInitials(reviewer.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {reviewer.name}
                    </p>
                    <Badge
                      variant={statusConfig.variant}
                      className="gap-1 text-[10px] px-1.5 py-0 h-4"
                    >
                      <StatusIcon className="h-2.5 w-2.5" />
                      {statusConfig.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {reviewer.email}
                  </p>
                </div>

                {/* Scoring progress */}
                <div className="text-right shrink-0">
                  {isFinalPhase ? (
                    <p className="text-sm font-mono font-bold">
                      {totalScoresByReviewer}{" "}
                      <span className="text-muted-foreground font-normal text-xs">
                        scored
                      </span>
                    </p>
                  ) : myAssignments.length > 0 ? (
                    <>
                      <p className="text-sm font-mono font-bold">
                        {myScoreCount}/{myAssignments.length}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        scored
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No assignments
                    </p>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {!isFinalPhase && myAssignments.length > 0 && (
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      myScoreCount >= myAssignments.length
                        ? "bg-green-500"
                        : myScoreCount > 0
                          ? "bg-primary"
                          : "bg-muted-foreground/20"
                    )}
                    style={{
                      width: `${(myScoreCount / myAssignments.length) * 100}%`,
                    }}
                  />
                </div>
              )}

              {/* Assigned applicants list */}
              {!isFinalPhase && myAssignments.length > 0 && (
                <div className="grid gap-1.5">
                  {myAssignments.map((assignment) => {
                    const score = scoreMap.get(
                      scoreKey(reviewer.userId, assignment.registrationId)
                    );
                    const applicantName =
                      assignment.applicantName ?? "Unknown Applicant";

                    return (
                      <div
                        key={assignment.id}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs",
                          score
                            ? "bg-green-500/5 border border-green-500/20"
                            : "bg-muted/50"
                        )}
                      >
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            score ? "bg-green-500" : "bg-muted-foreground/30"
                          )}
                        />
                        <span className="flex-1 truncate">{applicantName}</span>
                        {score ? (
                          <span className="font-mono font-medium text-green-600 dark:text-green-400 shrink-0">
                            {score.totalScore.toFixed(1)}
                            {score.recommendation && (
                              <span className="ml-1">
                                {score.recommendation === "recommend"
                                  ? "✓"
                                  : "✗"}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground shrink-0">
                            Pending
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* For final phases, show scores submitted by this reviewer */}
              {isFinalPhase && totalScoresByReviewer > 0 && (
                <div className="grid gap-1.5">
                  {scores
                    .filter((s) => s.reviewerId === reviewer.userId)
                    .map((score) => (
                      <div
                        key={score.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-green-500/5 border border-green-500/20"
                      >
                        <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                        <span className="flex-1 truncate">
                          {score.applicantName ?? "Applicant"}
                        </span>
                        <span className="font-mono font-medium text-green-600 dark:text-green-400 shrink-0">
                          {score.totalScore.toFixed(1)}
                          {score.recommendation && (
                            <span className="ml-1">
                              {score.recommendation === "recommend"
                                ? "✓"
                                : "✗"}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
