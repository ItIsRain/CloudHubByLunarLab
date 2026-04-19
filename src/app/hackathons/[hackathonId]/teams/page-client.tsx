"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  Sparkles,
  Loader2,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import dynamic from "next/dynamic";
const CreateTeamDialog = dynamic(() => import("@/components/dialogs/create-team-dialog").then(m => m.CreateTeamDialog), { ssr: false });
const JoinTeamDialog = dynamic(() => import("@/components/dialogs/join-team-dialog").then(m => m.JoinTeamDialog), { ssr: false });
const EditTeamDialog = dynamic(() => import("@/components/dialogs/edit-team-dialog").then(m => m.EditTeamDialog), { ssr: false });
import { cn, getInitials } from "@/lib/utils";
import { useHackathon } from "@/hooks/use-hackathons";
import { useHackathonTeams, useCreateTeam, useAutoMatch, useTeamSuggestions } from "@/hooks/use-teams";
import { useHackathonRegistration } from "@/hooks/use-registrations";
import { useHackathonPhase } from "@/hooks/use-hackathon-phase";
import { useAuthStore } from "@/store/auth-store";
import type { Team, TeamStatus, TeamSuggestion } from "@/lib/types";

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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const user = useAuthStore((s) => s.user);

  const { data: hackathonData, isLoading } = useHackathon(hackathonId);
  const hackathon = hackathonData?.data;
  const { data: teamsData, isLoading: teamsLoading } = useHackathonTeams(hackathonId);
  const allTeams = teamsData?.data || [];
  const { data: regData } = useHackathonRegistration(hackathon?.id);
  const isRegistered = regData?.registered ?? false;
  const isOrganizer = user?.id && hackathon?.organizerId === user.id;
  const phase = useHackathonPhase(hackathon);

  const { data: suggestionsData, isLoading: suggestionsLoading } = useTeamSuggestions(
    showSuggestions ? hackathonId : undefined
  );
  const suggestions = suggestionsData?.data || [];
  const autoMatch = useAutoMatch();

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

  const handleAutoMatch = async () => {
    try {
      const result = await autoMatch.mutateAsync({ hackathon_id: hackathonId });
      toast.success(`Auto-matching complete!`, {
        description: `${result.teamsCreated} teams created from ${result.matched} participants.`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to auto-match teams");
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
              <div className="flex gap-2 flex-wrap">
                {isRegistered && phase.canFormTeams && (
                  <Button
                    variant="outline"
                    onClick={() => setShowSuggestions((v) => !v)}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    {showSuggestions ? "Hide Suggestions" : "Find Teammates"}
                  </Button>
                )}
                {isOrganizer && (
                  <Button
                    variant="outline"
                    onClick={handleAutoMatch}
                    disabled={autoMatch.isPending}
                    className="gap-2"
                  >
                    {autoMatch.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    Auto-Match Teams
                  </Button>
                )}
                {phase.canFormTeams && (
                  <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Team
                  </Button>
                )}
              </div>
            </div>
            {!phase.canFormTeams && (
              <div className="mt-4 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                {phase.getMessage("formTeams")}
              </div>
            )}
          </div>

          {/* Teammate Suggestions Panel */}
          <AnimatePresence>
            {showSuggestions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <h3 className="font-display font-semibold text-lg">
                          Suggested Teammates
                        </h3>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSuggestions(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Based on your skills and interests, here are participants who would complement your team.
                    </p>

                    {suggestionsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="ml-2 text-sm text-muted-foreground">
                          Finding compatible teammates...
                        </span>
                      </div>
                    ) : suggestions.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No suggestions available. All participants may already be on teams.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {suggestions.map((suggestion, i) => (
                          <SuggestionCard key={suggestion.user.id} suggestion={suggestion} index={i} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

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
                                title="Register for the competition to join a team"
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

// =====================================================
// Suggestion Card Component
// =====================================================

function SuggestionCard({ suggestion, index }: { suggestion: TeamSuggestion; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="hover:shadow-md transition-all duration-200">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar size="sm" className="border-2 border-background">
              <AvatarImage src={suggestion.user.avatar} alt={suggestion.user.name} />
              <AvatarFallback>{getInitials(suggestion.user.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{suggestion.user.name}</p>
              {suggestion.user.headline && (
                <p className="text-xs text-muted-foreground truncate">
                  {suggestion.user.headline}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <div
                className={cn(
                  "text-xs font-bold px-2 py-1 rounded-full",
                  suggestion.compatibilityScore >= 70
                    ? "bg-green-500/10 text-green-600"
                    : suggestion.compatibilityScore >= 40
                    ? "bg-yellow-500/10 text-yellow-600"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {suggestion.compatibilityScore}%
              </div>
            </div>
          </div>

          {/* Shared Skills */}
          {suggestion.sharedSkills.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                Shared Skills
              </p>
              <div className="flex flex-wrap gap-1">
                {suggestion.sharedSkills.slice(0, 4).map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-[10px]">
                    {skill}
                  </Badge>
                ))}
                {suggestion.sharedSkills.length > 4 && (
                  <Badge variant="outline" className="text-[10px]">
                    +{suggestion.sharedSkills.length - 4}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Complementary Skills */}
          {suggestion.complementarySkills.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                Brings New Skills
              </p>
              <div className="flex flex-wrap gap-1">
                {suggestion.complementarySkills.slice(0, 4).map((skill) => (
                  <Badge key={skill} className="text-[10px] bg-primary/10 text-primary">
                    {skill}
                  </Badge>
                ))}
                {suggestion.complementarySkills.length > 4 && (
                  <Badge variant="outline" className="text-[10px]">
                    +{suggestion.complementarySkills.length - 4}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Shared Interests */}
          {suggestion.sharedInterests.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                Shared Interests
              </p>
              <div className="flex flex-wrap gap-1">
                {suggestion.sharedInterests.slice(0, 3).map((interest) => (
                  <Badge key={interest} variant="outline" className="text-[10px]">
                    {interest}
                  </Badge>
                ))}
                {suggestion.sharedInterests.length > 3 && (
                  <Badge variant="outline" className="text-[10px]">
                    +{suggestion.sharedInterests.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
