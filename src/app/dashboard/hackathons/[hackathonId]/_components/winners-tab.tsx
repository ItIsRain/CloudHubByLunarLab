"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Plus,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  Search,
  Sparkles,
  Zap,
  Award,
  Crown,
  ChevronDown,
  X,
  User as UserIcon,
  Loader2,
  ShieldCheck,
  Grid3X3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Hackathon } from "@/lib/types";
import {
  useAwardTracks,
  useCreateAwardTrack,
  useUpdateAwardTrack,
  useDeleteAwardTrack,
  type AwardTrack,
  type ScoringCriterion,
} from "@/hooks/use-award-tracks";
import {
  useWinners,
  useAddWinner,
  useUpdateWinner,
  useRemoveWinner,
  type CompetitionWinner,
} from "@/hooks/use-winners";
import { useHackathonParticipants } from "@/hooks/use-hackathon-participants";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────

interface WinnersTabProps {
  hackathon: Hackathon;
  hackathonId: string;
}

// ── Constants ────────────────────────────────────────────

const TRACK_TYPES = [
  { value: "sector", label: "Sector" },
  { value: "innovation", label: "Innovation" },
  { value: "special", label: "Special" },
  { value: "custom", label: "Custom" },
] as const;

const TRACK_TYPE_COLORS: Record<string, "default" | "secondary" | "warning" | "muted"> = {
  sector: "default",
  innovation: "secondary",
  special: "warning",
  custom: "muted",
};

const QUICK_PRESETS = {
  sector: [
    { name: "Best in Technology", description: "Outstanding technology solution and implementation" },
    { name: "Best in Healthcare", description: "Best healthcare-focused innovation" },
    { name: "Best in Sustainability", description: "Most impactful sustainability solution" },
    { name: "Best in Finance", description: "Best fintech or financial innovation" },
    { name: "Best in Education", description: "Most innovative education technology" },
  ],
  innovation: [
    { name: "AI Innovation Award", description: "Most innovative use of artificial intelligence" },
    { name: "Robotics Innovation Award", description: "Best robotics or hardware innovation" },
    { name: "Sustainability Innovation Award", description: "Most creative sustainability approach" },
  ],
};

const selectClasses =
  "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 appearance-none";

const textareaClasses =
  "flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[80px]";

// ── Helper Functions ─────────────────────────────────────

function getWinnerDisplayName(winner: CompetitionWinner): string {
  const user = winner.registration?.user;
  if (!user) return "Unknown Participant";
  return user.name || user.username || user.email || "Unknown";
}

function getWinnerInitials(winner: CompetitionWinner): string {
  const name = getWinnerDisplayName(winner);
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getStatusBadge(winner: CompetitionWinner) {
  if (winner.locked) {
    return { label: "Locked", variant: "muted" as const, icon: Lock };
  }
  if (winner.confirmed) {
    return { label: "Confirmed", variant: "success" as const, icon: CheckCircle2 };
  }
  return { label: "Pending", variant: "warning" as const, icon: Loader2 };
}

// ── Track Card Component ─────────────────────────────────

function TrackCard({
  track,
  onEdit,
  onDelete,
  isDeleting,
}: {
  track: AwardTrack;
  onEdit: (track: AwardTrack) => void;
  onDelete: (trackId: string) => void;
  isDeleting: boolean;
}) {
  const criteriaCount = Array.isArray(track.scoring_criteria)
    ? track.scoring_criteria.length
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      layout
    >
      <Card className="group hover:shadow-md transition-all duration-200 h-full">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                track.track_type === "sector" && "bg-primary/10",
                track.track_type === "innovation" && "bg-accent/10",
                track.track_type === "special" && "bg-yellow-500/10",
                track.track_type === "custom" && "bg-muted"
              )}>
                {track.track_type === "sector" && <Trophy className="h-4 w-4 text-primary" />}
                {track.track_type === "innovation" && <Sparkles className="h-4 w-4 text-accent" />}
                {track.track_type === "special" && <Award className="h-4 w-4 text-yellow-500" />}
                {track.track_type === "custom" && <Crown className="h-4 w-4 text-muted-foreground" />}
              </div>
              <Badge variant={TRACK_TYPE_COLORS[track.track_type] || "muted"}>
                {track.track_type}
              </Badge>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(track)}
                className="h-8 w-8 p-0"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(track.id)}
                disabled={isDeleting}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
          <h3 className="font-display font-bold text-base mb-1 line-clamp-2">
            {track.name}
          </h3>
          {track.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {track.description}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {criteriaCount > 0 && (
              <span>{criteriaCount} criteria</span>
            )}
            {track.is_weighted && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                Weighted
              </Badge>
            )}
            <span>Scale: 1-{track.scoring_scale_max}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Add/Edit Track Dialog ────────────────────────────────

