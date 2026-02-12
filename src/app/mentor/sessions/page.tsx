"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Video,
  Calendar,
  Clock,
  XCircle,
  FileText,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { mockUsers } from "@/lib/mock-data";

const upcomingSessions = [
  {
    id: "us-1",
    teamName: "AI Pioneers",
    teamAvatar: "https://api.dicebear.com/7.x/shapes/svg?seed=aipioneers",
    members: [mockUsers[0], mockUsers[1], mockUsers[4]],
    dateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    topic: "ML Model Architecture Review",
    platform: "Zoom",
  },
  {
    id: "us-2",
    teamName: "Web3 Wizards",
    teamAvatar: "https://api.dicebear.com/7.x/shapes/svg?seed=web3wizards",
    members: [mockUsers[3], mockUsers[2]],
    dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    topic: "Smart Contract Security Best Practices",
    platform: "Google Meet",
  },
  {
    id: "us-3",
    teamName: "Code Crusaders",
    teamAvatar: "https://api.dicebear.com/7.x/shapes/svg?seed=team3",
    members: [mockUsers[0], mockUsers[4]],
    dateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    topic: "API Design Patterns",
    platform: "Discord",
  },
];

const pastSessions = [
  {
    id: "ps-1",
    teamName: "Byte Builders",
    members: [mockUsers[1], mockUsers[3]],
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    topic: "Database Schema Optimization",
    duration: "45 min",
  },
  {
    id: "ps-2",
    teamName: "Debug Squad",
    members: [mockUsers[2], mockUsers[4]],
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    topic: "React Performance Tuning",
    duration: "30 min",
  },
  {
    id: "ps-3",
    teamName: "AI Pioneers",
    members: [mockUsers[0], mockUsers[1]],
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    topic: "Data Pipeline Architecture",
    duration: "60 min",
  },
  {
    id: "ps-4",
    teamName: "Stack Overflow",
    members: [mockUsers[3]],
    date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    topic: "GraphQL Schema Design",
    duration: "30 min",
  },
  {
    id: "ps-5",
    teamName: "Tech Titans",
    members: [mockUsers[0], mockUsers[2], mockUsers[4]],
    date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    topic: "CI/CD Pipeline Setup",
    duration: "45 min",
  },
];

export default function MentorSessionsPage() {
  const handleJoin = (sessionId: string) => {
    toast.success("Joining session...", {
      description: "Opening video conference in a new tab.",
    });
  };

  const handleCancel = (sessionId: string) => {
    toast.success("Session cancelled", {
      description: "The team has been notified of the cancellation.",
    });
  };

  const handleViewNotes = (sessionId: string) => {
    toast.info("Session notes", {
      description: "Session notes feature coming soon.",
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
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                <Video className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold">
                  Mentoring Sessions
                </h1>
                <p className="text-muted-foreground">
                  Manage your upcoming and past mentoring sessions.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Tabs defaultValue="upcoming">
              <TabsList>
                <TabsTrigger value="upcoming">
                  Upcoming
                  <Badge variant="secondary" className="ml-1.5 text-[10px]">
                    {upcomingSessions.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="past">
                  Past
                  <Badge variant="secondary" className="ml-1.5 text-[10px]">
                    {pastSessions.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* Upcoming Sessions */}
              <TabsContent value="upcoming" className="mt-6">
                {upcomingSessions.length === 0 ? (
                  <div className="flex flex-col items-center py-16">
                    <Inbox className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="font-medium text-muted-foreground">
                      No upcoming sessions
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Teams will book sessions based on your availability.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingSessions.map((session, i) => (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Card className="hover:shadow-md transition-all duration-200">
                          <CardContent className="p-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-start gap-4">
                                {/* Avatar Group */}
                                <div className="flex -space-x-2 shrink-0">
                                  {session.members.slice(0, 3).map((member) => (
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
                                  {session.members.length > 3 && (
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted border-2 border-background text-xs font-medium">
                                      +{session.members.length - 3}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-semibold">
                                    {session.teamName}
                                  </h3>
                                  <p className="text-sm font-medium mt-0.5">
                                    {session.topic}
                                  </p>
                                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3.5 w-3.5" />
                                      {formatDate(session.dateTime)}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px]"
                                    >
                                      {session.platform}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <Button
                                  size="sm"
                                  onClick={() => handleJoin(session.id)}
                                >
                                  <Video className="mr-1.5 h-4 w-4" />
                                  Join Meeting
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancel(session.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <XCircle className="mr-1.5 h-4 w-4" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Past Sessions */}
              <TabsContent value="past" className="mt-6">
                {pastSessions.length === 0 ? (
                  <div className="flex flex-col items-center py-16">
                    <Inbox className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="font-medium text-muted-foreground">
                      No past sessions yet
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Completed sessions will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pastSessions.map((session, i) => (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Card>
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex -space-x-2 shrink-0">
                                {session.members.slice(0, 2).map((member) => (
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
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {session.teamName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {session.topic}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right hidden sm:block">
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(session.date)}
                                </p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                                  <Clock className="h-3 w-3" />
                                  {session.duration}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewNotes(session.id)}
                              >
                                <FileText className="mr-1.5 h-4 w-4" />
                                View Notes
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>
    </>
  );
}
