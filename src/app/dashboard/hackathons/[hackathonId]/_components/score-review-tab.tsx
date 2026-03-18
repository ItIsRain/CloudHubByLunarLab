"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Check,
  ChevronDown,
  Filter,
  ArrowUpDown,
  ThumbsUp,
  ThumbsDown,
  X,
  Users,
  Layers,
  AlertTriangle,
  Search,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, getInitials } from "@/lib/utils";
import type { Hackathon } from "@/lib/types";
import {
  useScoreReview,
  type ScoreReviewPhase,
  type ScoreReviewRegistration,
  type ScoreReviewScore,
  type ScoreReviewDecision,
  type ScoringCriteria,
} from "@/hooks/use-phase-scoring";

// ── Types ────────────────────────────────────────────────

interface ScoreReviewTabProps {
  hackathon: Hackathon;
  hackathonId: string;
}

type SortField = "name" | "totalScore" | "recommendation" | string;
type SortDirection = "asc" | "desc";

interface AggregatedRegistration {
  registrationId: string;
  applicantName: string;
  applicantEmail: string;
  applicantAvatar: string | null;
  status: string;
  /** Per-phase aggregated data */
  phaseScores: Map<string, PhaseScoreAggregate>;
  /** Overall average across all phases (0-100) */
  overallAverage: number;
  /** Total recommend count across all phases */
  totalRecommend: number;
  /** Total do-not-recommend count across all phases */
  totalDoNotRecommend: number;
  /** Decisions per phase */
  decisions: Map<string, ScoreReviewDecision>;
}

interface PhaseScoreAggregate {
  phaseId: string;
  averageTotal: number;
  reviewerCount: number;
  criteriaAverages: Map<string, number>;
  recommendCount: number;
  doNotRecommendCount: number;
  flaggedCount: number;
}

// ── Constants ────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

const MAX_COMPARE = 4;
const MIN_COMPARE = 2;

// ── Helpers ──────────────────────────────────────────────

function scoreColor(score: number, max: number): string {
  if (max <= 0) return "text-muted-foreground";
  const pct = score / max;
  if (pct >= 0.7) return "text-green-500";
  if (pct >= 0.4) return "text-amber-500";
  return "text-red-500";
}

function scoreBgColor(score: number, max: number): string {
  if (max <= 0) return "bg-muted/30";
  const pct = score / max;
  if (pct >= 0.7) return "bg-green-500/10";
  if (pct >= 0.4) return "bg-amber-500/10";
  return "bg-red-500/10";
}

function decisionBadgeVariant(decision: string): "success" | "destructive" | "warning" | "secondary" {
  switch (decision) {
    case "advance":
      return "success";
    case "do_not_advance":
      return "destructive";
    case "borderline":
      return "warning";
    default:
      return "secondary";
  }
}

function decisionLabel(decision: string): string {
  switch (decision) {
    case "advance":
      return "Advance";
    case "do_not_advance":
      return "Do Not Advance";
    case "borderline":
      return "Borderline";
    default:
      return decision;
  }
}

