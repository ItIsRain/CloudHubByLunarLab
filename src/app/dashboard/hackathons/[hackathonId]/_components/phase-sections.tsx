"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  Trash2,
  Shuffle,
  BarChart3,
  Gavel,
  Loader2,
  CheckCircle,
  XCircle,
  MinusCircle,
  AlertTriangle,
  Trophy,
  Zap,
  Star,
  Plus,
  Search,
  Check,
  UserCheck,
  Shield,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type {
  CompetitionPhase,
  PhaseReviewer,
  ReviewerAssignment,
  PhaseScore,
  PhaseDecision,
  PhaseDecisionType,
  AwardCategory,
} from "@/lib/types";
import {
  usePhaseReviewers,
  useAddPhaseReviewer,
  useRemovePhaseReviewer,
  usePhaseAssignments,
  useAutoAssign,
  useClearAssignments,
  useRemoveAssignment,
  usePhaseScores,
  usePhaseDecisions,
  useRunDecisions,
  useOverrideDecision,
} from "@/hooks/use-phases";
import {
  usePhaseFinalists,
  useAutoSelectFinalists,
  useManualSelectFinalists,
} from "@/hooks/use-phase-scoring";
import { useHackathonParticipants } from "@/hooks/use-hackathon-participants";
import {
  usePhaseConflicts,
  useDetectConflicts,
  useResolveConflict,
  type ReviewerConflict,
} from "@/hooks/use-conflicts";

// ── Shared Styles ──────────────────────────────────────────

const selectClasses =
  "flex h-11 rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary appearance-none";

// ── Status Badge Helpers ───────────────────────────────────

const reviewerStatusVariant: Record<
  string,
  "muted" | "success" | "destructive" | "warning"
> = {
  invited: "warning",
  accepted: "success",
  declined: "destructive",
};

const reviewerStatusLabel: Record<string, string> = {
  invited: "Pending",
  accepted: "Accepted",
  declined: "Declined",
};

const decisionBadgeVariant: Record<
  PhaseDecisionType,
  "success" | "warning" | "destructive"
> = {
  advance: "success",
  borderline: "warning",
  do_not_advance: "destructive",
};

const decisionIcon: Record<PhaseDecisionType, React.ReactNode> = {
  advance: <CheckCircle className="h-3.5 w-3.5" />,
  borderline: <MinusCircle className="h-3.5 w-3.5" />,
  do_not_advance: <XCircle className="h-3.5 w-3.5" />,
};

const decisionLabel: Record<PhaseDecisionType, string> = {
  advance: "Advance",
  borderline: "Borderline",
  do_not_advance: "Do Not Advance",
};

const conflictTypeLabel: Record<ReviewerConflict["conflict_type"], string> = {
  self_registration: "Self-Registered",
  same_team: "Same Team",
  declared: "Declared",
};

const conflictTypeVariant: Record<
  ReviewerConflict["conflict_type"],
  "destructive" | "warning"
> = {
  self_registration: "destructive",
  same_team: "warning",
  declared: "warning",
};

// ═════════════════════════════════════════════════════════════
// ReviewersSection
// ═════════════════════════════════════════════════════════════

interface ReviewersSectionProps {
  hackathonId: string;
  phase: CompetitionPhase;
}

