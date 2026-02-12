"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  UserPlus,
  Merge,
  Scissors,
  AlertCircle,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarGroup,
} from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import { mockHackathons, mockTeams, mockUsers } from "@/lib/mock-data";
import { toast } from "sonner";

const teamStatusConfig: Record<string, { label: string; variant: "muted" | "success" | "warning" }> = {
  forming: { label: "Forming", variant: "warning" },
  complete: { label: "Complete", variant: "success" },
  submitted: { label: "Submitted", variant: "muted" },
};

const orphanParticipants = mockUsers.slice(10, 13);

export default function TeamsManagementPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;
  const hackathon = mockHackathons.find((h) => h.id === hackathonId);

  if (!hackathon) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h2 className="font-display text-2xl font-bold mb-2">Hackathon Not Found</h2>
            <Link href="/dashboard/hackathons">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        </main>
      </>
    );
  }

  const teams = mockTeams.filter((t) => t.hackathonId === hackathonId).length > 0
    ? mockTeams.filter((t) => t.hackathonId === hackathonId)
    : mockTeams.slice(0, 6);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link
            href={`/dashboard/hackathons/${hackathonId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Overview
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="font-display text-3xl font-bold">Teams</h1>
            <p className="text-muted-foreground mt-1">
              {teams.length} teams registered
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("Teams merged successfully!")}
            >
              <Merge className="h-4 w-4" />
              Merge Teams
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("Team split successfully!")}
            >
              <Scissors className="h-4 w-4" />
              Split Team
            </Button>
          </div>
        </motion.div>

        {/* Team Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {teams.map((team, i) => {
            const statusConf = teamStatusConfig[team.status] || {
              label: team.status,
              variant: "muted" as const,
            };
            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card hover className="h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-display font-bold text-lg">
                        {team.name}
                      </h3>
                      <Badge variant={statusConf.variant}>
                        {statusConf.label}
                      </Badge>
                    </div>

                    {team.description && (
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
                    {team.lookingForRoles &&
                      team.lookingForRoles.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <UserPlus className="h-3 w-3" />
                          <span>
                            Looking for: {team.lookingForRoles.join(", ")}
                          </span>
                        </div>
                      )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Orphan Participants */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">Orphan Participants</CardTitle>
                <Badge variant="warning">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {orphanParticipants.length} without a team
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                These participants have not joined a team yet. Consider helping
                them find a group or forming new teams.
              </p>
              <div className="space-y-3">
                {orphanParticipants.map((user, i) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + i * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-xl border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar size="sm">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.skills.slice(0, 3).join(", ")}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        toast.success(`Invite sent to ${user.name}`)
                      }
                    >
                      <UserPlus className="h-3 w-3" />
                      Assign
                    </Button>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </>
  );
}