function aggregateScoreData(
  registrations: ScoreReviewRegistration[],
  scores: ScoreReviewScore[],
  decisions: ScoreReviewDecision[],
): AggregatedRegistration[] {
  // Index scores by registration_id
  const scoresByReg = new Map<string, ScoreReviewScore[]>();
  for (const s of scores) {
    const existing = scoresByReg.get(s.registration_id) ?? [];
    scoresByReg.set(s.registration_id, [...existing, s]);
  }

  // Index decisions by registration_id + phase_id
  const decisionsByReg = new Map<string, ScoreReviewDecision[]>();
  for (const d of decisions) {
    const existing = decisionsByReg.get(d.registration_id) ?? [];
    decisionsByReg.set(d.registration_id, [...existing, d]);
  }

  return registrations.map((reg) => {
    const regScores = scoresByReg.get(reg.id) ?? [];
    const regDecisions = decisionsByReg.get(reg.id) ?? [];

    // Group scores by phase
    const scoresByPhase = new Map<string, ScoreReviewScore[]>();
    for (const s of regScores) {
      const existing = scoresByPhase.get(s.phase_id) ?? [];
      scoresByPhase.set(s.phase_id, [...existing, s]);
    }

    const phaseScores = new Map<string, PhaseScoreAggregate>();
    let totalWeightedScore = 0;
    let phaseCount = 0;

    for (const [phaseId, phaseScoreList] of scoresByPhase) {
      const reviewerCount = phaseScoreList.length;
      const averageTotal =
        reviewerCount > 0
          ? phaseScoreList.reduce((sum, s) => sum + s.total_score, 0) / reviewerCount
          : 0;

      // Aggregate per-criteria averages
      const criteriaScoreSums = new Map<string, { sum: number; count: number }>();
      for (const s of phaseScoreList) {
        for (const cs of s.criteria_scores) {
          const existing = criteriaScoreSums.get(cs.criteriaId) ?? { sum: 0, count: 0 };
          criteriaScoreSums.set(cs.criteriaId, {
            sum: existing.sum + cs.score,
            count: existing.count + 1,
          });
        }
      }
      const criteriaAverages = new Map<string, number>();
      for (const [cId, { sum, count }] of criteriaScoreSums) {
        criteriaAverages.set(cId, count > 0 ? sum / count : 0);
      }

      const recommendCount = phaseScoreList.filter(
        (s) => s.recommendation === "recommend"
      ).length;
      const doNotRecommendCount = phaseScoreList.filter(
        (s) => s.recommendation === "do_not_recommend"
      ).length;
      const flaggedCount = phaseScoreList.filter((s) => s.flagged).length;

      phaseScores.set(phaseId, {
        phaseId,
        averageTotal,
        reviewerCount,
        criteriaAverages,
        recommendCount,
        doNotRecommendCount,
        flaggedCount,
      });

      totalWeightedScore += averageTotal;
      phaseCount++;
    }

    const overallAverage = phaseCount > 0 ? totalWeightedScore / phaseCount : 0;

    // Build decisions map keyed by phaseId
    const decisionsMap = new Map<string, ScoreReviewDecision>();
    for (const d of regDecisions) {
      decisionsMap.set(d.phase_id, d);
    }

    const totalRecommend = [...phaseScores.values()].reduce(
      (sum, ps) => sum + ps.recommendCount,
      0
    );
    const totalDoNotRecommend = [...phaseScores.values()].reduce(
      (sum, ps) => sum + ps.doNotRecommendCount,
      0
    );

    return {
      registrationId: reg.id,
      applicantName: reg.applicant?.name ?? "Unknown",
      applicantEmail: reg.applicant?.email ?? "",
      applicantAvatar: reg.applicant?.avatar ?? null,
      status: reg.status,
      phaseScores,
      overallAverage,
      totalRecommend,
      totalDoNotRecommend,
      decisions: decisionsMap,
    };
  });
}

// ── Skeleton Loader ──────────────────────────────────────

function ScoreReviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="shimmer rounded-xl h-24" />
        ))}
      </div>
      <div className="shimmer rounded-xl h-12" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="shimmer rounded-xl h-40" />
        ))}
      </div>
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────

function EmptyState({ message, suggestion }: { message: string; suggestion: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <BarChart3 className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-display text-xl font-semibold mb-2">{message}</h3>
      <p className="text-muted-foreground max-w-md">{suggestion}</p>
    </motion.div>
  );
}

// ── Finalist Card ────────────────────────────────────────