export function ReviewersSection({
  hackathonId,
  phase,
}: ReviewersSectionProps) {
  const { data: reviewersData, isLoading } = usePhaseReviewers(
    hackathonId,
    phase.id
  );
  const addReviewer = useAddPhaseReviewer(hackathonId, phase.id);
  const removeReviewer = useRemovePhaseReviewer(hackathonId, phase.id);

  const reviewers: PhaseReviewer[] = reviewersData?.data ?? [];

  // Conflict detection
  const { data: conflictsData } = usePhaseConflicts(hackathonId, phase.id);
  const detectConflicts = useDetectConflicts(hackathonId, phase.id);
  const resolveConflict = useResolveConflict(hackathonId, phase.id);

  const conflicts: ReviewerConflict[] = conflictsData?.data ?? [];
  const unresolvedCount = conflicts.filter((c) => !c.resolved).length;

  const handleDetectConflicts = async () => {
    try {
      const result = await detectConflicts.mutateAsync();
      const { detected, newConflicts } = result.data;
      if (newConflicts > 0) {
        toast.warning(
          `Found ${newConflicts} new conflict${newConflicts !== 1 ? "s" : ""} (${detected} total).`
        );
      } else {
        toast.success(`No new conflicts found (${detected} total).`);
      }
    } catch {
      toast.error("Failed to detect conflicts.");
    }
  };

  const handleResolve = async (conflictId: string) => {
    try {
      await resolveConflict.mutateAsync(conflictId);
      toast.success("Conflict resolved.");
    } catch {
      toast.error("Failed to resolve conflict.");
    }
  };

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");

  const handleAdd = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) {
      toast.error("Name and email are required.");
      return;
    }
    try {
      await addReviewer.mutateAsync({
        userId: crypto.randomUUID(),
        name: trimmedName,
        email: trimmedEmail,
      });
      toast.success(`Reviewer "${trimmedName}" added.`);
      setName("");
      setEmail("");
    } catch {
      toast.error("Failed to add reviewer.");
    }
  };

  const handleRemove = async (reviewer: PhaseReviewer) => {
    try {
      await removeReviewer.mutateAsync(reviewer.id);
      toast.success(`Reviewer "${reviewer.name}" removed.`);
    } catch {
      toast.error("Failed to remove reviewer.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h4 className="font-display font-semibold text-base">
          Reviewers / Judges
        </h4>
        <Badge variant="muted" className="ml-auto">
          {reviewers.length} reviewer{reviewers.length !== 1 ? "s" : ""}
        </Badge>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDetectConflicts}
          disabled={detectConflicts.isPending}
          className="gap-1.5"
        >
          {detectConflicts.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Shield className="h-3.5 w-3.5" />
          )}
          Detect Conflicts
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : reviewers.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No reviewers added yet. Add one below.
        </p>
      ) : (
        <div className="space-y-2">
          {reviewers.map((reviewer) => (
            <motion.div
              key={reviewer.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center gap-3 rounded-lg border px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{reviewer.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {reviewer.email}
                </p>
              </div>
              <Badge variant={reviewerStatusVariant[reviewer.status] ?? "muted"}>
                {reviewerStatusLabel[reviewer.status] ?? reviewer.status}
              </Badge>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(reviewer)}
                disabled={removeReviewer.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Conflicts section */}
      {conflicts.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h5 className="text-sm font-semibold">Conflicts</h5>
            {unresolvedCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unresolvedCount} unresolved
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {conflicts.map((conflict) => (
                <motion.div
                  key={conflict.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-4 py-3",
                    conflict.resolved
                      ? "border-muted bg-muted/30"
                      : "border-destructive/30 bg-destructive/5"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {conflict.reviewer?.name ?? "Unknown reviewer"}
                      <span className="text-muted-foreground font-normal">
                        {" "}vs{" "}
                      </span>
                      {conflict.applicant?.name ?? "Unknown applicant"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {conflict.reviewer?.email} / {conflict.applicant?.email}
                    </p>
                  </div>

                  <Badge variant={conflictTypeVariant[conflict.conflict_type]}>
                    {conflictTypeLabel[conflict.conflict_type]}
                  </Badge>

                  {conflict.resolved ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Resolved</span>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolve(conflict.id)}
                      disabled={resolveConflict.isPending}
                      className="gap-1 text-xs"
                    >
                      {resolveConflict.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                      Resolve
                    </Button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Add reviewer form */}
      <div className="flex items-end gap-2 pt-2">
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Name
          </label>
          <Input
            placeholder="Reviewer name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Email
          </label>
          <Input
            placeholder="reviewer@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button
          onClick={handleAdd}
          disabled={addReviewer.isPending}
          className="shrink-0"
        >
          {addReviewer.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          <span className="ml-2 hidden sm:inline">Add</span>
        </Button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// AssignmentsSection
// ═════════════════════════════════════════════════════════════

interface AssignmentsSectionProps {
  hackathonId: string;
  phase: CompetitionPhase;
}

export function AssignmentsSection({
  hackathonId,
  phase,
}: AssignmentsSectionProps) {
  const { data: assignmentsData, isLoading } = usePhaseAssignments(
    hackathonId,
    phase.id
  );
  const { data: reviewersData } = usePhaseReviewers(hackathonId, phase.id);
  const autoAssign = useAutoAssign(hackathonId, phase.id);
  const clearAssignments = useClearAssignments(hackathonId, phase.id);
  const removeAssignment = useRemoveAssignment(hackathonId, phase.id);

  const assignments: ReviewerAssignment[] = assignmentsData?.data ?? [];
  const reviewers: PhaseReviewer[] = reviewersData?.data ?? [];

  const canClear =
    phase.status === "draft" || phase.status === "active";

  // Group assignments by reviewer for display
  const assignmentsByReviewer = React.useMemo(() => {
    const map = new Map<string, ReviewerAssignment[]>();
    for (const a of assignments) {
      const key = a.reviewerId;
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return map;
  }, [assignments]);

  const handleAutoAssign = async () => {
    try {
      const result = await autoAssign.mutateAsync({});
      const data = (result as { data?: { created?: number; totalApplicants?: number; totalReviewers?: number } })
        ?.data;
      toast.success(
        `Auto-assigned ${data?.created ?? 0} new assignments across ${data?.totalReviewers ?? 0} reviewers and ${data?.totalApplicants ?? 0} participants.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to auto-assign reviewers.");
    }
  };

  const handleAssignAll = async (reviewerUserId: string, reviewerName: string) => {
    try {
      const result = await autoAssign.mutateAsync({
        reviewerId: reviewerUserId,
        mode: "all",
      });
      const data = (result as { data?: { created?: number } })?.data;
      toast.success(
        `Assigned ${data?.created ?? 0} new participants to ${reviewerName}.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign all.");
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      await removeAssignment.mutateAsync(assignmentId);
      toast.success("Assignment removed.");
    } catch {
      toast.error("Failed to remove assignment.");
    }
  };

  const handleClear = async () => {
    try {
      await clearAssignments.mutateAsync();
      toast.success("All assignments cleared.");
    } catch {
      toast.error("Failed to clear assignments.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shuffle className="h-4 w-4 text-primary" />
        <h4 className="font-display font-semibold text-base">
          Reviewer Assignments
        </h4>
        <Badge variant="muted" className="ml-auto">
          {assignments.length} assignment{assignments.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={handleAutoAssign}
          disabled={autoAssign.isPending}
        >
          {autoAssign.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Shuffle className="h-4 w-4 mr-2" />
          )}
          Auto-Assign (Round Robin)
        </Button>
        {canClear && assignments.length > 0 && (
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={clearAssignments.isPending}
            className="text-destructive hover:text-destructive"
          >
            {clearAssignments.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Clear All
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : reviewers.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Add reviewers first, then assign them to participants.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Per-reviewer breakdown with "Assign All" */}
          {reviewers.map((reviewer) => {
            const reviewerAssignments =
              assignmentsByReviewer.get(reviewer.userId) ?? [];
            return (
              <div
                key={reviewer.id}
                className="rounded-lg border bg-card/50 overflow-hidden"
              >
                {/* Reviewer header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {reviewer.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {reviewer.email}
                    </p>
                  </div>
                  <Badge variant="muted" className="shrink-0">
                    {reviewerAssignments.length} assigned
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleAssignAll(reviewer.userId, reviewer.name)
                    }
                    disabled={autoAssign.isPending}
                    className="gap-1.5 shrink-0"
                  >
                    {autoAssign.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Users className="h-3.5 w-3.5" />
                    )}
                    Assign All
                  </Button>
                </div>

                {/* Assigned participants list */}
                {reviewerAssignments.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 px-4 text-center">
                    No participants assigned yet.
                  </p>
                ) : (
                  <div className="divide-y max-h-48 overflow-y-auto">
                    {reviewerAssignments.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-3 px-4 py-2 text-sm group hover:bg-muted/20 transition-colors"
                      >
                        <span className="flex-1 truncate">
                          {a.applicantName ?? a.registrationId.slice(0, 8)}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(a.assignedAt).toLocaleDateString()}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleRemoveAssignment(a.id)}
                          disabled={removeAssignment.isPending}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Summary */}
          {assignments.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {assignments.length} total assignments across{" "}
              {assignmentsByReviewer.size} reviewer
              {assignmentsByReviewer.size !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// ScoringOverview
// ═════════════════════════════════════════════════════════════

interface ScoringOverviewProps {
  hackathonId: string;
  phase: CompetitionPhase;
}

export function ScoringOverview({
  hackathonId,
  phase,
}: ScoringOverviewProps) {
  const { data: scoresData, isLoading } = usePhaseScores(
    hackathonId,
    phase.id
  );
  const scores: PhaseScore[] = scoresData?.data ?? [];
  const totalExpected = phase.assignmentCount ?? 0;
  const submitted = scores.length;
  const pct =
    totalExpected > 0 ? Math.round((submitted / totalExpected) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h4 className="font-display font-semibold text-base">
          Scoring Progress
        </h4>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {submitted} / {totalExpected} scores submitted
            </span>
            <span className="font-medium">{pct}%</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          {submitted === totalExpected && totalExpected > 0 && (
            <p className="text-sm text-green-600 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4" />
              All scores have been submitted.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// DecisionsSection
// ═════════════════════════════════════════════════════════════

interface DecisionsSectionProps {
  hackathonId: string;
  phase: CompetitionPhase;
}

export function DecisionsSection({
  hackathonId,
  phase,
}: DecisionsSectionProps) {
  const { data: decisionsData, isLoading } = usePhaseDecisions(
    hackathonId,
    phase.id
  );
  const runDecisions = useRunDecisions(hackathonId, phase.id);
  const overrideDecision = useOverrideDecision(hackathonId, phase.id);

  const decisions: PhaseDecision[] = decisionsData?.data ?? [];

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [overrideTarget, setOverrideTarget] = React.useState<
    PhaseDecision | null
  >(null);
  const [overrideValue, setOverrideValue] =
    React.useState<PhaseDecisionType>("advance");
  const [overrideRationale, setOverrideRationale] = React.useState("");

  const handleRunDecisions = async () => {
    try {
      await runDecisions.mutateAsync(undefined);
      toast.success("Majority rule decisions computed.");
      setConfirmOpen(false);
    } catch {
      toast.error("Failed to run decisions.");
    }
  };

  const handleOverride = async () => {
    if (!overrideTarget) return;
    try {
      await overrideDecision.mutateAsync({
        registrationId: overrideTarget.registrationId,
        decision: overrideValue,
        rationale: overrideRationale || undefined,
      });
      toast.success("Decision overridden.");
      setOverrideTarget(null);
      setOverrideRationale("");
    } catch {
      toast.error("Failed to override decision.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Gavel className="h-4 w-4 text-primary" />
        <h4 className="font-display font-semibold text-base">Decisions</h4>
        <Badge variant="muted" className="ml-auto">
          {decisions.length} decision{decisions.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Run majority rule */}
      <Button
        variant="outline"
        onClick={() => setConfirmOpen(true)}
        disabled={runDecisions.isPending}
      >
        {runDecisions.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Gavel className="h-4 w-4 mr-2" />
        )}
        Run Majority Rule
      </Button>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Majority Rule?</DialogTitle>
            <DialogDescription>
              This will compute decisions for all scored applicants based on
              reviewer recommendations and scores. Existing decisions may be
              overwritten.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg bg-warning/10 p-3 text-sm text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            This action cannot be easily undone.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRunDecisions}
              disabled={runDecisions.isPending}
            >
              {runDecisions.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override dialog */}
      <Dialog
        open={!!overrideTarget}
        onOpenChange={(open) => {
          if (!open) {
            setOverrideTarget(null);
            setOverrideRationale("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Decision</DialogTitle>
            <DialogDescription>
              Override the decision for{" "}
              <strong>
                {overrideTarget?.applicantName ??
                  overrideTarget?.registrationId.slice(0, 8)}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">New Decision</label>
              <select
                className={selectClasses}
                value={overrideValue}
                onChange={(e) =>
                  setOverrideValue(e.target.value as PhaseDecisionType)
                }
              >
                <option value="advance">Advance</option>
                <option value="borderline">Borderline</option>
                <option value="do_not_advance">Do Not Advance</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Rationale{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </label>
              <Input
                placeholder="Reason for override"
                value={overrideRationale}
                onChange={(e) => setOverrideRationale(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOverrideTarget(null);
                setOverrideRationale("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleOverride}
              disabled={overrideDecision.isPending}
            >
              {overrideDecision.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Save Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decisions table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : decisions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No decisions computed yet. Run majority rule after scoring is complete.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium text-muted-foreground">
                  Applicant
                </th>
                <th className="pb-2 font-medium text-muted-foreground">
                  Recommendations
                </th>
                <th className="pb-2 font-medium text-muted-foreground">
                  Avg Score
                </th>
                <th className="pb-2 font-medium text-muted-foreground">
                  Decision
                </th>
                <th className="pb-2 font-medium text-muted-foreground" />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {decisions.map((d) => (
                  <motion.tr
                    key={d.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b last:border-0"
                  >
                    <td className="py-2.5 pr-4">
                      <div>
                        <p className="font-medium">
                          {d.applicantName ??
                            d.registrationId?.slice(0, 8) ?? "Unknown"}
                        </p>
                        {d.applicantEmail && (
                          <p className="text-xs text-muted-foreground">
                            {d.applicantEmail}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      {d.recommendationCount} / {d.totalReviewers}
                    </td>
                    <td className="py-2.5 pr-4">
                      {d.averageScore != null
                        ? d.averageScore.toFixed(2)
                        : "-"}
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge
                        variant={decisionBadgeVariant[d.decision]}
                        className="gap-1"
                      >
                        {decisionIcon[d.decision]}
                        {decisionLabel[d.decision]}
                      </Badge>
                      {d.isOverride && (
                        <span className="ml-1.5 text-[10px] text-muted-foreground italic">
                          (override)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => {
                          setOverrideTarget(d);
                          setOverrideValue(d.decision);
                        }}
                      >
                        Override
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// FinalistsSection — Cross-phase finalist selection
// ═════════════════════════════════════════════════════════════

interface FinalistsSectionProps {
  hackathonId: string;
  phase: CompetitionPhase;
}

export function FinalistsSection({
  hackathonId,
  phase,
}: FinalistsSectionProps) {
  const { data: finalistsData, isLoading } = usePhaseFinalists(
    hackathonId,
    phase.id
  );
  const autoSelect = useAutoSelectFinalists();
  const manualSelect = useManualSelectFinalists();

  const finalists = finalistsData?.data ?? [];
  const hasSourcePhases =
    phase.sourcePhaseIds && phase.sourcePhaseIds.length > 0;

  const [topN, setTopN] = React.useState(15);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [manualOpen, setManualOpen] = React.useState(false);

  const handleAutoSelect = async () => {
    try {
      await autoSelect.mutateAsync({
        hackathonId,
        phaseId: phase.id,
        topN,
      });
      toast.success(`Top ${topN} finalists selected successfully.`);
      setConfirmOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to auto-select finalists"
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" />
        <h4 className="font-display font-semibold text-base">Finalists</h4>
        <Badge variant="muted" className="ml-auto">
          {finalists.length} finalist{finalists.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Selection Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {hasSourcePhases && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Select top</label>
              <Input
                type="number"
                min={1}
                max={500}
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value) || 15)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">
                from {phase.sourcePhaseIds!.length} source phase
                {phase.sourcePhaseIds!.length !== 1 ? "s" : ""}
              </span>
            </div>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(true)}
              disabled={autoSelect.isPending}
            >
              {autoSelect.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Auto-Select
            </Button>
          </>
        )}
        <Button
          variant="outline"
          onClick={() => setManualOpen(true)}
        >
          <UserCheck className="h-4 w-4 mr-2" />
          Manual Select
        </Button>
      </div>

      {!hasSourcePhases && finalists.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Configure source phases to enable auto-select, or use Manual Select
            to pick applicants directly.
          </p>
        </div>
      )}

      {/* Auto-Select Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Auto-Select Top {topN} Finalists?</DialogTitle>
            <DialogDescription>
              This will aggregate scores from all source phases, rank
              applicants by average score, and select the top {topN}.
              Existing finalists will be replaced.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg bg-warning/10 p-3 text-sm text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Existing finalists for this phase will be overwritten.
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAutoSelect}
              disabled={autoSelect.isPending}
            >
              {autoSelect.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Select Dialog */}
      <ManualFinalistDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        hackathonId={hackathonId}
        phase={phase}
        existingFinalistRegIds={new Set(finalists.map((f) => f.registrationId))}
        manualSelect={manualSelect}
      />

      {/* Finalists Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : finalists.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No finalists selected yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium text-muted-foreground">Rank</th>
                <th className="pb-2 font-medium text-muted-foreground">Applicant</th>
                <th className="pb-2 font-medium text-muted-foreground">Source</th>
                <th className="pb-2 font-medium text-muted-foreground">Score</th>
                <th className="pb-2 font-medium text-muted-foreground">Award</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {finalists.map((f) => (
                  <motion.tr
                    key={f.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b last:border-0"
                  >
                    <td className="py-2.5 pr-4 font-mono font-bold text-muted-foreground">
                      #{f.rank || "-"}
                    </td>
                    <td className="py-2.5 pr-4">
                      <div>
                        <p className="font-medium">{f.applicantName}</p>
                        <p className="text-xs text-muted-foreground">{f.applicantEmail}</p>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      {f.sourcePhaseName ? (
                        <Badge variant="outline" className="text-[10px]">
                          {f.sourceCampus || f.sourcePhaseName}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 font-mono">
                      {f.sourceScore != null ? f.sourceScore.toFixed(2) : "-"}
                    </td>
                    <td className="py-2.5">
                      {f.awardLabel ? (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3" />
                          {f.awardLabel}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// ManualFinalistDialog — Checkbox table of applicants
// ═════════════════════════════════════════════════════════════

interface ManualFinalistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hackathonId: string;
  phase: CompetitionPhase;
  existingFinalistRegIds: Set<string>;
  manualSelect: ReturnType<typeof useManualSelectFinalists>;
}

function ManualFinalistDialog({
  open,
  onOpenChange,
  hackathonId,
  phase,
  existingFinalistRegIds,
  manualSelect,
}: ManualFinalistDialogProps) {
  const { data: participantsData, isLoading } = useHackathonParticipants(
    open ? hackathonId : undefined
  );
  const participants = participantsData?.data ?? [];

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = React.useState("");

  // Reset selection when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelected(new Set());
      setSearchQuery("");
    }
  }, [open]);

  // Filter: show only accepted/confirmed/eligible participants, exclude already-finalists
  const eligible = React.useMemo(() => {
    const validStatuses = new Set(["accepted", "confirmed", "eligible", "pending"]);
    return participants.filter((p) => {
      if (!validStatuses.has(p.status)) return false;
      if (existingFinalistRegIds.has(p.id)) return false;
      return true;
    });
  }, [participants, existingFinalistRegIds]);

  const filtered = React.useMemo(() => {
    if (!searchQuery.trim()) return eligible;
    const q = searchQuery.toLowerCase();
    return eligible.filter((p) => {
      const name = (p.user?.name || "").toLowerCase();
      const email = (p.user?.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [eligible, searchQuery]);

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.id)));
    }
  };

  const handleSubmit = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one applicant.");
      return;
    }

    const selections = Array.from(selected).map((regId, idx) => ({
      registrationId: regId,
      rank: (existingFinalistRegIds.size) + idx + 1,
    }));

    try {
      await manualSelect.mutateAsync({
        hackathonId,
        phaseId: phase.id,
        selections,
      });
      toast.success(`${selections.length} finalist${selections.length !== 1 ? "s" : ""} added.`);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add finalists"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manual Finalist Selection</DialogTitle>
          <DialogDescription>
            Select applicants to add as finalists for{" "}
            <span className="font-medium text-foreground">{phase.name}</span>.
            Already-selected finalists are excluded.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Selection stats */}
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            {eligible.length} eligible applicant{eligible.length !== 1 ? "s" : ""}
          </span>
          {selected.size > 0 && (
            <Badge variant="default" className="gap-1">
              <Check className="h-3 w-3" />
              {selected.size} selected
            </Badge>
          )}
        </div>

        {/* Applicant Table */}
        <div className="flex-1 overflow-y-auto min-h-0 border rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Users className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {eligible.length === 0
                  ? "No eligible applicants found. Make sure participants are accepted or confirmed."
                  : "No applicants match your search."}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background border-b">
                <tr className="text-left">
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      onChange={toggleAll}
                      className="rounded border-border"
                    />
                  </th>
                  <th className="p-3 font-medium text-muted-foreground">Applicant</th>
                  <th className="p-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const isSelected = selected.has(p.id);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => toggleOne(p.id)}
                      className={cn(
                        "border-b last:border-0 cursor-pointer transition-colors",
                        isSelected
                          ? "bg-primary/5"
                          : "hover:bg-muted/30"
                      )}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(p.id)}
                          className="rounded border-border"
                        />
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="font-medium">
                            {p.user?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.user?.email || ""}
                          </p>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={manualSelect.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={manualSelect.isPending || selected.size === 0}
          >
            {manualSelect.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <UserCheck className="h-4 w-4 mr-2" />
            )}
            Add {selected.size || ""} Finalist{selected.size !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════════
// AwardCategoriesEditor — Manage award categories for a phase
// ═════════════════════════════════════════════════════════════

interface AwardCategoriesEditorProps {
  categories: AwardCategory[];
  onChange: (categories: AwardCategory[]) => void;
}

export function AwardCategoriesEditor({
  categories,
  onChange,
}: AwardCategoriesEditorProps) {
  const handleAdd = () => {
    onChange([
      ...categories,
      { id: crypto.randomUUID(), name: "", type: "sector", description: "" },
    ]);
  };

  const handleRemove = (id: string) => {
    onChange(categories.filter((c) => c.id !== id));
  };

  const handleUpdate = (id: string, field: keyof AwardCategory, value: string) => {
    onChange(categories.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h4 className="font-display font-semibold text-sm">Award Categories</h4>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">
          No award categories configured. Add categories like &quot;Health Sector
          Winner&quot; or &quot;Innovation Award&quot;.
        </p>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <Card key={cat.id} className="p-3">
              <div className="flex gap-3 items-start">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Category name"
                      value={cat.name}
                      onChange={(e) => handleUpdate(cat.id, "name", e.target.value)}
                      className="flex-1"
                    />
                    <select
                      className={cn(selectClasses, "w-32")}
                      value={cat.type}
                      onChange={(e) => handleUpdate(cat.id, "type", e.target.value)}
                    >
                      <option value="sector">Sector</option>
                      <option value="special">Special</option>
                    </select>
                  </div>
                  <Input
                    placeholder="Description (optional)"
                    value={cat.description || ""}
                    onChange={(e) => handleUpdate(cat.id, "description", e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive shrink-0"
                  onClick={() => handleRemove(cat.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
