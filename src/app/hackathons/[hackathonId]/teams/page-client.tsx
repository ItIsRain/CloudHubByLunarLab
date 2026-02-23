"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import {
  Search,
  Users,
  Plus,
  ArrowLeft,
  UserPlus,
  Filter,
  Lock,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CreateTeamDialog } from "@/components/dialogs/create-team-dialog";
import { JoinTeamDialog } from "@/components/dialogs/join-team-dialog";
import { EditTeamDialog } from "@/components/dialogs/edit-team-dialog";
import { cn, getInitials } from "@/lib/utils";
import { useHackathon } from "@/hooks/use-hackathons";
import { useHackathonTeams, useCreateTeam } from "@/hooks/use-teams";
import { useHackathonRegistration } from "@/hooks/use-registrations";
import { useHackathonPhase } from "@/hooks/use-hackathon-phase";
import { useAuthStore } from "@/store/auth-store";
import type { Team, TeamStatus } from "@/lib/types";

const statusColors: Record<TeamStatus, string> = {
  forming: "bg-blue-500/10 text-blue-600",
  complete: "bg-success/10 text-success",
  submitted: "bg-primary/10 text-primary",
};

export default function TeamsPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TeamStatus | "all">("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const { user } = useAuthStore();

  const { data: hackathonData, isLoading } = useHackathon(hackathonId);
  const hackathon = hackathonData?.data;
  const { data: teamsData, isLoading: teamsLoading } = useHackathonTeams(hackathonId);
  const allTeams = teamsData?.data || [];
  const { data: regData } = useHackathonRegistration(hackathon?.id);
  const isRegistered = regData?.registered ?? false;
  const isOrganizer = user?.id && hackathon?.organizerId === user.id;
  const phase = useHackathonPhase(hackathon);

  const filteredTeams = useMemo(() => {
    return allTeams.filter((team) => {
      const matchesSearch =
        team.name.toLowerCase().includes(search.toLowerCase()) ||
        team.description?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || team.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allTeams, search, statusFilter]);

  const createTeamMutation = useCreateTeam();

  const handleCreateTeam = async (data: { name: string; description?: string; maxSize: number; lookingForRoles: string[]; joinPassword?: string }) => {
    try {
      await createTeamMutation.mutateAsync({
        hackathon_id: hackathonId,
        name: data.name,
        description: data.description,
        max_size: data.maxSize,
        looking_for_roles: data.lookingForRoles,
        join_password: data.joinPassword || undefined,
      });
      toast.success(`Team "${data.name}" created successfully!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create team");
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="shimmer rounded-xl h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div>
            <Link
              href="/explore"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to explore
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight">
                  Teams
                </h1>
                {hackathon && (
                  <p className="text-muted-foreground mt-1">
                    {hackathon.name} &middot; {allTeams.length} teams
                  </p>
                )}
              </div>
              {phase.canFormTeams && (
                <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Team
                </Button>
              )}
            </div>
            {!phase.canFormTeams && (
              <div className="mt-4 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                {phase.getMessage("formTeams")}
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams..."
              icon={<Search className="h-4 w-4" />}
              className="sm:max-w-xs"
            />
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                All
              </Button>
              {(["forming", "complete", "submitted"] as TeamStatus[]).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className="capitalize"
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>

          {/* Team grid */}
          {filteredTeams.length === 0 ? (
            <div className="text-center py-20 rounded-2xl border border-dashed border-border">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold">No teams found</h2>
              <p className="text-muted-foreground mt-2">
                {search
                  ? "Try a different search term"
                  : "Be the first to create a team!"}
              </p>
              {phase.canFormTeams && (
                <Button onClick={() => setShowCreateDialog(true)} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Create Team
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTeams.map((team, i) => (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card hover>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-display font-semibold flex items-center gap-1.5">
                              {team.name}
                              {team.joinPassword && <Lock className="h-3 w-3 text-muted-foreground" />}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {team.members.length}/{team.maxSize} members
                            </p>
                          </div>
                        </div>
                        <Badge className={cn(statusColors[team.status], "capitalize text-xs")}>
                          {team.status}
                        </Badge>
                      </div>

                      {team.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {team.description}
                        </p>
                      )}

                      {/* Members */}
                      <div className="flex -space-x-2">
                        {team.members.slice(0, 5).map((m) => (
                          <Avatar key={m.id} size="sm" className="border-2 border-background">
                            <AvatarImage src={m.user.avatar} alt={m.user.name} />
                            <AvatarFallback>{getInitials(m.user.name)}</AvatarFallback>
                          </Avatar>
                        ))}
                        {team.members.length > 5 && (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium border-2 border-background">
                            +{team.members.length - 5}
                          </div>
                        )}
                      </div>

                      {/* Looking for */}
                      {team.lookingForRoles && team.lookingForRoles.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs text-muted-foreground mr-1">Looking for:</span>
                          {team.lookingForRoles.map((role) => (
                            <Badge key={role} variant="outline" className="text-[10px]">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Action buttons */}
                      {(() => {
                        if (isOrganizer) return null;

                        const isLeader = user && team.members.some((m) => m.user.id === user.id && m.isLeader);
                        const isMember = user && team.members.some((m) => m.user.id === user.id);

                        if (isLeader) {
                          return (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full gap-1.5"
                              onClick={() => {
                                setSelectedTeam(team);
                                setShowEditDialog(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit Team
                            </Button>
                          );
                        }

                        if (!isMember && team.status === "forming" && team.members.length < team.maxSize && phase.canFormTeams) {
                          if (!isRegistered) {
                            return (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full gap-1.5"
                                disabled
                                title="Register for the hackathon to join a team"
                              >
                                <Lock className="h-3.5 w-3.5" />
                                Register to Join
                              </Button>
                            );
                          }
                          return (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full gap-1.5"
                              onClick={() => {
                                setSelectedTeam(team);
                                setShowJoinDialog(true);
                              }}
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                              Join Team
                            </Button>
                          );
                        }

                        return null;
                      })()}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <CreateTeamDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateTeam}
        maxTeamSize={hackathon?.maxTeamSize}
      />
      <JoinTeamDialog
        open={showJoinDialog}
        onOpenChange={setShowJoinDialog}
        team={selectedTeam}
      />
      {selectedTeam && (
        <EditTeamDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          team={selectedTeam}
        />
      )}
    </div>
  );
}
