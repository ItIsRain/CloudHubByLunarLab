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
  CheckCircle2,
  Timer,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { mockUsers } from "@/lib/mock-data";
import { useHackathons } from "@/hooks/use-hackathons";

const stats = [
  { label: "Active Hackathons", value: 2, icon: Calendar, color: "text-blue-500" },
  { label: "Upcoming Sessions", value: 3, icon: Clock, color: "text-amber-500" },
  { label: "Total Sessions", value: 15, icon: Video, color: "text-green-500" },
  { label: "Hours Mentored", value: 22, icon: Timer, color: "text-primary" },
];

const upcomingSessions = [
  {
    id: "session-1",
    teamName: "AI Pioneers",
    teamAvatar: "https://api.dicebear.com/7.x/shapes/svg?seed=aipioneers",
    dateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    topic: "ML Model Architecture Review",
    platform: "Zoom",
  },
  {
    id: "session-2",
    teamName: "Web3 Wizards",
    teamAvatar: "https://api.dicebear.com/7.x/shapes/svg?seed=web3wizards",
    dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    topic: "Smart Contract Security Best Practices",
    platform: "Google Meet",
  },
  {
    id: "session-3",
    teamName: "Code Crusaders",
    teamAvatar: "https://api.dicebear.com/7.x/shapes/svg?seed=team3",
    dateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    topic: "API Design Patterns",
    platform: "Discord",
  },
];

const pastSessions = [
  {
    id: "past-1",
    teamName: "Byte Builders",
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    topic: "Database Schema Optimization",
    duration: "45 min",
  },
  {
    id: "past-2",
    teamName: "Debug Squad",
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    topic: "React Performance Tuning",
    duration: "30 min",
  },
];

export default function MentorDashboardPage() {
  const { data: hackathonsData, isLoading: hackathonsLoading } = useHackathons();
  const hackathons = hackathonsData?.data || [];
  const activeHackathons = hackathons.slice(0, 2);

  const handleJoin = (sessionId: string) => {
    toast.success("Joining session...", {
      description: "Opening video conference in a new tab.",
    });
  };

  if (hackathonsLoading) return <><Navbar /><main className="min-h-screen bg-background pt-24 pb-16"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="shimmer rounded-xl h-96 w-full" /></div></main></>;

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
          </motion.div>

          {/* Upcoming Sessions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-8"
          >
            <h2 className="font-display text-xl font-bold mb-4">
              Upcoming Sessions
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {upcomingSessions.map((session, i) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-all duration-200">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar size="sm">
                          <AvatarImage
                            src={session.teamAvatar}
                            alt={session.teamName}
                          />
                          <AvatarFallback>
                            {getInitials(session.teamName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">
                            {session.teamName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(session.dateTime)}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-medium">{session.topic}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {session.platform}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        className="w-full mt-4"
                        onClick={() => handleJoin(session.id)}
                      >
                        <Video className="mr-1.5 h-4 w-4" />
                        Join
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Past Sessions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mt-8"
          >
            <h2 className="font-display text-xl font-bold mb-4">
              Recent Past Sessions
            </h2>
            <div className="space-y-3">
              {pastSessions.map((session, i) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                        <div>
                          <p className="font-medium text-sm">
                            {session.teamName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.topic}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {formatDate(session.date)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.duration}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </>
  );
}
