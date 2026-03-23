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
  CheckCircle2,
  Star,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { useMyMentorSessions, useUpdateSession } from "@/hooks/use-mentor-sessions";
import { useAuthStore } from "@/store/auth-store";
import type { MentorSession } from "@/lib/types";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600",
  confirmed: "bg-blue-500/10 text-blue-600",
  completed: "bg-green-500/10 text-green-600",
  cancelled: "bg-red-500/10 text-red-600",
  no_show: "bg-muted text-muted-foreground",
};

const platformLabels: Record<string, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  teams: "Teams",
  discord: "Discord",
  in_person: "In Person",
  other: "Other",
};

export default function MentorSessionsPage() {
  const user = useAuthStore((s) => s.user);
  const { data: sessionsData, isLoading } = useMyMentorSessions();
  const updateSession = useUpdateSession();
  const allSessions = sessionsData?.data || [];

  const now = new Date();
  const upcomingSessions = allSessions.filter(
    (s) =>
      new Date(s.sessionDate) >= now &&
      (s.status === "pending" || s.status === "confirmed")
  );
  const pastSessions = allSessions.filter(
    (s) =>
      new Date(s.sessionDate) < now ||
      s.status === "completed" ||
      s.status === "cancelled" ||
      s.status === "no_show"
  );

  const handleConfirm = async (session: MentorSession) => {
    try {
      await updateSession.mutateAsync({
        sessionId: session.id,
        status: "confirmed",
      });
      toast.success("Session confirmed!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to confirm session");
    }
  };

  const handleComplete = async (session: MentorSession) => {
    try {
      await updateSession.mutateAsync({
        sessionId: session.id,
        status: "completed",
      });
      toast.success("Session marked as completed!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete session");
    }
  };

  const handleCancel = async (session: MentorSession) => {
    try {
      await updateSession.mutateAsync({
        sessionId: session.id,
        status: "cancelled",
        cancellation_reason: "Cancelled by user",
      });
      toast.success("Session cancelled", {
        description: "The other participant has been notified.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel session");
    }
  };

  const handleJoin = (session: MentorSession) => {
    const url = session.meetingUrl;
    if (url?.startsWith("http://") || url?.startsWith("https://")) {
      window.open(url, "_blank");
    } else if (url) {
      toast.error("Invalid meeting URL.");
    } else {
      toast.info("No meeting URL set for this session.");
    }
  };

  const isMentor = (session: MentorSession) => user?.id === session.mentorId;

  const getOtherUser = (session: MentorSession) => {
    return isMentor(session) ? session.mentee : session.mentor;
  };

  if (isLoading) {
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
  }

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
                    {upcomingSessions.map((session, i) => {
                      const other = getOtherUser(session);
                      return (
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
                                  <Avatar size="sm" className="border-2 border-background shrink-0">
                                    <AvatarImage
                                      src={other?.avatar}
                                      alt={other?.name || "User"}
                                    />
                                    <AvatarFallback>
                                      {getInitials(other?.name || "?")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h3 className="font-semibold">
                                      {session.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                      with {other?.name || "Unknown"}{" "}
                                      <span className="text-xs">
                                        ({isMentor(session) ? "mentee" : "mentor"})
                                      </span>
                                    </p>
                                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {formatDate(session.sessionDate)}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5" />
                                        {session.durationMinutes} min
                                      </span>
                                      {session.platform && (
                                        <Badge variant="outline" className="text-[10px]">
                                          {platformLabels[session.platform] || session.platform}
                                        </Badge>
                                      )}
                                      <Badge className={cn(statusColors[session.status], "text-[10px]")}>
                                        {session.status}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  {session.status === "confirmed" && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleJoin(session)}
                                    >
                                      <Video className="mr-1.5 h-4 w-4" />
                                      Join
                                    </Button>
                                  )}
                                  {session.status === "pending" && isMentor(session) && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleConfirm(session)}
                                      disabled={updateSession.isPending}
                                    >
                                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                                      Confirm
                                    </Button>
                                  )}
                                  {session.status === "confirmed" && isMentor(session) && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleComplete(session)}
                                      disabled={updateSession.isPending}
                                    >
                                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                                      Complete
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleCancel(session)}
                                    disabled={updateSession.isPending}
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
                      );
                    })}
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
                    {pastSessions.map((session, i) => {
                      const other = getOtherUser(session);
                      return (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <Card>
                            <CardContent className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <Avatar size="sm" className="border-2 border-background shrink-0">
                                  <AvatarImage
                                    src={other?.avatar}
                                    alt={other?.name || "User"}
                                  />
                                  <AvatarFallback>
                                    {getInitials(other?.name || "?")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">
                                    {session.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    with {other?.name || "Unknown"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right hidden sm:block">
                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(session.sessionDate)}
                                  </p>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                                    <Clock className="h-3 w-3" />
                                    {session.durationMinutes} min
                                  </p>
                                </div>
                                <Badge className={cn(statusColors[session.status], "text-[10px]")}>
                                  {session.status}
                                </Badge>
                                {session.status === "completed" &&
                                  ((isMentor(session) && !session.mentorFeedbackRating) ||
                                    (!isMentor(session) && !session.menteeFeedbackRating)) && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        toast.info("Feedback feature coming soon.")
                                      }
                                    >
                                      <Star className="mr-1.5 h-4 w-4" />
                                      Rate
                                    </Button>
                                  )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
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
