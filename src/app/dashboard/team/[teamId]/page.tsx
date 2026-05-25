"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Users,
  UserPlus,
  Crown,
  Code,
  MessageSquare,
  Mail,
  LogOut,
  Trash2,
  ArrowRightLeft,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import dynamic from "next/dynamic";
const InviteTeamMemberDialog = dynamic(() => import("@/components/dialogs/invite-team-member-dialog").then(m => m.InviteTeamMemberDialog), { ssr: false });
const EditTeamDialog = dynamic(() => import("@/components/dialogs/edit-team-dialog").then(m => m.EditTeamDialog), { ssr: false });
import { cn, getInitials, formatDate } from "@/lib/utils";
import {
  useTeam,
  useLeaveTeam,
  useDeleteTeam,
  useTransferLeadership,
} from "@/hooks/use-teams";
import { useHackathons } from "@/hooks/use-hackathons";
import { useAuthStore } from "@/store/auth-store";
import type { TeamStatus } from "@/lib/types";

const statusColors: Record<TeamStatus, string> = {
  forming: "bg-blue-500/10 text-blue-600",
  complete: "bg-success/10 text-success",
  submitted: "bg-primary/10 text-primary",
};

export default function TeamWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null);
  const { data: hackathonsData } = useHackathons();
  const hackathons = hackathonsData?.data || [];

  const currentUserId = useAuthStore((s) => s.user?.id);
  const leaveTeam = useLeaveTeam();
  const deleteTeam = useDeleteTeam();
  const transferLeadership = useTransferLeadership();

  const { data: teamData, isLoading } = useTeam(teamId);
  const team = teamData?.data;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="shimmer rounded-xl h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-4 text-center py-20">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold">Team not found</h1>
          <p className="text-muted-foreground mt-2">
            The team you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const hackathon = hackathons.find((h) => h.id === team.hackathonId);
  const currentMember = currentUserId
    ? team.members.find((m) => m.user.id === currentUserId)
    : undefined;
  const isMember = !!currentMember;
  const isLeader = currentMember?.isLeader === true;

  const handleInvite = (_userId: string) => {
    toast.success("Invitation sent!");
  };

  const handleLeave = async () => {
    try {
      await leaveTeam.mutateAsync({ teamId });
      toast.success("You have left the team");
      setShowLeaveDialog(false);
      router.push("/dashboard/team");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to leave team");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTeam.mutateAsync(teamId);
      toast.success("Team deleted");
      setShowDeleteDialog(false);
      router.push("/dashboard/team");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete team");
    }
  };

  const handleTransfer = async () => {
    if (!transferTargetId) return;
    try {
      await transferLeadership.mutateAsync({
        teamId,
        to_user_id: transferTargetId,
      });
      const newLeader = team.members.find((m) => m.user.id === transferTargetId);
      toast.success(
        `Leadership transferred${newLeader ? ` to ${newLeader.user.name}` : ""}`
      );
      setShowTransferDialog(false);
      setTransferTargetId(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to transfer leadership"
      );
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 sm:pt-24 pb-12 sm:pb-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 sm:space-y-8"
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href="/dashboard"
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <span>/</span>
            <span className="text-foreground truncate">{team.name}</span>
          </div>

          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold break-words">
                    {team.name}
                  </h1>
                  <Badge
                    className={cn(statusColors[team.status], "capitalize shrink-0")}
                  >
                    {team.status}
                  </Badge>
                </div>
                {hackathon && (
                  <p className="text-sm sm:text-base text-muted-foreground mt-1 truncate">
                    {hackathon.name}
                    {team.track && <> &middot; {team.track.name}</>}
                  </p>
                )}
              </div>
            </div>

            {/* Action bar — stacks 2-up on mobile, wraps inline on desktop */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              {team.members.length < team.maxSize && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInviteDialog(true)}
                  className="gap-2 w-full sm:w-auto"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="truncate">Invite Member</span>
                </Button>
              )}
              {isLeader && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditDialog(true)}
                  className="gap-2 w-full sm:w-auto"
                >
                  <Pencil className="h-4 w-4" />
                  <span className="truncate">Edit Team</span>
                </Button>
              )}
              {isLeader && team.members.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTransferTargetId(null);
                    setShowTransferDialog(true);
                  }}
                  className="gap-2 w-full sm:w-auto"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  <span className="truncate">Transfer Leadership</span>
                </Button>
              )}
              {isMember && !isLeader && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLeaveDialog(true)}
                  className="gap-2 w-full sm:w-auto text-destructive hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="truncate">Leave Team</span>
                </Button>
              )}
              {isLeader && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-2 w-full sm:w-auto text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="truncate">Delete Team</span>
                </Button>
              )}
            </div>
          </div>

          {team.description && (
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              {team.description}
            </p>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Members */}
              <Card>
                <CardHeader className="flex-row items-center justify-between p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Users className="h-5 w-5" />
                    Members ({team.members.length}/{team.maxSize})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3 p-3 sm:p-6 pt-0 sm:pt-0">
                  {team.members.map((member, i) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 rounded-xl p-2.5 sm:p-3 hover:bg-muted/50 transition-colors"
                    >
                      <Avatar size="lg" className="shrink-0">
                        <AvatarImage src={member.user.avatar} alt={member.user.name} />
                        <AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <p className="font-semibold truncate">{member.user.name}</p>
                          {member.user.username && (
                            <span className="text-xs text-muted-foreground truncate">
                              @{member.user.username}
                            </span>
                          )}
                          {member.isLeader && (
                            <Crown
                              className="h-4 w-4 text-warning shrink-0"
                              aria-label="Team leader"
                            />
                          )}
                        </div>
                        {member.user.email && (
                          <a
                            href={`mailto:${member.user.email}`}
                            className="text-xs sm:text-sm text-primary hover:underline inline-flex items-center gap-1 max-w-full"
                          >
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{member.user.email}</span>
                          </a>
                        )}
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {member.role}
                        </p>
                        <p className="text-[11px] sm:text-xs text-muted-foreground">
                          Joined {formatDate(member.joinedAt)}
                        </p>
                      </div>
                      <div className="hidden sm:flex shrink-0 items-center gap-2">
                        {member.user.email && (
                          <a
                            href={`mailto:${member.user.email}`}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title={`Email ${member.user.name}`}
                          >
                            <Mail className="h-4 w-4" />
                          </a>
                        )}
                        {member.user.github && (
                          <a
                            href={`https://github.com/${member.user.github}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title={`GitHub: ${member.user.github}`}
                          >
                            <Code className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Looking for */}
              {team.lookingForRoles && team.lookingForRoles.length > 0 && (
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base">Looking For</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                    <div className="flex flex-wrap gap-2">
                      {team.lookingForRoles.map((role) => (
                        <Badge key={role} variant="outline">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Team chat placeholder */}
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Team Chat
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <div className="text-center py-6">
                    <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Team chat coming soon
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Track info */}
              {team.track && (
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base">Track</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 p-4 sm:p-6 pt-0 sm:pt-0">
                    <p className="font-semibold">{team.track.name}</p>
                    <p className="text-sm text-muted-foreground">{team.track.description}</p>
                    {team.track.suggestedTech && team.track.suggestedTech.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {team.track.suggestedTech.map((tech) => (
                          <Badge key={tech} variant="muted" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <InviteTeamMemberDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onInvite={handleInvite}
        existingMemberIds={team.members.map((m) => m.user.id)}
      />
      <EditTeamDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        team={team}
      />

      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave {team.name}?</DialogTitle>
            <DialogDescription>
              You will lose access to this team&apos;s workspace and submission.
              You can be re-invited later if the team has space.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowLeaveDialog(false)}
              disabled={leaveTeam.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleLeave}
              disabled={leaveTeam.isPending}
            >
              {leaveTeam.isPending ? "Leaving..." : "Leave Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showTransferDialog}
        onOpenChange={(open) => {
          setShowTransferDialog(open);
          if (!open) setTransferTargetId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer leadership</DialogTitle>
            <DialogDescription>
              Hand the team over to another member. They&apos;ll gain the
              ability to edit, invite, and delete the team. You will become a
              regular member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
            {team.members
              .filter((m) => m.user.id !== currentUserId)
              .map((m) => {
                const selected = transferTargetId === m.user.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setTransferTargetId(m.user.id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl p-3 border text-left transition-colors",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <Avatar size="sm">
                      <AvatarImage src={m.user.avatar} alt={m.user.name} />
                      <AvatarFallback>{getInitials(m.user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {m.user.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.role}
                      </p>
                    </div>
                    {selected && (
                      <Crown className="h-4 w-4 text-warning shrink-0" />
                    )}
                  </button>
                );
              })}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowTransferDialog(false)}
              disabled={transferLeadership.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={!transferTargetId || transferLeadership.isPending}
            >
              {transferLeadership.isPending
                ? "Transferring..."
                : "Transfer Leadership"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {team.name}?</DialogTitle>
            <DialogDescription>
              This permanently removes the team and all its members
              {team.members.length > 1
                ? ` (${team.members.length} people will be affected)`
                : ""}
              . This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteTeam.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTeam.isPending}
            >
              {deleteTeam.isPending ? "Deleting..." : "Delete Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