function FinalistCard({
  reg,
  isSelected,
  onToggle,
  selectionCount,
}: {
  reg: AggregatedRegistration;
  isSelected: boolean;
  onToggle: () => void;
  selectionCount: number;
}) {
  const canSelect = isSelected || selectionCount < MAX_COMPARE;

  return (
    <motion.div variants={itemVariants} layout>
      <Card
        className={cn(
          "relative cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
          isSelected && "ring-2 ring-primary shadow-lg"
        )}
        onClick={() => {
          if (canSelect) onToggle();
        }}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              {reg.applicantAvatar && (
                <AvatarImage src={reg.applicantAvatar} alt={reg.applicantName} />
              )}
              <AvatarFallback className="text-xs font-medium">
                {getInitials(reg.applicantName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{reg.applicantName}</p>
              <p className="text-xs text-muted-foreground truncate">{reg.applicantEmail}</p>
            </div>
            <div
              className={cn(
                "h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/30"
              )}
            >
              {isSelected && <Check className="h-3.5 w-3.5" />}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {reg.status}
            </Badge>
            <span
              className={cn(
                "text-sm font-semibold",
                scoreColor(reg.overallAverage, 100)
              )}
            >
              {reg.overallAverage.toFixed(1)}%
            </span>
            {reg.totalRecommend > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs text-green-600">
                <ThumbsUp className="h-3 w-3" />
                {reg.totalRecommend}
              </span>
            )}
            {reg.totalDoNotRecommend > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs text-red-500">
                <ThumbsDown className="h-3 w-3" />
                {reg.totalDoNotRecommend}
              </span>
            )}
          </div>

          {/* Mini per-phase scores */}
          {reg.phaseScores.size > 0 && (
            <div className="mt-2 flex gap-1 flex-wrap">
              {[...reg.phaseScores.entries()].map(([phaseId, ps]) => (
                <div
                  key={phaseId}
                  className={cn(
                    "rounded px-1.5 py-0.5 text-xs font-medium",
                    scoreBgColor(ps.averageTotal, 100),
                    scoreColor(ps.averageTotal, 100)
                  )}
                >
                  {ps.averageTotal.toFixed(0)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Comparison Table ─────────────────────────────────────

function ComparisonView({
  selected,
  phases,
  filterPhaseId,
  onClose,
}: {
  selected: AggregatedRegistration[];
  phases: ScoreReviewPhase[];
  filterPhaseId: string | null;
  onClose: () => void;
}) {
  const visiblePhases = filterPhaseId
    ? phases.filter((p) => p.id === filterPhaseId)
    : phases;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="glass rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-semibold">
            Side-by-Side Comparison
          </h3>
          <Badge variant="secondary">{selected.length} finalists</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
          Close
        </Button>
      </div>

      {/* Comparison grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          {/* Applicant header row */}
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-background p-3 text-left text-xs font-medium text-muted-foreground min-w-[160px]">
                Criteria
              </th>
              {selected.map((reg) => (
                <th key={reg.registrationId} className="p-3 text-center min-w-[160px]">
                  <div className="flex flex-col items-center gap-1.5">
                    <Avatar className="h-8 w-8">
                      {reg.applicantAvatar && (
                        <AvatarImage src={reg.applicantAvatar} alt={reg.applicantName} />
                      )}
                      <AvatarFallback className="text-xs">
                        {getInitials(reg.applicantName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm truncate max-w-[140px]">
                      {reg.applicantName}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {/* Overall Average Row */}
            <tr className="bg-muted/30">
              <td className="sticky left-0 z-10 bg-muted/30 p-3 text-sm font-semibold">
                Overall Average
              </td>
              {selected.map((reg) => (
                <td key={reg.registrationId} className="p-3 text-center">
                  <span
                    className={cn(
                      "text-lg font-bold",
                      scoreColor(reg.overallAverage, 100)
                    )}
                  >
                    {reg.overallAverage.toFixed(1)}%
                  </span>
                </td>
              ))}
            </tr>

            {/* Recommendations Row */}
            <tr>
              <td className="sticky left-0 z-10 bg-background p-3 text-sm font-medium">
                Recommendations
              </td>
              {selected.map((reg) => (
                <td key={reg.registrationId} className="p-3 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <span className="inline-flex items-center gap-1 text-sm text-green-600">
                      <ThumbsUp className="h-3.5 w-3.5" />
                      {reg.totalRecommend}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm text-red-500">
                      <ThumbsDown className="h-3.5 w-3.5" />
                      {reg.totalDoNotRecommend}
                    </span>
                  </div>
                </td>
              ))}
            </tr>

            {/* Per-phase sections */}
            {visiblePhases.map((phase) => {
              const criteria = (phase.scoring_criteria ?? []) as ScoringCriteria[];

              return (
                <React.Fragment key={phase.id}>
                  {/* Phase header */}
                  <tr className="bg-accent/5">
                    <td
                      colSpan={selected.length + 1}
                      className="p-3 text-sm font-display font-semibold text-accent-foreground"
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary" />
                        {phase.name}
                        <Badge variant="secondary" className="text-xs">
                          {phase.status}
                        </Badge>
                      </div>
                    </td>
                  </tr>

                  {/* Phase average score */}
                  <tr>
                    <td className="sticky left-0 z-10 bg-background p-3 pl-6 text-sm text-muted-foreground">
                      Phase Average
                    </td>
                    {selected.map((reg) => {
                      const ps = reg.phaseScores.get(phase.id);
                      return (
                        <td key={reg.registrationId} className="p-3 text-center">
                          {ps ? (
                            <div>
                              <span
                                className={cn(
                                  "text-sm font-semibold",
                                  scoreColor(ps.averageTotal, 100)
                                )}
                              >
                                {ps.averageTotal.toFixed(1)}
                              </span>
                              <span className="text-xs text-muted-foreground ml-1">
                                ({ps.reviewerCount} {ps.reviewerCount === 1 ? "review" : "reviews"})
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">--</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Per-criteria rows */}
                  {criteria.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="sticky left-0 z-10 bg-background p-3 pl-8 text-sm text-muted-foreground">
                        {c.name}
                        <span className="text-xs ml-1 opacity-60">
                          (max {c.maxScore})
                        </span>
                      </td>
                      {selected.map((reg) => {
                        const ps = reg.phaseScores.get(phase.id);
                        const avg = ps?.criteriaAverages.get(c.id);
                        return (
                          <td key={reg.registrationId} className="p-3 text-center">
                            {avg !== undefined ? (
                              <span
                                className={cn(
                                  "text-sm font-medium",
                                  scoreColor(avg, c.maxScore)
                                )}
                              >
                                {avg.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">--</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Phase recommendations */}
                  <tr>
                    <td className="sticky left-0 z-10 bg-background p-3 pl-6 text-sm text-muted-foreground">
                      Phase Recommendations
                    </td>
                    {selected.map((reg) => {
                      const ps = reg.phaseScores.get(phase.id);
                      return (
                        <td key={reg.registrationId} className="p-3 text-center">
                          {ps ? (
                            <div className="flex items-center justify-center gap-2">
                              <span className="inline-flex items-center gap-0.5 text-xs text-green-600">
                                <ThumbsUp className="h-3 w-3" />
                                {ps.recommendCount}
                              </span>
                              <span className="inline-flex items-center gap-0.5 text-xs text-red-500">
                                <ThumbsDown className="h-3 w-3" />
                                {ps.doNotRecommendCount}
                              </span>
                              {ps.flaggedCount > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-xs text-amber-500">
                                  <AlertTriangle className="h-3 w-3" />
                                  {ps.flaggedCount}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">--</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Phase decision */}
                  <tr>
                    <td className="sticky left-0 z-10 bg-background p-3 pl-6 text-sm text-muted-foreground">
                      Decision
                    </td>
                    {selected.map((reg) => {
                      const d = reg.decisions.get(phase.id);
                      return (
                        <td key={reg.registrationId} className="p-3 text-center">
                          {d ? (
                            <Badge variant={decisionBadgeVariant(d.decision)}>
                              {decisionLabel(d.decision)}
                              {d.is_override && " (Override)"}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Pending</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ── Main Component ───────────────────────────────────────

export function ScoreReviewTab({ hackathon, hackathonId }: ScoreReviewTabProps) {
  const { data, isLoading, error } = useScoreReview(hackathonId);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterPhaseId, setFilterPhaseId] = React.useState<string | null>(null);
  const [sortField, setSortField] = React.useState<SortField>("totalScore");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");

  const phases = data?.data.phases ?? [];
  const registrations = data?.data.registrations ?? [];
  const scores = data?.data.scores ?? [];
  const decisions = data?.data.decisions ?? [];

  // Aggregate data
  const aggregated = React.useMemo(
    () => aggregateScoreData(registrations, scores, decisions),
    [registrations, scores, decisions]
  );

  // Filter
  const filtered = React.useMemo(() => {
    let result = aggregated;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.applicantName.toLowerCase().includes(q) ||
          r.applicantEmail.toLowerCase().includes(q)
      );
    }

    return result;
  }, [aggregated, searchQuery]);

  // Sort
  const sorted = React.useMemo(() => {
    const copy = [...filtered];
    const dir = sortDirection === "asc" ? 1 : -1;

    copy.sort((a, b) => {
      switch (sortField) {
        case "name":
          return dir * a.applicantName.localeCompare(b.applicantName);
        case "totalScore":
          return dir * (a.overallAverage - b.overallAverage);
        case "recommendation":
          return dir * (a.totalRecommend - b.totalRecommend);
        default: {
          // Sort by a specific criteria ID across all phases
          const getAvg = (reg: AggregatedRegistration) => {
            let sum = 0;
            let count = 0;
            for (const ps of reg.phaseScores.values()) {
              const val = ps.criteriaAverages.get(sortField);
              if (val !== undefined) {
                sum += val;
                count++;
              }
            }
            return count > 0 ? sum / count : 0;
          };
          return dir * (getAvg(a) - getAvg(b));
        }
      }
    });

    return copy;
  }, [filtered, sortField, sortDirection]);

  // Selected registrations for comparison
  const selectedRegistrations = React.useMemo(
    () => sorted.filter((r) => selectedIds.has(r.registrationId)),
    [sorted, selectedIds]
  );

  // Unique criteria across all phases (for sorting dropdown)
  const allCriteria = React.useMemo(() => {
    const map = new Map<string, ScoringCriteria>();
    for (const phase of phases) {
      for (const c of (phase.scoring_criteria ?? []) as ScoringCriteria[]) {
        if (!map.has(c.id)) {
          map.set(c.id, c);
        }
      }
    }
    return [...map.values()];
  }, [phases]);

  const toggleSelection = (registrationId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(registrationId)) {
        next.delete(registrationId);
      } else if (next.size < MAX_COMPARE) {
        next.add(registrationId);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setShowComparison(false);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // ── Loading ──
  if (isLoading) return <ScoreReviewSkeleton />;

  // ── Error ──
  if (error) {
    return (
      <EmptyState
        message="Failed to load score data"
        suggestion="Please try refreshing the page. If the problem persists, check that phases and scores have been configured."
      />
    );
  }

  // ── No Phases ──
  if (phases.length === 0) {
    return (
      <EmptyState
        message="No competition phases configured"
        suggestion="Create competition phases with scoring criteria in the Phases tab before reviewing scores."
      />
    );
  }

  // ── No Registrations ──
  if (registrations.length === 0) {
    return (
      <EmptyState
        message="No finalists to review"
        suggestion="Accept or approve applicants in the Applications tab to see them here for score review."
      />
    );
  }

  // ── No Scores ──
  if (scores.length === 0) {
    return (
      <EmptyState
        message="No scores submitted yet"
        suggestion="Reviewers need to submit scores for applicants through the judging workflow before comparisons can be made."
      />
    );
  }

  // Stats
  const totalRegistrations = registrations.length;
  const totalScoresCount = scores.length;
  const avgOverall =
    aggregated.length > 0
      ? aggregated.reduce((s, r) => s + r.overallAverage, 0) / aggregated.length
      : 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold font-display">{totalRegistrations}</p>
              <p className="text-xs text-muted-foreground">Finalists</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold font-display">{totalScoresCount}</p>
              <p className="text-xs text-muted-foreground">Score Submissions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className={cn("text-2xl font-bold font-display", scoreColor(avgOverall, 100))}>
                {avgOverall.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">Avg Score</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Controls */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search finalists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-56"
            />
          </div>

          {/* Phase filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4" />
                {filterPhaseId
                  ? phases.find((p) => p.id === filterPhaseId)?.name ?? "Phase"
                  : "All Phases"}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setFilterPhaseId(null)}>
                All Phases
              </DropdownMenuItem>
              {phases.map((p) => (
                <DropdownMenuItem key={p.id} onClick={() => setFilterPhaseId(p.id)}>
                  {p.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ArrowUpDown className="h-4 w-4" />
                Sort
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => handleSort("totalScore")}>
                Overall Score {sortField === "totalScore" && (sortDirection === "desc" ? "(High-Low)" : "(Low-High)")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("name")}>
                Name {sortField === "name" && (sortDirection === "asc" ? "(A-Z)" : "(Z-A)")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("recommendation")}>
                Recommendations {sortField === "recommendation" && (sortDirection === "desc" ? "(Most)" : "(Least)")}
              </DropdownMenuItem>
              {allCriteria.length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs text-muted-foreground font-medium">
                    By Criteria
                  </div>
                  {allCriteria.map((c) => (
                    <DropdownMenuItem key={c.id} onClick={() => handleSort(c.id)}>
                      {c.name}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Compare button */}
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2"
            >
              <Badge variant="secondary">
                {selectedIds.size} selected
              </Badge>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            </motion.div>
          )}
          <Button
            size="sm"
            disabled={selectedIds.size < MIN_COMPARE}
            onClick={() => setShowComparison(true)}
          >
            <BarChart3 className="h-4 w-4" />
            Compare ({selectedIds.size}/{MAX_COMPARE})
          </Button>
        </div>
      </motion.div>

      {/* Comparison View */}
      <AnimatePresence mode="wait">
        {showComparison && selectedRegistrations.length >= MIN_COMPARE && (
          <ComparisonView
            key="comparison"
            selected={selectedRegistrations}
            phases={phases}
            filterPhaseId={filterPhaseId}
            onClose={() => setShowComparison(false)}
          />
        )}
      </AnimatePresence>

      {/* Finalist Cards Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {sorted.map((reg) => (
          <FinalistCard
            key={reg.registrationId}
            reg={reg}
            isSelected={selectedIds.has(reg.registrationId)}
            onToggle={() => toggleSelection(reg.registrationId)}
            selectionCount={selectedIds.size}
          />
        ))}
      </motion.div>

      {/* No results for search */}
      {sorted.length === 0 && searchQuery && (
        <EmptyState
          message="No finalists match your search"
          suggestion={`No results for "${searchQuery}". Try a different search term.`}
        />
      )}
    </motion.div>
  );
}

export default ScoreReviewTab;
