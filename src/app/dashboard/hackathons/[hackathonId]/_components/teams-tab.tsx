"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  UsersRound,
  UserPlus,
  ChevronRight,
  Crown,
  ExternalLink,
  X,
  Mail,
  MapPin,
  Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarGroup,
} from "@/components/ui/avatar";
import { cn, getInitials, formatDate } from "@/lib/utils";
import type { Hackathon, Team, TeamMember } from "@/lib/types";
import { useHackathonTeams } from "@/hooks/use-teams";

interface TeamsTabProps {
  hackathon: Hackathon;
  hackathonId: string;
}

const teamStatusConfig: Record<
  string,
  { label: string; variant: "muted" | "success" | "warning" | "gradient" }
> = {
  forming: { label: "Forming", variant: "warning" },
  complete: { label: "Complete", variant: "success" },
  submitted: { label: "Submitted", variant: "gradient" },
};

export function TeamsTab({ hackathon, hackathonId }: TeamsTabProps) {
  const { data: teamsData, isLoading } = useHackathonTeams(hackathonId);
  const teams = teamsData?.data ?? [];
  const [selectedTeamId, setSelectedTeamId] = React.useState<string | null>(
    null
  );

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">Teams</h2>
            <p className="text-muted-foreground mt-1">
              {isLoading ? "--" : teams.length} teams registered
            </p>
          </div>
        </div>
      </motion.div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shimmer rounded-xl h-48 w-full" />
          ))}
        </div>
      )}

      {/* Team Cards + Detail Panel */}
      {!isLoading && teams.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Team Grid */}
          <div
            className={cn(
              "grid grid-cols-1 gap-4 transition-all duration-300",
              selectedTeam
                ? "md:grid-cols-1 lg:w-[340px] lg:shrink-0"
                : "md:grid-cols-2 lg:grid-cols-3 w-full"
            )}
          >
            {teams.map((team, i) => {
              const statusConf = teamStatusConfig[team.status] || {
                label: team.status,
                variant: "muted" as const,
              };
              const isSelected = team.id === selectedTeamId;

              return (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    hover
                    className={cn(
                      "h-full cursor-pointer transition-all duration-200",
                      isSelected &&
                        "ring-2 ring-primary shadow-md bg-primary/[0.02]"
                    )}
                    onClick={() =>
                      setSelectedTeamId(isSelected ? null : team.id)
                    }
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-display font-bold text-lg truncate">
                          {team.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge variant={statusConf.variant}>
                            {statusConf.label}
                          </Badge>
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform duration-200",
                              isSelected && "rotate-90"
                            )}
                          />
                        </div>
                      </div>

                      {team.description && !selectedTeam && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {team.description}
                        </p>
                      )}

                      {team.track && (
                        <div className="mb-3">
                          <Badge variant="outline" className="text-xs">
                            {team.track.name}
                          </Badge>
                        </div>
                      )}

                      {/* Members - stacked avatars */}
                      <div className="flex items-center gap-3 mb-3">
                        <AvatarGroup
                          avatars={team.members.map((m) => ({
                            src: m.user.avatar,
                            name: m.user.name,
                          }))}
                          max={4}
                          size="sm"
                        />
                        <span className="text-xs text-muted-foreground">
                          {team.members.length}/{team.maxSize} members
                        </span>
                      </div>

                      {/* Looking for roles */}
                      {!selectedTeam &&
                        team.lookingForRoles &&
                        team.lookingForRoles.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <UserPlus className="h-3 w-3 text-muted-foreground shrink-0" />
                            {team.lookingForRoles.map((role) => (
                              <Badge
                                key={role}
                                variant="secondary"
                                className="text-xs"
                              >
                                {role}
                              </Badge>
                            ))}
                          </div>
                        )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Detail Panel */}
          <AnimatePresence mode="wait">
            {selectedTeam && (
              <motion.div
                key={selectedTeam.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-w-0"
              >
                <TeamDetailPanel
                  team={selectedTeam}
                  onClose={() => setSelectedTeamId(null)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && teams.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <UsersRound className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="font-display text-xl font-bold mb-2">
            No teams yet
          </h3>
          <p className="text-muted-foreground max-w-md">
            Teams will appear here once participants start forming groups for
            the hackathon.
          </p>
        </motion.div>
      )}
    </div>
  );
}

function TeamDetailPanel({
  team,
  onClose,
}: {
  team: Team;
  onClose: () => void;
}) {
  const statusConf = teamStatusConfig[team.status] || {
    label: team.status,
    variant: "muted" as const,
  };

  // Sort members so leader is first
  const sortedMembers = [...team.members].sort(
    (a, b) => (b.isLeader ? 1 : 0) - (a.isLeader ? 1 : 0)
  );

  return (
    <Card className="sticky top-28">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display text-xl font-bold truncate">
                {team.name}
              </h3>
              <Badge variant={statusConf.variant}>{statusConf.label}</Badge>
            </div>
            {team.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {team.description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="shrink-0 -mt-1 -mr-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-2 mb-5">
          {team.track && (
            <Badge variant="outline" className="text-xs">
              {team.track.name}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            {team.members.length}/{team.maxSize} members
          </Badge>
          {team.lookingForRoles && team.lookingForRoles.length > 0 && (
            <Badge variant="secondary" className="text-xs gap-1">
              <UserPlus className="h-3 w-3" />
              Looking for {team.lookingForRoles.join(", ")}
            </Badge>
          )}
        </div>

        {/* Divider */}
        <div className="border-t mb-5" />

        {/* Members Header */}
        <div className="flex items-center gap-2 mb-4">
          <UsersRound className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-medium text-sm">
            Team Members ({team.members.length})
          </h4>
        </div>

        {/* Member List */}
        <div className="space-y-3">
          {sortedMembers.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <MemberRow member={member} />
            </motion.div>
          ))}
        </div>

        {/* Created date */}
        <div className="border-t mt-5 pt-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Created {formatDate(team.createdAt)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MemberRow({ member }: { member: TeamMember }) {
  const { user } = member;

  return (
    <Link
      href={`/profile/${user.username}`}
      className="group flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
    >
      <Avatar size="md" className="shrink-0">
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">
            {user.name}
          </span>
          {member.isLeader && (
            <Badge
              variant="gradient"
              className="text-[10px] px-1.5 py-0 h-4 gap-0.5"
            >
              <Crown className="h-2.5 w-2.5" />
              Leader
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {member.role && (
            <span className="text-xs text-muted-foreground">{member.role}</span>
          )}
          {user.location && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <MapPin className="h-2.5 w-2.5" />
                {user.location}
              </span>
            </>
          )}
        </div>
      </div>

      <ExternalLink className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors shrink-0" />
    </Link>
  );
}
