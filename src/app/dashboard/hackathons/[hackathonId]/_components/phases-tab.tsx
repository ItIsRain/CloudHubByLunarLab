"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Users,
  Calendar,
  MapPin,
  Save,
  Loader2,
  ArrowRight,
  BarChart3,
  Gavel,
  Shuffle,
  Star,
  Hash,
  ListOrdered,
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
  Hackathon,
  CompetitionPhase,
  PhaseScoringCriteria,
  CriteriaEvaluationType,
  PhaseType,
  PhaseStatus,
} from "@/lib/types";
import {
  usePhases,
  useCreatePhase,
  useUpdatePhase,
  useDeletePhase,
} from "@/hooks/use-phases";
import {
  ReviewersSection,
  AssignmentsSection,
  ScoringOverview,
  DecisionsSection,
} from "./phase-sections";

// ── Style Constants ────────────────────────────────────────

const selectClasses =
  "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary appearance-none";

// ── Badge Variant Maps ─────────────────────────────────────

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

const STATUS_ORDER: PhaseStatus[] = [
  "draft",
  "active",
  "scoring",
  "calibration",
  "completed",
];

function getNextStatus(current: PhaseStatus): PhaseStatus | null {
  const idx = STATUS_ORDER.indexOf(current);
  if (idx < 0 || idx >= STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[idx + 1];
}

// ── Props ──────────────────────────────────────────────────

interface PhasesTabProps {
  hackathon: Hackathon;
  hackathonId: string;
}

// ═════════════════════════════════════════════════════════════
// PhasesTab (main export)
// ═════════════════════════════════════════════════════════════

export function PhasesTab({ hackathon, hackathonId }: PhasesTabProps) {
  const { data: phasesData, isLoading } = usePhases(hackathonId);
  const phases: CompetitionPhase[] = phasesData?.data ?? [];

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingPhase, setEditingPhase] = React.useState<
    CompetitionPhase | null
  >(null);

  const handleOpenCreate = () => {
    setEditingPhase(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (phase: CompetitionPhase) => {
    setEditingPhase(phase);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingPhase(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold">
              Competition Phases
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure evaluation phases, reviewers, and scoring
            </p>
          </div>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Phase
        </Button>
      </motion.div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && phases.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <BarChart3 className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg font-semibold mb-1">
              No phases yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Create your first evaluation phase to start configuring reviewers,
              scoring criteria, and assignments.
            </p>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Phase
            </Button>
          </Card>
        </motion.div>
      )}

      {/* Phase list */}
      <AnimatePresence mode="popLayout">
        {phases.map((phase, idx) => (
          <motion.div
            key={phase.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: idx * 0.05 }}
          >
            <PhaseCard
              hackathonId={hackathonId}
              hackathon={hackathon}
              phase={phase}
              onEdit={() => handleOpenEdit(phase)}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Create / Edit dialog */}
      <CreatePhaseDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        hackathonId={hackathonId}
        hackathon={hackathon}
        editingPhase={editingPhase}
      />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// PhaseCard
// ═════════════════════════════════════════════════════════════

interface PhaseCardProps {
  hackathonId: string;
  hackathon: Hackathon;
  phase: CompetitionPhase;
  onEdit: () => void;
}

function PhaseCard({ hackathonId, hackathon, phase, onEdit }: PhaseCardProps) {
  const [expanded, setExpanded] = React.useState(false);
  const deletePhase = useDeletePhase(hackathonId);
  const updatePhase = useUpdatePhase(hackathonId, phase.id);

  const nextStatus = getNextStatus(phase.status);
  const showScoring =
    phase.status === "scoring" ||
    phase.status === "calibration" ||
    phase.status === "completed";
  const showDecisions = showScoring;

  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const handleDelete = async () => {
    // Non-draft phases require a second click to confirm
    if (phase.status !== "draft" && !confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await deletePhase.mutateAsync(phase.id);
      toast.success(`Phase "${phase.name}" deleted.`);
    } catch {
      toast.error("Failed to delete phase.");
    } finally {
      setConfirmDelete(false);
    }
  };

  const handleAdvanceStatus = async () => {
    if (!nextStatus) return;
    try {
      await updatePhase.mutateAsync({ status: nextStatus });
      toast.success(`Phase status changed to "${nextStatus}".`);
    } catch {
      toast.error("Failed to update phase status.");
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Header (always visible) */}
      <button
        type="button"
        className="w-full text-left p-5 flex items-start gap-4 hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-lg font-semibold truncate">
              {phase.name}
            </h3>
            <Badge variant={phaseTypeVariant[phase.phaseType]}>
              {phase.phaseType}
            </Badge>
            <Badge variant={phaseStatusVariant[phase.status]} dot pulse={phase.status === "active"}>
              {phase.status}
            </Badge>
            {phase.campusFilter && (
              <Badge variant="outline">{phase.campusFilter}</Badge>
            )}
          </div>

          {/* Dates and location */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {(phase.startDate || phase.endDate) && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {phase.startDate
                  ? new Date(phase.startDate).toLocaleDateString()
                  : "?"}
                {" - "}
                {phase.endDate
                  ? new Date(phase.endDate).toLocaleDateString()
                  : "?"}
              </span>
            )}
            {phase.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {phase.location}
              </span>
            )}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {phase.reviewers?.length ?? 0} Reviewers
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
          </div>
        </div>

        <div className="shrink-0 pt-1">
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-8 border-t pt-5">
              {/* Phase status controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={onEdit}>
                  Edit Phase
                </Button>
                {nextStatus && (
                  <Button
                    size="sm"
                    onClick={handleAdvanceStatus}
                    disabled={updatePhase.isPending}
                  >
                    {updatePhase.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ArrowRight className="h-4 w-4 mr-2" />
                    )}
                    Advance to {nextStatus}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={confirmDelete ? "destructive" : "outline"}
                  className={cn(
                    "ml-auto",
                    !confirmDelete && "text-destructive hover:text-destructive"
                  )}
                  onClick={handleDelete}
                  onBlur={() => setConfirmDelete(false)}
                  disabled={deletePhase.isPending}
                >
                  {deletePhase.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : confirmDelete ? (
                    <AlertTriangle className="h-4 w-4 mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  {confirmDelete ? "Confirm Delete?" : "Delete"}
                </Button>
              </div>

              {/* Description */}
              {phase.description && (
                <p className="text-sm text-muted-foreground">
                  {phase.description}
                </p>
              )}

              {/* Phase settings toggle: Require Recommendation */}
              <div className="flex items-center gap-4 rounded-xl border p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input accent-primary"
                    checked={phase.requireRecommendation}
                    onChange={async (e) => {
                      try {
                        await updatePhase.mutateAsync({ requireRecommendation: e.target.checked });
                        toast.success(e.target.checked ? "Recommendation required" : "Recommendation optional");
                      } catch { toast.error("Failed to update"); }
                    }}
                  />
                  <div>
                    <span className="text-sm font-medium">Require Final Recommendation</span>
                    <p className="text-xs text-muted-foreground">
                      Reviewers must give a Recommend / Do Not Recommend verdict after scoring
                    </p>
                  </div>
                </label>
              </div>

              {/* Scoring criteria */}
              <ScoringCriteriaEditor
                hackathonId={hackathonId}
                phase={phase}
              />

              {/* Divider */}
              <hr className="border-border" />

              {/* Reviewers */}
              <ReviewersSection hackathonId={hackathonId} phase={phase} />

              {/* Divider */}
              <hr className="border-border" />

              {/* Assignments */}
              <AssignmentsSection hackathonId={hackathonId} phase={phase} />

              {/* Scoring overview (when scoring/calibration/completed) */}
              {showScoring && (
                <>
                  <hr className="border-border" />
                  <ScoringOverview hackathonId={hackathonId} phase={phase} />
                </>
              )}

              {/* Decisions (when scoring/calibration/completed) */}
              {showDecisions && (
                <>
                  <hr className="border-border" />
                  <DecisionsSection hackathonId={hackathonId} phase={phase} />
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════
// ScoringCriteriaEditor
// ═════════════════════════════════════════════════════════════

interface ScoringCriteriaEditorProps {
  hackathonId: string;
  phase: CompetitionPhase;
}

function ScoringCriteriaEditor({
  hackathonId,
  phase,
}: ScoringCriteriaEditorProps) {
  const updatePhase = useUpdatePhase(hackathonId, phase.id);

  const [criteria, setCriteria] = React.useState<PhaseScoringCriteria[]>(
    () => phase.scoringCriteria ?? []
  );

  // Sync when phase data changes externally
  React.useEffect(() => {
    setCriteria(phase.scoringCriteria ?? []);
  }, [phase.scoringCriteria]);

  const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
  const weightValid = criteria.length === 0 || Math.abs(totalWeight - 100) < 0.5;

  const handleAddCriteria = () => {
    const remaining = Math.max(0, 100 - totalWeight);
    const newCriteria: PhaseScoringCriteria = {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      evaluationType: "stars",
      maxScore: 3,
      weight: remaining,
    };
    setCriteria((prev) => [...prev, newCriteria]);
  };

  const handleUpdateCriteria = (
    id: string,
    field: keyof PhaseScoringCriteria,
    value: string | number | undefined
  ) => {
    setCriteria((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, [field]: value };
        // Auto-set sensible maxScore defaults when evaluation type changes
        if (field === "evaluationType") {
          const evalType = value as CriteriaEvaluationType;
          if (evalType === "stars") updated.maxScore = 3;
          else if (evalType === "scale") updated.maxScore = 10;
          else if (evalType === "rubric") updated.maxScore = 4;
        }
        return updated;
      })
    );
  };

  const handleRemoveCriteria = (id: string) => {
    setCriteria((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSave = async () => {
    const invalid = criteria.some((c) => !c.name.trim());
    if (invalid) {
      toast.error("All criteria must have a name.");
      return;
    }
    if (!weightValid) {
      toast.error(`Weights must add up to 100%. Currently: ${totalWeight}%`);
      return;
    }
    try {
      await updatePhase.mutateAsync({ scoringCriteria: criteria });
      toast.success("Scoring criteria saved.");
    } catch {
      toast.error("Failed to save scoring criteria.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h4 className="font-display font-semibold text-base">
          Judging Criteria
        </h4>
        <Badge variant="muted">
          {criteria.length} criteria
        </Badge>
        {criteria.length > 0 && (
          <Badge variant={weightValid ? "success" : "destructive"} className="ml-auto">
            Total: {totalWeight}%{!weightValid && " (must be 100%)"}
          </Badge>
        )}
      </div>

      {criteria.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No judging criteria defined yet. Add criteria to configure how
          reviewers will evaluate applicants.
        </p>
      ) : (
        <div className="space-y-3">
          {criteria.map((c) => (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl border p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Criteria Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Criteria Name *
                    </label>
                    <Input
                      placeholder="e.g. Problem-Solution Fit"
                      value={c.name}
                      onChange={(e) =>
                        handleUpdateCriteria(c.id, "name", e.target.value)
                      }
                    />
                  </div>
                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Description
                    </label>
                    <Input
                      placeholder="Guidance for reviewers"
                      value={c.description ?? ""}
                      onChange={(e) =>
                        handleUpdateCriteria(
                          c.id,
                          "description",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  {/* Evaluation Type */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Evaluation Type
                    </label>
                    <select
                      className={selectClasses + " h-10 text-sm"}
                      value={c.evaluationType || "stars"}
                      onChange={(e) =>
                        handleUpdateCriteria(
                          c.id,
                          "evaluationType",
                          e.target.value as CriteriaEvaluationType
                        )
                      }
                    >
                      <option value="stars">Star Rating</option>
                      <option value="scale">Numeric Scale</option>
                      <option value="rubric">Rubric (Levels)</option>
                    </select>
                  </div>
                  {/* Max Score */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      {c.evaluationType === "stars" && <Star className="h-3 w-3" />}
                      {c.evaluationType === "scale" && <Hash className="h-3 w-3" />}
                      {c.evaluationType === "rubric" && <ListOrdered className="h-3 w-3" />}
                      Max Score
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={c.maxScore}
                      onChange={(e) =>
                        handleUpdateCriteria(
                          c.id,
                          "maxScore",
                          parseInt(e.target.value, 10) || 1
                        )
                      }
                    />
                    {/* Visual preview based on evaluation type */}
                    <EvalTypePreview evaluationType={c.evaluationType} maxScore={c.maxScore} />
                  </div>
                  {/* Weight */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Weight %
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={c.weight || 0}
                      onChange={(e) =>
                        handleUpdateCriteria(
                          c.id,
                          "weight",
                          parseInt(e.target.value, 10) || 0
                        )
                      }
                    />
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive mt-6"
                  onClick={() => handleRemoveCriteria(c.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleAddCriteria}>
          <Plus className="h-4 w-4 mr-2" />
          Add Criteria
        </Button>
        {criteria.length > 0 && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updatePhase.isPending}
          >
            {updatePhase.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Criteria
          </Button>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// EvalTypePreview — visual hint for how scoring will look
// ═════════════════════════════════════════════════════════════

function EvalTypePreview({
  evaluationType,
  maxScore,
}: {
  evaluationType: CriteriaEvaluationType;
  maxScore: number;
}) {
  const clampedMax = Math.min(maxScore, 10); // Visual cap for display

  if (evaluationType === "stars") {
    // Show filled and empty star icons
    const filled = Math.ceil(clampedMax / 2);
    return (
      <div className="flex items-center gap-1 py-1">
        {Array.from({ length: clampedMax }, (_, i) => (
          <Star
            key={i}
            className={cn(
              "h-3.5 w-3.5 transition-colors",
              i < filled
                ? "text-amber-400 fill-amber-400"
                : "text-muted-foreground/30"
            )}
          />
        ))}
        <span className="text-[10px] text-muted-foreground ml-1">
          0–{maxScore} stars
        </span>
      </div>
    );
  }

  if (evaluationType === "scale") {
    // Show a mini scale bar with 0 and max
    return (
      <div className="flex items-center gap-1.5 py-1">
        <div className="flex items-center gap-0.5">
          <span className="text-[10px] font-mono text-muted-foreground">0</span>
          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-400 via-amber-400 to-emerald-400"
              style={{ width: "60%" }}
            />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">{maxScore}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          numeric score
        </span>
      </div>
    );
  }

  // Rubric: show level badges
  const levelLabels = ["Poor", "Fair", "Good", "Very Good", "Excellent"];
  return (
    <div className="flex items-center gap-1 py-1 flex-wrap">
      {Array.from({ length: clampedMax }, (_, i) => (
        <span
          key={i}
          className={cn(
            "text-[9px] px-1.5 py-0.5 rounded-md border",
            i === clampedMax - 1
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : "bg-muted text-muted-foreground border-transparent"
          )}
        >
          {levelLabels[i] ?? `L${i + 1}`}
        </span>
      ))}
      <span className="text-[10px] text-muted-foreground ml-0.5">
        {maxScore} levels
      </span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// CreatePhaseDialog
// ═════════════════════════════════════════════════════════════

interface CreatePhaseDialogProps {
  open: boolean;
  onOpenChange: () => void;
  hackathonId: string;
  hackathon: Hackathon;
  editingPhase: CompetitionPhase | null;
}

interface PhaseFormState {
  name: string;
  description: string;
  phaseType: PhaseType;
  campusFilter: string;
  startDate: string;
  endDate: string;
  location: string;
}

const defaultFormState: PhaseFormState = {
  name: "",
  description: "",
  phaseType: "bootcamp",
  campusFilter: "",
  startDate: "",
  endDate: "",
  location: "",
};

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    // Format as YYYY-MM-DDTHH:mm
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function CreatePhaseDialog({
  open,
  onOpenChange,
  hackathonId,
  hackathon,
  editingPhase,
}: CreatePhaseDialogProps) {
  const createPhase = useCreatePhase(hackathonId);
  const updatePhase = useUpdatePhase(hackathonId, editingPhase?.id ?? "");

  const isEditing = !!editingPhase;

  const campusOptions =
    hackathon.screeningConfig?.quotas?.map((q) => q.campus) ?? [];

  const [form, setForm] = React.useState<PhaseFormState>(defaultFormState);

  // Reset form when dialog opens or editingPhase changes
  React.useEffect(() => {
    if (open && editingPhase) {
      setForm({
        name: editingPhase.name,
        description: editingPhase.description ?? "",
        phaseType: editingPhase.phaseType,
        campusFilter: editingPhase.campusFilter ?? "",
        startDate: toDatetimeLocal(editingPhase.startDate),
        endDate: toDatetimeLocal(editingPhase.endDate),
        location: editingPhase.location ?? "",
      });
    } else if (open) {
      setForm(defaultFormState);
    }
  }, [open, editingPhase]);

  const updateField = <K extends keyof PhaseFormState>(
    key: K,
    value: PhaseFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Phase name is required.");
      return;
    }

    const payload: Partial<CompetitionPhase> = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      phaseType: form.phaseType,
      campusFilter: form.campusFilter || null,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      location: form.location.trim() || null,
    };

    try {
      if (isEditing) {
        await updatePhase.mutateAsync(payload);
        toast.success(`Phase "${form.name}" updated.`);
      } else {
        await createPhase.mutateAsync(payload);
        toast.success(`Phase "${form.name}" created.`);
      }
      onOpenChange();
    } catch {
      toast.error(
        isEditing ? "Failed to update phase." : "Failed to create phase."
      );
    }
  };

  const isPending = createPhase.isPending || updatePhase.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Phase" : "Create Phase"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the configuration for this evaluation phase."
              : "Set up a new evaluation phase for your hackathon."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. Bootcamp Phase 1"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className={cn(
                selectClasses,
                "h-auto min-h-[80px] resize-y py-3"
              )}
              placeholder="Optional description for this phase"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </div>

          {/* Phase Type */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Phase Type</label>
            <select
              className={selectClasses}
              value={form.phaseType}
              onChange={(e) =>
                updateField("phaseType", e.target.value as PhaseType)
              }
            >
              <option value="bootcamp">Bootcamp</option>
              <option value="final">Final</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Campus filter */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Campus Filter</label>
            {campusOptions.length > 0 ? (
              <select
                className={selectClasses}
                value={form.campusFilter}
                onChange={(e) => updateField("campusFilter", e.target.value)}
              >
                <option value="">All campuses</option>
                {campusOptions.map((campus) => (
                  <option key={campus} value={campus}>
                    {campus}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                placeholder="e.g. Al Ain (leave blank for all)"
                value={form.campusFilter}
                onChange={(e) => updateField("campusFilter", e.target.value)}
              />
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => updateField("startDate", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => updateField("endDate", e.target.value)}
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Location</label>
            <Input
              placeholder="Physical location or online link"
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            After creating the phase, you can configure judging criteria,
            invite reviewers, and manage assignments from the expanded phase
            card.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onOpenChange} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEditing ? "Save Changes" : "Create Phase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
