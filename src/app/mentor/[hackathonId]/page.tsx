"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  GraduationCap,
  Users,
  Calendar,
  Video,
  Star,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { useHackathon } from "@/hooks/use-hackathons";
import { mockUsers } from "@/lib/mock-data";

const assignedTeams = [
  {
    id: "team-a",
    name: "AI Pioneers",
    avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=aipioneers",
    members: [mockUsers[0], mockUsers[1], mockUsers[4]],
    track: "AI/ML Innovation",
    sessionCount: 3,
  },
  {
    id: "team-b",
    name: "Web3 Wizards",
    avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=web3wizards",
    members: [mockUsers[3], mockUsers[2]],
    track: "Web3 & Blockchain",
    sessionCount: 2,
  },
  {
    id: "team-c",
    name: "Code Crusaders",
    avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=team3",
    members: [mockUsers[0], mockUsers[4]],
    track: "Developer Tools",
    sessionCount: 2,
  },
  {
    id: "team-d",
    name: "Debug Squad",
    avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=team8",
    members: [mockUsers[2], mockUsers[1], mockUsers[3]],
    track: "Social Impact",
    sessionCount: 1,
  },
];

const sessionLog = [
  {
    id: "log-1",
    teamName: "AI Pioneers",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    topic: "ML Model Architecture Review",
    duration: "45 min",
    notes: "Discussed transformer vs. CNN approach. Recommended starting with a lighter model.",
  },
  {
    id: "log-2",
    teamName: "Web3 Wizards",
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    topic: "Smart Contract Audit",
    duration: "30 min",
    notes: "Reviewed gas optimization and reentrancy guards.",
  },
  {
    id: "log-3",
    teamName: "Code Crusaders",
    date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    topic: "CI/CD Pipeline Setup",
    duration: "30 min",
    notes: "Set up GitHub Actions workflow for automated testing and deployment.",
  },
];

const quickStats = [
  { label: "Teams Assigned", value: 4, icon: Users },
  { label: "Sessions Completed", value: 8, icon: Video },
  { label: "Avg Rating", value: "4.8/5", icon: Star },
];

export default function HackathonMentoringPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;
  const { data: hackathonData, isLoading } = useHackathon(hackathonId);
  const hackathon = hackathonData?.data;

  if (isLoading) return <><Navbar /><main className="min-h-screen bg-background pt-24 pb-16"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="shimmer rounded-xl h-96 w-full" /></div></main></>;

  if (!hackathon) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <GraduationCap className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h1 className="font-display text-2xl font-bold">
                Hackathon Not Found
              </h1>
              <p className="text-muted-foreground mt-2">
                The hackathon you are looking for does not exist.
              </p>
              <Button asChild className="mt-6">
                <Link href="/mentor">Back to Mentor Dashboard</Link>
              </Button>
            </motion.div>
          </div>
        </main>
      </>
    );
  }

  const handleSchedule = (teamName: string) => {
    toast.success("Session scheduled!", {
      description: `A mentoring session has been scheduled with ${teamName}.`,
    });
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link
              href="/mentor"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Mentor Dashboard
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display text-3xl font-bold">
              {hackathon.name}
            </h1>
            <p className="text-muted-foreground mt-1">Mentoring Overview</p>
            <Badge
              variant={hackathon.status === "hacking" ? "warning" : "secondary"}
              className="mt-2"
            >
              {hackathon.status}
            </Badge>
          </motion.div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
            {quickStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card>
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <stat.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-bold font-display">
                        {stat.value}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Assigned Teams */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="font-display text-xl font-bold mb-4">
              Assigned Teams
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {assignedTeams.map((team, i) => (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Avatar Group */}
                        <div className="flex -space-x-2 shrink-0">
                          {team.members.slice(0, 3).map((member) => (
                            <Avatar
                              key={member.id}
                              size="sm"
                              className="border-2 border-background"
                            >
                              <AvatarImage
                                src={member.avatar}
                                alt={member.name}
                              />
                              <AvatarFallback>
                                {getInitials(member.name)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {team.members.length > 3 && (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted border-2 border-background text-xs font-medium">
                              +{team.members.length - 3}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold">{team.name}</h3>
                          <Badge
                            variant="outline"
                            className="text-[10px] mt-1"
                          >
                            {team.track}
                          </Badge>
                          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {team.members.length} members
                            </span>
                            <span className="flex items-center gap-1">
                              <Video className="h-3 w-3" />
                              {team.sessionCount} sessions
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full mt-4"
                        onClick={() => handleSchedule(team.name)}
                      >
                        <Calendar className="mr-1.5 h-4 w-4" />
                        Schedule Session
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Session Log */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="font-display text-xl font-bold mb-4">
              Session Log
            </h2>
            <div className="space-y-3">
              {sessionLog.map((session, i) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 + i * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm">
                              {session.teamName}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatDate(session.date)}</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {session.duration}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm font-medium mt-0.5">
                            {session.topic}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {session.notes}
                          </p>
                        </div>
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
