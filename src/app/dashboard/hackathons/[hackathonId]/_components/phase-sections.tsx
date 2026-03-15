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
} from "@/lib/types";
import {
  usePhaseReviewers,
  useAddPhaseReviewer,
  useRemovePhaseReviewer,
  usePhaseAssignments,
  useAutoAssign,
  useClearAssignments,
  usePhaseScores,
  usePhaseDecisions,
  useRunDecisions,
  useOverrideDecision,
} from "@/hooks/use-phases";

// ── Shared Styles ──────────────────────────────────────────

const selectClasses =
  "flex h-11 rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary appearance-none";

// ── Status Badge Helpers ───────────────────────────────────

const reviewerStatusVariant: Record<
  string,
  "muted" | "success" | "destructive"
> = {
  invited: "muted",
  accepted: "success",
  declined: "destructive",
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
                {reviewer.status}
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
  const autoAssign = useAutoAssign(hackathonId, phase.id);
  const clearAssignments = useClearAssignments(hackathonId, phase.id);

  const assignments: ReviewerAssignment[] = assignmentsData?.data ?? [];

  const canClear =
    phase.status === "draft" || phase.status === "active";

  const handleAutoAssign = async () => {
    try {
      const result = await autoAssign.mutateAsync();
      const data = (result as { data?: { created?: number; total?: number } })
        ?.data;
      toast.success(
        `Auto-assigned ${data?.created ?? 0} reviewer assignments (${data?.total ?? 0} total).`
      );
    } catch {
      toast.error("Failed to auto-assign reviewers.");
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
      <div className="flex gap-2">
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
          Auto-Assign
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
      ) : assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No assignments yet. Click &quot;Auto-Assign&quot; to distribute
          applicants among reviewers.
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
                  Reviewer
                </th>
                <th className="pb-2 font-medium text-muted-foreground">
                  Assigned
                </th>
              </tr>
            </thead>
            <tbody>
              {assignments.slice(0, 50).map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    {a.applicantName ?? a.registrationId.slice(0, 8)}
                  </td>
                  <td className="py-2 pr-4">
                    {a.reviewer?.name ?? a.reviewerId.slice(0, 8)}
                  </td>
                  <td className="py-2 text-muted-foreground text-xs">
                    {new Date(a.assignedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {assignments.length > 50 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Showing 50 of {assignments.length} assignments.
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
                            d.registrationId.slice(0, 8)}
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
