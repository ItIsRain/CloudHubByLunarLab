"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Users,
  UserPlus,
  Settings,
  Crown,
  Code,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import dynamic from "next/dynamic";
const InviteTeamMemberDialog = dynamic(() => import("@/components/dialogs/invite-team-member-dialog").then(m => m.InviteTeamMemberDialog), { ssr: false });
const EditTeamDialog = dynamic(() => import("@/components/dialogs/edit-team-dialog").then(m => m.EditTeamDialog), { ssr: false });
import { cn, getInitials, formatDate } from "@/lib/utils";
import { useTeam } from "@/hooks/use-teams";
import { useHackathons } from "@/hooks/use-hackathons";
import type { TeamStatus } from "@/lib/types";

const statusColors: Record<TeamStatus, string> = {
  forming: "bg-blue-500/10 text-blue-600",
  complete: "bg-success/10 text-success",
  submitted: "bg-primary/10 text-primary",
};

export default function TeamWorkspacePage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { data: hackathonsData } = useHackathons();
  const hackathons = hackathonsData?.data || [];

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

  const handleInvite = (userId: string) => {
    toast.success("Invitation sent!");
    console.log("Invited:", userId);
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-foreground">{team.name}</span>
          </div>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-3xl font-bold">{team.name}</h1>
                  <Badge className={cn(statusColors[team.status], "capitalize")}>
                    {team.status}
                  </Badge>
                </div>
                {hackathon && (
                  <p className="text-muted-foreground mt-1">
                    {hackathon.name}
                    {team.track && <> &middot; {team.track.name}</>}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {team.members.length < team.maxSize && (
                <Button
                  variant="outline"
                  onClick={() => setShowInviteDialog(true)}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Invite Member
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setShowEditDialog(true)}>
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {team.description && (
            <p className="text-muted-foreground max-w-2xl">{team.description}</p>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Members */}
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Members ({team.members.length}/{team.maxSize})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {team.members.map((member, i) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted/50 transition-colors"
                    >
                      <Avatar size="lg">
                        <AvatarImage src={member.user.avatar} alt={member.user.name} />
                        <AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{member.user.name}</p>
                          {member.isLeader && (
                            <Crown className="h-4 w-4 text-warning" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {formatDate(member.joinedAt)}
                        </p>
                      </div>
                      {member.user.github && (
                        <a
                          href={`https://github.com/${member.user.github}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Code className="h-4 w-4" />
                        </a>
                      )}
                    </motion.div>
                  ))}
                </CardContent>
              </Card>

              {/* Project section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Project
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {team.submission ? (
                    <div className="space-y-3">
                      <div>
                        <p className="font-semibold text-lg">{team.submission.projectName}</p>
                        <p className="text-sm text-muted-foreground">{team.submission.tagline}</p>
                      </div>
                      <div className="flex gap-2">
                        {team.submission.githubUrl && (
                          <Button variant="outline" size="sm" asChild className="gap-1.5">
                            <a href={team.submission.githubUrl} target="_blank" rel="noopener noreferrer">
                              <Code className="h-3.5 w-3.5" />
                              GitHub
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        )}
                        <Button variant="outline" size="sm" asChild className="gap-1.5">
                          <Link href={`/dashboard/submissions/${team.submission.id}`}>
                            View Submission
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 border border-dashed border-border rounded-xl">
                      <Code className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium">No project submitted yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Start building and submit your project
                      </p>
                      <Button size="sm" className="mt-4" asChild>
                        <Link href="/dashboard/submissions/new">Submit Project</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Looking for */}
              {team.lookingForRoles && team.lookingForRoles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Looking For</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Team Chat
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                  <CardHeader>
                    <CardTitle className="text-base">Track</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
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
    </div>
  );
}
