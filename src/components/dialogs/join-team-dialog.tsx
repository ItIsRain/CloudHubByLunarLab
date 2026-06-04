"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, Lock, Loader2, AlertTriangle, LogOut } from "lucide-react";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";
import { useJoinTeam, useLeaveTeam, JoinTeamError } from "@/hooks/use-teams";
import type { Team } from "@/lib/types";

interface JoinTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  /**
   * If the current user is already a member of a team in this hackathon,
   * pass it here so the dialog can immediately render the "already in
   * another team" state instead of letting them attempt to join.
   */
  currentTeam?: { id: string; name: string; isLeader?: boolean } | null;
}

export function JoinTeamDialog({
  open,
  onOpenChange,
  team,
  currentTeam,
}: JoinTeamDialogProps) {
  const [password, setPassword] = useState("");
  const [conflict, setConflict] = useState<{
    existingTeam: { id: string; name: string } | null;
    isLeader: boolean;
  } | null>(null);
  const joinMutation = useJoinTeam();
  const leaveMutation = useLeaveTeam();

  if (!team) return null;

  // Pre-empt the API call when we already know the user belongs to a
  // different team in this hackathon — avoids a confusing first-click flash
  // of the normal join UI.
  const blockingTeam =
    currentTeam && currentTeam.id !== team.id ? currentTeam : null;
  const effectiveConflict =
    conflict ??
    (blockingTeam
      ? {
          existingTeam: { id: blockingTeam.id, name: blockingTeam.name },
          isLeader: blockingTeam.isLeader === true,
        }
      : null);

  const hasPassword = !!team.joinPassword;
  const busy = joinMutation.isPending || leaveMutation.isPending;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPassword("");
      setConflict(null);
    }
    onOpenChange(next);
  };

  const handleJoin = async () => {
    try {
      await joinMutation.mutateAsync({
        teamId: team.id,
        password: hasPassword ? password : undefined,
      });
      toast.success(`Joined "${team.name}" successfully!`);
      setPassword("");
      setConflict(null);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof JoinTeamError && err.code === "already_in_team") {
        setConflict({
          existingTeam: err.existingTeam ?? null,
          isLeader: err.isLeaderOfExisting === true,
        });
        return;
      }
      toast.error(err instanceof Error ? err.message : "Failed to join team");
    }
  };

  // Non-leader switching teams: leave the current team, then join the target.
  const handleLeaveAndJoin = async () => {
    const existing = effectiveConflict?.existingTeam;
    if (!existing) return;
    if (hasPassword && !password.trim()) {
      toast.error("Enter the team password to continue.");
      return;
    }
    try {
      await leaveMutation.mutateAsync({ teamId: existing.id });
      await joinMutation.mutateAsync({
        teamId: team.id,
        password: hasPassword ? password : undefined,
      });
      toast.success(`Left "${existing.name}" and joined "${team.name}"!`);
      handleOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to switch teams."
      );
    }
  };

  if (effectiveConflict) {
    const existing = effectiveConflict.existingTeam;
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              You&apos;re already on a team
            </DialogTitle>
            <DialogDescription>
              {effectiveConflict.isLeader
                ? `You lead "${existing?.name ?? "your team"}". Transfer leadership to a teammate or disband the team before joining "${team.name}".`
                : `You're on "${existing?.name ?? "another team"}" for this competition. Leave it to join "${team.name}".`}
            </DialogDescription>
          </DialogHeader>

          {existing && (
            <div className="rounded-xl border border-border p-4 space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Your current team
              </p>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <p className="font-semibold">{existing.name}</p>
              </div>
            </div>
          )}

          {/* Non-leaders can switch directly; a password-protected target
              needs its password entered here first. */}
          {!effectiveConflict.isLeader && hasPassword && (
            <div className="space-y-1">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                Password for {team.name} *
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter the team password"
              />
            </div>
          )}

          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            {existing && effectiveConflict.isLeader ? (
              <Button asChild>
                <Link
                  href={`/dashboard/team/${existing.id}`}
                  onClick={() => handleOpenChange(false)}
                >
                  Manage {existing.name}
                </Link>
              </Button>
            ) : existing ? (
              <Button onClick={handleLeaveAndJoin} disabled={busy}>
                {busy ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4 mr-2" />
                )}
                Leave &amp; join {team.name}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join {team.name}</DialogTitle>
          <DialogDescription>
            {hasPassword ? "This team requires a password to join." : "Join this team to collaborate on the competition."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Team preview */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{team.name}</p>
                  {hasPassword && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  {team.members.length}/{team.maxSize} members
                </p>
              </div>
            </div>

            {team.description && (
              <p className="text-sm text-muted-foreground">{team.description}</p>
            )}

            {/* Members */}
            <div className="flex -space-x-2">
              {team.members.map((member) => (
                <Avatar key={member.id} size="sm">
                  <AvatarImage src={member.user.avatar} alt={member.user.name} />
                  <AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
                </Avatar>
              ))}
            </div>

            {/* Looking for */}
            {team.lookingForRoles && team.lookingForRoles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-muted-foreground">Looking for:</span>
                {team.lookingForRoles.map((role) => (
                  <Badge key={role} variant="outline" className="text-xs">
                    {role}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Password */}
          {hasPassword && (
            <div className="space-y-1">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                Team Password *
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter the team password"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleJoin}
            disabled={joinMutation.isPending || (hasPassword && !password)}
          >
            {joinMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              "Join Team"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
