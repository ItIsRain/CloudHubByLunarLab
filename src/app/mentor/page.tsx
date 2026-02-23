"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Calendar,
  Clock,
  Users,
  Video,
  ArrowRight,
  Settings,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import { useHackathons } from "@/hooks/use-hackathons";

export default function MentorDashboardPage() {
  const { data: hackathonsData, isLoading: hackathonsLoading } = useHackathons();
  const hackathons = hackathonsData?.data || [];
  const activeHackathons = hackathons.filter(
    (h) => h.status === "hacking" || h.status === "submission" || h.status === "registration-open"
  );

  const stats = [
    { label: "Active Hackathons", value: activeHackathons.length, icon: Calendar, color: "text-blue-500" },
    { label: "Total Hackathons", value: hackathons.length, icon: Clock, color: "text-amber-500" },
    { label: "Total Teams", value: hackathons.reduce((sum, h) => sum + (h.teamCount || 0), 0), icon: Users, color: "text-green-500" },
    { label: "Participants", value: hackathons.reduce((sum, h) => sum + (h.participantCount || 0), 0), icon: Video, color: "text-primary" },
  ];

  if (hackathonsLoading)
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="shimmer rounded-xl h-96 w-full" />
          </div>
        </main>
      </>
    );

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="font-display text-3xl font-bold">
                    Mentor Dashboard
                  </h1>
                  <p className="text-muted-foreground">
                    Help teams build amazing projects.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/mentor/availability">
                    <Settings className="mr-1.5 h-4 w-4" />
                    Availability
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/mentor/sessions">
                    <Video className="mr-1.5 h-4 w-4" />
                    All Sessions
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="relative overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {stat.label}
                        </p>
                        <p className="mt-1 text-3xl font-bold font-display">
                          {stat.value}
                        </p>
                      </div>
                      <stat.icon
                        className={cn("h-8 w-8 opacity-80", stat.color)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Active Hackathons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <h2 className="font-display text-xl font-bold mb-4">
              Active Hackathons
            </h2>
            {activeHackathons.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No active hackathons to mentor at the moment.
                  </p>
                  <Button asChild variant="outline" className="mt-4">
                    <Link href="/explore/hackathons">Browse Hackathons</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {activeHackathons.map((h, i) => (
                  <motion.div
                    key={h.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.05 }}
                  >
                    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-display text-lg font-bold group-hover:text-primary transition-colors">
                            {h.name}
                          </h3>
                          <Badge
                            variant={
                              h.status === "hacking" ? "warning" : "secondary"
                            }
                          >
                            {h.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {h.tagline}
                        </p>
                        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{h.participantCount} participants</span>
                          <span>{h.teamCount} teams</span>
                        </div>
                        <Button asChild size="sm" className="w-full mt-4">
                          <Link href={`/mentor/${h.id}`}>
                            View Teams
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* All Hackathons */}
          {hackathons.length > activeHackathons.length && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mt-8"
            >
              <h2 className="font-display text-xl font-bold mb-4">
                All Hackathons
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {hackathons
                  .filter((h) => !activeHackathons.includes(h))
                  .map((h, i) => (
                    <motion.div
                      key={h.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                    >
                      <Card>
                        <CardContent className="p-5">
                          <h3 className="font-semibold">{h.name}</h3>
                          <Badge variant="outline" className="mt-1 text-[10px]">
                            {h.status}
                          </Badge>
                          <div className="mt-2 text-sm text-muted-foreground">
                            {h.teamCount} teams
                          </div>
                          <Button asChild variant="outline" size="sm" className="w-full mt-3">
                            <Link href={`/mentor/${h.id}`}>View</Link>
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </>
  );
}