function TrackFormDialog({
  open,
  onOpenChange,
  hackathonId,
  editingTrack,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hackathonId: string;
  editingTrack: AwardTrack | null;
}) {
  const createTrack = useCreateAwardTrack(hackathonId);
  const updateTrack = useUpdateAwardTrack(hackathonId);

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [trackType, setTrackType] = React.useState<string>("sector");
  const [scoringScaleMax, setScoringScaleMax] = React.useState(10);
  const [isWeighted, setIsWeighted] = React.useState(false);
  const [criteria, setCriteria] = React.useState<ScoringCriterion[]>([]);

  // Reset form when dialog opens or editingTrack changes
  React.useEffect(() => {
    if (open) {
      if (editingTrack) {
        setName(editingTrack.name);
        setDescription(editingTrack.description || "");
        setTrackType(editingTrack.track_type);
        setScoringScaleMax(editingTrack.scoring_scale_max);
        setIsWeighted(editingTrack.is_weighted);
        setCriteria(
          Array.isArray(editingTrack.scoring_criteria)
            ? editingTrack.scoring_criteria
            : []
        );
      } else {
        setName("");
        setDescription("");
        setTrackType("sector");
        setScoringScaleMax(10);
        setIsWeighted(false);
        setCriteria([]);
      }
    }
  }, [open, editingTrack]);

  const addCriterion = () => {
    setCriteria((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        maxScore: scoringScaleMax,
        weight: isWeighted ? 1 : undefined,
      },
    ]);
  };

  const updateCriterion = (
    id: string,
    field: keyof ScoringCriterion,
    value: string | number
  ) => {
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const removeCriterion = (id: string) => {
    setCriteria((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Track name is required.");
      return;
    }

    const validCriteria = criteria.filter((c) => c.name.trim());

    try {
      if (editingTrack) {
        await updateTrack.mutateAsync({
          trackId: editingTrack.id,
          name: name.trim(),
          description: description.trim() || null,
          track_type: trackType,
          scoring_scale_max: scoringScaleMax,
          is_weighted: isWeighted,
          scoring_criteria: validCriteria,
        });
        toast.success("Track updated successfully.");
      } else {
        await createTrack.mutateAsync({
          name: name.trim(),
          description: description.trim() || null,
          track_type: trackType,
          scoring_scale_max: scoringScaleMax,
          is_weighted: isWeighted,
          scoring_criteria: validCriteria,
        });
        toast.success("Track created successfully.");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save track."
      );
    }
  };

  const isPending = createTrack.isPending || updateTrack.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingTrack ? "Edit Award Track" : "Add Award Track"}
          </DialogTitle>
          <DialogDescription>
            {editingTrack
              ? "Update the award track details and scoring criteria."
              : "Create a new award track for this hackathon."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Best in Technology"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description of this award track..."
              className={textareaClasses}
              maxLength={5000}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select
                value={trackType}
                onChange={(e) => setTrackType(e.target.value)}
                className={selectClasses}
              >
                {TRACK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Score</label>
              <Input
                type="number"
                value={scoringScaleMax}
                onChange={(e) => setScoringScaleMax(Number(e.target.value) || 10)}
                min={1}
                max={100}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is-weighted"
              checked={isWeighted}
              onChange={(e) => setIsWeighted(e.target.checked)}
              className="rounded border-input"
            />
            <label htmlFor="is-weighted" className="text-sm">
              Use weighted scoring
            </label>
          </div>

          {/* Scoring Criteria Editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Scoring Criteria ({criteria.length})
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCriterion}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Criterion
              </Button>
            </div>

            {criteria.length > 0 && (
              <div className="space-y-2">
                {criteria.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <Input
                      value={c.name}
                      onChange={(e) =>
                        updateCriterion(c.id, "name", e.target.value)
                      }
                      placeholder="Criterion name"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={c.maxScore}
                      onChange={(e) =>
                        updateCriterion(
                          c.id,
                          "maxScore",
                          Number(e.target.value)
                        )
                      }
                      placeholder="Max"
                      className="w-20"
                      min={1}
                      max={100}
                    />
                    {isWeighted && (
                      <Input
                        type="number"
                        value={c.weight ?? 1}
                        onChange={(e) =>
                          updateCriterion(
                            c.id,
                            "weight",
                            Number(e.target.value)
                          )
                        }
                        placeholder="Weight"
                        className="w-20"
                        min={0}
                        max={100}
                      />
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCriterion(c.id)}
                      className="h-8 w-8 p-0 shrink-0"
                    >
                      <X className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={isPending}>
              {isPending
                ? "Saving..."
                : editingTrack
                ? "Update Track"
                : "Create Track"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Winner Dialog ────────────────────────────────────

function AddWinnerDialog({
  open,
  onOpenChange,
  hackathonId,
  tracks,
  selectedTrackId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hackathonId: string;
  tracks: AwardTrack[];
  selectedTrackId: string | null;
}) {
  const addWinner = useAddWinner(hackathonId);
  const { data: participantsData } = useHackathonParticipants(hackathonId, "accepted");

  const [search, setSearch] = React.useState("");
  const [chosenTrackId, setChosenTrackId] = React.useState<string | null>(selectedTrackId);
  const [awardLabel, setAwardLabel] = React.useState("");
  const [rank, setRank] = React.useState<string>("");
  const [notes, setNotes] = React.useState("");
  const [selectedRegId, setSelectedRegId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setSearch("");
      setChosenTrackId(selectedTrackId);
      setSelectedRegId(null);
      setRank("");
      setNotes("");
      // Precompute award label from selected track
      const track = tracks.find((t) => t.id === selectedTrackId);
      setAwardLabel(track ? `${track.name} Winner` : "");
    }
  }, [open, selectedTrackId, tracks]);

  const participants = participantsData?.data ?? [];

  const filtered = React.useMemo(() => {
    if (!search.trim()) return participants;
    const q = search.toLowerCase();
    return participants.filter((p) => {
      const name = (p.user?.name || "").toLowerCase();
      return name.includes(q);
    });
  }, [participants, search]);

  const handleSubmit = async () => {
    if (!selectedRegId) {
      toast.error("Please select a participant.");
      return;
    }
    if (!awardLabel.trim()) {
      toast.error("Award label is required.");
      return;
    }

    try {
      await addWinner.mutateAsync({
        registration_id: selectedRegId,
        award_label: awardLabel.trim(),
        award_track_id: chosenTrackId,
        rank: rank ? Number(rank) : null,
        notes: notes.trim() || null,
      });
      toast.success("Winner added successfully.");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add winner."
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Winner</DialogTitle>
          <DialogDescription>
            Select a finalist and assign an award.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Track Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Award Track</label>
            <select
              value={chosenTrackId || ""}
              onChange={(e) => {
                const id = e.target.value || null;
                setChosenTrackId(id);
                const track = tracks.find((t) => t.id === id);
                if (track) setAwardLabel(`${track.name} Winner`);
              }}
              className={selectClasses}
            >
              <option value="">No specific track</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.track_type})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Award Label</label>
            <Input
              value={awardLabel}
              onChange={(e) => setAwardLabel(e.target.value)}
              placeholder="e.g., Best in Technology Winner"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Rank (optional)</label>
            <Input
              type="number"
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              placeholder="1"
              min={1}
            />
          </div>

          {/* Participant Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Select Participant
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name..."
                className="pl-9"
              />
            </div>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-input">
              {filtered.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No participants found
                </div>
              ) : (
                filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedRegId(p.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors text-sm",
                      selectedRegId === p.id && "bg-primary/10 border-l-2 border-primary"
                    )}
                  >
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                      {p.user?.name
                        ? p.user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)
                        : "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {p.user?.name || "Unknown"}
                      </p>
                    </div>
                    {selectedRegId === p.id && (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this winner..."
              className={textareaClasses}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={addWinner.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="gradient"
            onClick={handleSubmit}
            disabled={addWinner.isPending || !selectedRegId}
          >
            {addWinner.isPending ? "Adding..." : "Add Winner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Winner Row ───────────────────────────────────────────

function WinnerRow({
  winner,
  hackathonId,
}: {
  winner: CompetitionWinner;
  hackathonId: string;
}) {
  const updateWinner = useUpdateWinner(hackathonId);
  const removeWinner = useRemoveWinner(hackathonId);
  const status = getStatusBadge(winner);
  const StatusIcon = status.icon;

  const handleConfirm = async () => {
    try {
      await updateWinner.mutateAsync({
        winnerId: winner.id,
        confirmed: true,
      });
      toast.success("Winner confirmed.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to confirm winner."
      );
    }
  };

  const handleToggleLock = async () => {
    try {
      await updateWinner.mutateAsync({
        winnerId: winner.id,
        locked: !winner.locked,
      });
      toast.success(winner.locked ? "Winner unlocked." : "Winner locked.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update lock status."
      );
    }
  };

  const handleRemove = async () => {
    try {
      await removeWinner.mutateAsync(winner.id);
      toast.success("Winner removed.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove winner."
      );
    }
  };

  const isPending =
    updateWinner.isPending || removeWinner.isPending;

  return (
    <motion.tr
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="group border-b border-border/50 last:border-0"
    >
      <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
        {winner.rank ?? "--"}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
            {getWinnerInitials(winner)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {getWinnerDisplayName(winner)}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {winner.registration?.user?.email || ""}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm">{winner.award_label}</span>
        {winner.track && (
          <Badge
            variant={TRACK_TYPE_COLORS[winner.track.track_type] || "muted"}
            className="ml-2 text-[10px]"
          >
            {winner.track.name}
          </Badge>
        )}
      </td>
      <td className="px-4 py-3 text-sm font-mono">
        {winner.final_score != null
          ? Number(winner.final_score).toFixed(2)
          : "--"}
      </td>
      <td className="px-4 py-3">
        <Badge variant={status.variant} className="gap-1">
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!winner.confirmed && !winner.locked && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleConfirm}
              disabled={isPending}
              title="Confirm Winner"
              className="h-8 w-8 p-0"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            </Button>
          )}
          {winner.confirmed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleLock}
              disabled={isPending}
              title={winner.locked ? "Unlock" : "Lock Results"}
              className="h-8 w-8 p-0"
            >
              {winner.locked ? (
                <Unlock className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-primary" />
              )}
            </Button>
          )}
          {!winner.locked && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={isPending}
              title="Remove Winner"
              className="h-8 w-8 p-0"
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>
      </td>
    </motion.tr>
  );
}

// ── Winner Summary Card ──────────────────────────────────

function WinnerSummaryCard({ winner }: { winner: CompetitionWinner }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Card className="hover:shadow-md transition-all duration-200">
        <CardContent className="p-4 text-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 mx-auto mb-2 flex items-center justify-center">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <p className="text-xs text-muted-foreground mb-0.5">
            {winner.award_label}
          </p>
          <h4 className="font-display font-bold text-sm mb-1">
            {getWinnerDisplayName(winner)}
          </h4>
          {winner.final_score != null && (
            <p className="text-xs font-mono text-primary">
              Score: {Number(winner.final_score).toFixed(2)}
            </p>
          )}
          <div className="mt-2">
            {winner.locked ? (
              <Badge variant="muted" className="gap-1 text-[10px]">
                <Lock className="h-2.5 w-2.5" />
                Locked
              </Badge>
            ) : winner.confirmed ? (
              <Badge variant="success" className="gap-1 text-[10px]">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Confirmed
              </Badge>
            ) : (
              <Badge variant="warning" className="text-[10px]">
                Pending
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main Winners Tab ─────────────────────────────────────

export function WinnersTab({ hackathon, hackathonId }: WinnersTabProps) {
  const { data: tracksData, isLoading: tracksLoading } =
    useAwardTracks(hackathonId);
  const { data: winnersData, isLoading: winnersLoading } =
    useWinners(hackathonId);
  const createTrack = useCreateAwardTrack(hackathonId);
  const deleteTrack = useDeleteAwardTrack(hackathonId);
  const updateWinner = useUpdateWinner(hackathonId);

  const [showTrackDialog, setShowTrackDialog] = React.useState(false);
  const [editingTrack, setEditingTrack] = React.useState<AwardTrack | null>(null);
  const [showAddWinnerDialog, setShowAddWinnerDialog] = React.useState(false);
  const [selectedTrackFilter, setSelectedTrackFilter] = React.useState<string>("all");
  const [activeSection, setActiveSection] = React.useState<"tracks" | "selection" | "summary">("tracks");

  const tracks = tracksData?.data ?? [];
  const winners = winnersData?.data ?? [];

  const filteredWinners = React.useMemo(() => {
    if (selectedTrackFilter === "all") return winners;
    if (selectedTrackFilter === "none") {
      return winners.filter((w) => !w.award_track_id);
    }
    return winners.filter((w) => w.award_track_id === selectedTrackFilter);
  }, [winners, selectedTrackFilter]);

  // Group winners by track type for summary view
  const winnersByTrackType = React.useMemo(() => {
    const groups: Record<string, CompetitionWinner[]> = {};
    for (const w of winners) {
      const trackType = w.track?.track_type || "unassigned";
      if (!groups[trackType]) groups[trackType] = [];
      groups[trackType].push(w);
    }
    return groups;
  }, [winners]);

  const handleEditTrack = (track: AwardTrack) => {
    setEditingTrack(track);
    setShowTrackDialog(true);
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!window.confirm("Delete this award track? Winners assigned to it will remain.")) {
      return;
    }
    try {
      await deleteTrack.mutateAsync(trackId);
      toast.success("Award track deleted.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete track."
      );
    }
  };

  const handleCreatePresets = async () => {
    const presetTracks = [
      ...QUICK_PRESETS.sector.map((p, i) => ({
        name: p.name,
        description: p.description,
        track_type: "sector" as const,
        display_order: i,
      })),
      ...QUICK_PRESETS.innovation.map((p, i) => ({
        name: p.name,
        description: p.description,
        track_type: "innovation" as const,
        display_order: QUICK_PRESETS.sector.length + i,
      })),
    ];

    try {
      await createTrack.mutateAsync(presetTracks);
      toast.success(
        `Created ${presetTracks.length} preset tracks.`
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to create preset tracks."
      );
    }
  };

  const handleLockAllConfirmed = async () => {
    const confirmedUnlocked = filteredWinners.filter(
      (w) => w.confirmed && !w.locked
    );
    if (confirmedUnlocked.length === 0) {
      toast.info("No confirmed winners to lock.");
      return;
    }
    if (
      !window.confirm(
        `Lock ${confirmedUnlocked.length} confirmed winner(s)? This makes results public and prevents changes.`
      )
    ) {
      return;
    }

    let locked = 0;
    let failed = 0;
    for (const w of confirmedUnlocked) {
      try {
        await updateWinner.mutateAsync({
          winnerId: w.id,
          locked: true,
        });
        locked++;
      } catch {
        failed++;
      }
    }
    if (failed > 0) {
      toast.warning(`Locked ${locked} winner(s), ${failed} failed.`);
    } else {
      toast.success(`Locked ${locked} winner(s) successfully.`);
    }
  };

  const isLoading = tracksLoading || winnersLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="shimmer rounded-xl h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="shimmer rounded-xl h-32" />
          <div className="shimmer rounded-xl h-32" />
          <div className="shimmer rounded-xl h-32" />
        </div>
        <div className="shimmer rounded-xl h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Winners & Awards
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage award tracks and select competition winners
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {tracks.length} Track{tracks.length !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="secondary">
            {winners.length} Winner{winners.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </motion.div>

      {/* Section Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-2"
      >
        {[
          { key: "tracks" as const, label: "Award Tracks", icon: Grid3X3 },
          { key: "selection" as const, label: "Winner Selection", icon: Crown },
          { key: "summary" as const, label: "Winner Summary", icon: Award },
        ].map((section) => (
          <Button
            key={section.key}
            variant={activeSection === section.key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSection(section.key)}
            className="gap-1.5"
          >
            <section.icon className="h-4 w-4" />
            {section.label}
          </Button>
        ))}
      </motion.div>

      {/* ── Award Tracks Section ── */}
      <AnimatePresence mode="wait">
        {activeSection === "tracks" && (
          <motion.div
            key="tracks"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Track Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="gradient"
                onClick={() => {
                  setEditingTrack(null);
                  setShowTrackDialog(true);
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Track
              </Button>
              <Button
                variant="outline"
                onClick={handleCreatePresets}
                disabled={createTrack.isPending}
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                {createTrack.isPending ? "Creating..." : "Quick Presets"}
              </Button>
            </div>

            {/* Track Cards */}
            {tracks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {tracks.map((track) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      onEdit={handleEditTrack}
                      onDelete={handleDeleteTrack}
                      isDeleting={deleteTrack.isPending}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Grid3X3 className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-bold mb-1">
                    No Award Tracks Yet
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                    Create award tracks to organize winners by category (sector awards, innovation awards, etc.).
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="gradient"
                      onClick={() => {
                        setEditingTrack(null);
                        setShowTrackDialog(true);
                      }}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Track
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCreatePresets}
                      disabled={createTrack.isPending}
                      className="gap-2"
                    >
                      <Zap className="h-4 w-4" />
                      Quick Presets
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* ── Winner Selection Section ── */}
        {activeSection === "selection" && (
          <motion.div
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Selection Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Track filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Filter by Track:
                </label>
                <select
                  value={selectedTrackFilter}
                  onChange={(e) => setSelectedTrackFilter(e.target.value)}
                  className={cn(selectClasses, "w-auto min-w-[180px]")}
                >
                  <option value="all">All Tracks</option>
                  <option value="none">No Track</option>
                  {tracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1" />

              <Button
                variant="gradient"
                onClick={() => setShowAddWinnerDialog(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Winner
              </Button>

              {filteredWinners.some((w) => w.confirmed && !w.locked) && (
                <Button
                  variant="outline"
                  onClick={handleLockAllConfirmed}
                  disabled={updateWinner.isPending}
                  className="gap-2"
                >
                  <Lock className="h-4 w-4" />
                  {updateWinner.isPending
                    ? "Locking..."
                    : "Lock All Confirmed"}
                </Button>
              )}
            </div>

            {/* Winners Table */}
            {filteredWinners.length > 0 ? (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Participant
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Award
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {filteredWinners.map((winner) => (
                          <WinnerRow
                            key={winner.id}
                            winner={winner}
                            hackathonId={hackathonId}
                          />
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Crown className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-bold mb-1">
                    No Winners Selected
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                    {selectedTrackFilter !== "all"
                      ? "No winners found for this track. Add a winner or change the filter."
                      : "Start selecting winners from your competition finalists."}
                  </p>
                  <Button
                    variant="gradient"
                    onClick={() => setShowAddWinnerDialog(true)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add First Winner
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* ── Winner Summary Section ── */}
        {activeSection === "summary" && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {winners.length > 0 ? (
              <>
                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-primary/5 to-background">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold font-display text-primary">
                        {winners.length}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total Winners
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-500/5 to-background">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold font-display text-green-500">
                        {winners.filter((w) => w.confirmed).length}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Confirmed
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-blue-500/5 to-background">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold font-display text-blue-500">
                        {winners.filter((w) => w.locked).length}
                      </p>
                      <p className="text-xs text-muted-foreground">Locked</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-yellow-500/5 to-background">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold font-display text-yellow-500">
                        {
                          winners.filter(
                            (w) => !w.confirmed && !w.locked
                          ).length
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Grouped by Track Type */}
                {Object.entries(winnersByTrackType).map(
                  ([trackType, trackWinners]) => (
                    <div key={trackType} className="space-y-3">
                      <h3 className="font-display text-lg font-semibold flex items-center gap-2 capitalize">
                        {trackType === "sector" && (
                          <Trophy className="h-5 w-5 text-primary" />
                        )}
                        {trackType === "innovation" && (
                          <Sparkles className="h-5 w-5 text-accent" />
                        )}
                        {trackType === "special" && (
                          <Award className="h-5 w-5 text-yellow-500" />
                        )}
                        {trackType === "custom" && (
                          <Crown className="h-5 w-5 text-muted-foreground" />
                        )}
                        {trackType === "unassigned" && (
                          <UserIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                        {trackType === "unassigned"
                          ? "Unassigned"
                          : `${trackType.charAt(0).toUpperCase()}${trackType.slice(1)} Awards`}
                        <Badge variant="secondary" className="text-xs">
                          {trackWinners.length}
                        </Badge>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {trackWinners.map((winner) => (
                          <WinnerSummaryCard
                            key={winner.id}
                            winner={winner}
                          />
                        ))}
                      </div>
                    </div>
                  )
                )}
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Award className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-bold mb-1">
                    No Winners Yet
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                    Switch to Winner Selection to start choosing winners for
                    your competition.
                  </p>
                  <Button
                    variant="gradient"
                    onClick={() => setActiveSection("selection")}
                    className="gap-2"
                  >
                    <Crown className="h-4 w-4" />
                    Go to Selection
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Dialogs ── */}
      <TrackFormDialog
        open={showTrackDialog}
        onOpenChange={(open) => {
          setShowTrackDialog(open);
          if (!open) setEditingTrack(null);
        }}
        hackathonId={hackathonId}
        editingTrack={editingTrack}
      />

      <AddWinnerDialog
        open={showAddWinnerDialog}
        onOpenChange={setShowAddWinnerDialog}
        hackathonId={hackathonId}
        tracks={tracks}
        selectedTrackId={
          selectedTrackFilter !== "all" && selectedTrackFilter !== "none"
            ? selectedTrackFilter
            : null
        }
      />
    </div>
  );
}
