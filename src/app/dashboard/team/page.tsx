"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, Trophy, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getTeamsForUser, mockHackathons } from "@/lib/mock-data";

const statusColors: Record<string, string> = {
  forming: "bg-blue-500/10 text-blue-500",
  complete: "bg-green-500/10 text-green-500",
  submitted: "bg-amber-500/10 text-amber-500",
};

export default function TeamsPage() {
  const teams = getTeamsForUser("user-1");

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display text-3xl font-bold mb-1">My Teams</h1>
            <p className="text-muted-foreground">{teams.length} teams across hackathons</p>
          </motion.div>

          {teams.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-display text-lg font-bold mb-1">No teams yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Join a hackathon and create or join a team to get started.
              </p>
              <Button asChild>
                <Link href="/explore">Browse Hackathons</Link>
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {teams.map((team, i) => {
                const hackathon = mockHackathons.find((h) => h.id === team.hackathonId);

                return (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          {/* Avatar & Info */}
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={team.avatar} />
                              <AvatarFallback>{team.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-display text-lg font-bold truncate">{team.name}</h3>
                                <Badge className={cn("text-xs", statusColors[team.status] || "")}>
                                  {team.status}
                                </Badge>
                              </div>
                              {team.description && (
                                <p className="text-sm text-muted-foreground truncate">{team.description}</p>
                              )}
                              {hackathon && (
                                <Link
                                  href={`/hackathons/${hackathon.slug}`}
                                  className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                                >
                                  <Trophy className="h-3 w-3" />
                                  {hackathon.name}
                                </Link>
                              )}
                            </div>
                          </div>

                          {/* Members */}
                          <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                              {team.members.slice(0, 4).map((member) => (
                                <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                                  <AvatarImage src={member.user.avatar} />
                                  <AvatarFallback className="text-xs">
                                    {member.user.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {team.members.length > 4 && (
                                <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                                  +{team.members.length - 4}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {team.members.length}/{team.maxSize}
                            </span>
                          </div>

                          {/* Action */}
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/team/${team.id}`}>
                              View
                              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                            </Link>
                          </Button>
                        </div>

                        {/* Looking for roles */}
                        {team.lookingForRoles && team.lookingForRoles.length > 0 && (
                          <div className="mt-3 pt-3 border-t flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Looking for:</span>
                            {team.lookingForRoles.map((role) => (
                              <Badge key={role} variant="outline" className="text-xs">
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
          )}
        </div>
      </main>
    </div>
  );
}
