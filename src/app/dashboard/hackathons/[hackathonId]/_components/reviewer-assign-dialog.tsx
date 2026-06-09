"use client";

import * as React from "react";
import { Check, Loader2, Search, Users, User } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useAssignablePool,
  useAutoAssign,
  useRemoveAssignment,
  type AssignablePerson,
} from "@/hooks/use-phases";

interface ReviewerAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hackathonId: string;
  phaseId: string;
  reviewer: { userId: string; name: string };
  teamsEnabled: boolean;
  /** The reviewer's existing assignments (assignmentId + registrationId). */
  currentAssignments: { id: string; registrationId: string }[];
}

interface TeamGroup {
  teamId: string;
  teamName: string;
  members: AssignablePerson[];
}

/**
 * Organizer picker: manually choose which participants (or whole teams, when
 * the hackathon is team-based) a judge will review. Pre-selects the reviewer's
 * current assignments; saving adds the newly checked and removes the unchecked.
 */
export function ReviewerAssignDialog({
  open,
  onOpenChange,
  hackathonId,
  phaseId,
  reviewer,
  teamsEnabled,
  currentAssignments,
}: ReviewerAssignDialogProps) {
  const { data, isLoading } = useAssignablePool(hackathonId, phaseId, open);
  const assignSelected = useAutoAssign(hackathonId, phaseId);
  const removeAssignment = useRemoveAssignment(hackathonId, phaseId);

  const pool = React.useMemo(() => data?.data ?? [], [data]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Seed the selection with the reviewer's current assignments each time the
  // dialog opens (not on every render, so edits aren't clobbered).
  React.useEffect(() => {
    if (open) {
      setSelected(new Set(currentAssignments.map((a) => a.registrationId)));
      setSearch("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Split the pool into teams + individuals (only group when teams are on).
  const { teams, individuals } = React.useMemo(() => {
    const teamMap = new Map<string, TeamGroup>();
    const solo: AssignablePerson[] = [];
    for (const p of pool) {
      if (teamsEnabled && p.teamId) {
        const g =
          teamMap.get(p.teamId) ??
          { teamId: p.teamId, teamName: p.teamName ?? "Unnamed team", members: [] };
        g.members.push(p);
        teamMap.set(p.teamId, g);
      } else {
        solo.push(p);
      }
    }
    const sortByName = (a: TeamGroup, b: TeamGroup) =>
      a.teamName.localeCompare(b.teamName);
    return {
      teams: [...teamMap.values()].sort(sortByName),
      individuals: solo.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email)),
    };
  }, [pool, teamsEnabled]);

  const q = search.trim().toLowerCase();
  const matches = (p: AssignablePerson) =>
    !q ||
    p.name.toLowerCase().includes(q) ||
    p.email.toLowerCase().includes(q) ||
    (p.teamName ?? "").toLowerCase().includes(q);

  const filteredTeams = teams
    .map((t) => ({ ...t, members: t.members.filter(matches) }))
    .filter((t) => t.members.length > 0 || t.teamName.toLowerCase().includes(q));
  const filteredIndividuals = individuals.filter(matches);

  const toggleOne = (regId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(regId)) next.delete(regId);
      else next.add(regId);
      return next;
    });

  const toggleTeam = (team: TeamGroup) =>
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = team.members.every((m) => next.has(m.registrationId));
      for (const m of team.members) {
        if (allSelected) next.delete(m.registrationId);
        else next.add(m.registrationId);
      }
      return next;
    });

  const selectAllVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const t of filteredTeams) for (const m of t.members) next.add(m.registrationId);
      for (const p of filteredIndividuals) next.add(p.registrationId);
      return next;
    });

  const clearVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const t of filteredTeams) for (const m of t.members) next.delete(m.registrationId);
      for (const p of filteredIndividuals) next.delete(p.registrationId);
      return next;
    });

  const handleSave = async () => {
    const currentIds = new Set(currentAssignments.map((a) => a.registrationId));
    const toAdd = [...selected].filter((id) => !currentIds.has(id));
    const toRemove = currentAssignments.filter((a) => !selected.has(a.registrationId));

    if (toAdd.length === 0 && toRemove.length === 0) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      if (toAdd.length > 0) {
        await assignSelected.mutateAsync({
          reviewerId: reviewer.userId,
          mode: "selected",
          registrationIds: toAdd,
        });
      }
      for (const a of toRemove) {
        await removeAssignment.mutateAsync(a.id);
      }
      toast.success(
        `Updated ${reviewer.name}: +${toAdd.length} assigned, -${toRemove.length} removed.`
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update assignments.");
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = selected.size;
  const unit = teamsEnabled ? "teams & participants" : "participants";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign to {reviewer.name}</DialogTitle>
          <DialogDescription>
            Choose which {unit} this judge will review. {selectedCount} selected.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${teamsEnabled ? "teams or people" : "people"}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={selectAllVisible}>
              Select all
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={clearVisible}>
              Clear
            </Button>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-lg border divide-y">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTeams.length === 0 && filteredIndividuals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10 px-4">
                {pool.length === 0
                  ? data?.reason || "No eligible participants for this phase yet."
                  : "No matches for your search."}
              </p>
            ) : (
              <>
                {filteredTeams.map((team) => {
                  const allSel = team.members.every((m) => selected.has(m.registrationId));
                  const someSel = !allSel && team.members.some((m) => selected.has(m.registrationId));
                  return (
                    <div key={team.teamId}>
                      <button
                        type="button"
                        onClick={() => toggleTeam(team)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors text-left"
                      >
                        <CheckBox checked={allSel} partial={someSel} />
                        <Users className="h-4 w-4 text-primary shrink-0" />
                        <span className="flex-1 min-w-0 truncate text-sm font-medium">
                          {team.teamName}
                        </span>
                        <Badge variant="muted" className="shrink-0">
                          {team.members.length}
                        </Badge>
                      </button>
                      {/* Members (so the organizer can fine-tune within a team) */}
                      <div className="pl-10">
                        {team.members.map((m) => (
                          <button
                            type="button"
                            key={m.registrationId}
                            onClick={() => toggleOne(m.registrationId)}
                            className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-muted/30 transition-colors text-left"
                          >
                            <CheckBox checked={selected.has(m.registrationId)} />
                            <span className="flex-1 min-w-0 truncate text-xs text-muted-foreground">
                              {m.name || m.email || m.registrationId.slice(0, 8)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {filteredIndividuals.map((p) => (
                  <button
                    type="button"
                    key={p.registrationId}
                    onClick={() => toggleOne(p.registrationId)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors text-left"
                  >
                    <CheckBox checked={selected.has(p.registrationId)} />
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        {p.name || p.email || p.registrationId.slice(0, 8)}
                      </p>
                      {p.name && p.email && (
                        <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                      )}
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || isLoading}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save assignments
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CheckBox({ checked, partial }: { checked: boolean; partial?: boolean }) {
  return (
    <span
      className={cn(
        "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
        checked
          ? "bg-primary border-primary text-primary-foreground"
          : partial
            ? "bg-primary/30 border-primary"
            : "border-input"
      )}
    >
      {checked && <Check className="h-3 w-3" />}
      {!checked && partial && <span className="h-0.5 w-2 bg-primary rounded" />}
    </span>
  );
}
