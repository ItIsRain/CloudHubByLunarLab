"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Users,
  UsersRound,
  FileText,
  DollarSign,
  Inbox,
  GraduationCap,
  UserCheck,
  Handshake,
  Clock,
  Megaphone,
  CheckCircle2,
  Circle,
  Flag,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import type { Hackathon, CompetitionPhase } from "@/lib/types";
import { useHackathonParticipants } from "@/hooks/use-hackathon-participants";
import { useHackathonTeams } from "@/hooks/use-teams";
import { useHackathonSubmissions } from "@/hooks/use-submissions";
import { useHackathonAnnouncements } from "@/hooks/use-hackathon-announcements";
import { usePhases } from "@/hooks/use-phases";

interface OverviewTabProps {
  hackathon: Hackathon;
  hackathonId: string;
}

interface TimelineEntry {
  id: string;
  label: string;
  date: string;
  endDate?: string;
  description?: string;
  isCompetitionPhase: boolean;
  phaseType?: CompetitionPhase["phaseType"];
  status?: CompetitionPhase["status"];
  campusFilter?: string | null;
}

const fallbackActivity = [
  {
    id: "fallback-1",
    action: "New team registered",
    detail: "Code Crusaders joined the hackathon",
    time: "2 hours ago",
    icon: UsersRound,
  },
  {
    id: "fallback-2",
    action: "Submission received",
    detail: "Team AI Pioneers submitted their project",
    time: "5 hours ago",
    icon: Inbox,
  },
  {
    id: "fallback-3",
    action: "Mentor session booked",
    detail: "Sarah Kim booked a session with Team Byte Builders",
    time: "8 hours ago",
    icon: GraduationCap,
  },
  {
    id: "fallback-4",
    action: "New participant",
    detail: "Emma Wilson registered for the hackathon",
    time: "12 hours ago",
    icon: UserCheck,
  },
  {
    id: "fallback-5",
    action: "Sponsor update",
    detail: "TechGiant increased their prize contribution",
    time: "1 day ago",
    icon: Handshake,
  },
];

export function OverviewTab({ hackathon, hackathonId }: OverviewTabProps) {
  const { data: participantsData, isLoading: participantsLoading } =
    useHackathonParticipants(hackathonId);
  const { data: teamsData, isLoading: teamsLoading } =
    useHackathonTeams(hackathonId);
  const { data: submissionsData, isLoading: submissionsLoading } =
    useHackathonSubmissions(hackathonId);
  const { data: announcementsData } =
    useHackathonAnnouncements(hackathonId);
  const { data: phasesData, isLoading: phasesLoading } =
    usePhases(hackathonId);

  const participantCount = participantsData?.data?.length ?? hackathon.participantCount ?? 0;
  const teamCount = teamsData?.data?.length ?? hackathon.teamCount ?? 0;
  const submissionCount = submissionsData?.data?.length ?? hackathon.submissionCount ?? 0;

  const stats = [
    {
      label: "Participants",
      value: participantsLoading ? "--" : String(participantCount),
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Teams",
      value: teamsLoading ? "--" : String(teamCount),
      icon: UsersRound,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Submissions",
      value: submissionsLoading ? "--" : String(submissionCount),
      icon: FileText,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Prize Pool",
      value: formatCurrency(
        (hackathon.prizes ?? []).reduce((sum, p) => sum + (p.value || 0), 0),
        hackathon.prizes?.[0]?.currency || "USD"
      ),
      icon: DollarSign,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
  ];

  // Build recent activity from announcements if available
  const announcements = announcementsData?.data ?? [];

  const recentActivity = announcements.length > 0
    ? announcements.slice(0, 5).map((a) => ({
        id: a.id,
        action: "Announcement sent",
        detail: a.title,
        time: formatRelativeTime(a.sentAt),
        icon: Megaphone,
      }))
    : fallbackActivity;

  // Build merged competition timeline
  const competitionPhases = phasesData?.data ?? [];

  const defaultMilestones: TimelineEntry[] = [
    { id: "reg-open", label: "Registration Opens", date: hackathon.registrationStart, isCompetitionPhase: false },
    { id: "reg-close", label: "Registration Closes", date: hackathon.registrationEnd, isCompetitionPhase: false },
    { id: "hack-start", label: "Hacking Starts", date: hackathon.hackingStart, isCompetitionPhase: false },
    { id: "sub-deadline", label: "Submission Deadline", date: hackathon.submissionDeadline, isCompetitionPhase: false },
    { id: "judge-start", label: "Judging Begins", date: hackathon.judgingStart, isCompetitionPhase: false },
    { id: "winners", label: "Winners Announced", date: hackathon.winnersAnnouncement, isCompetitionPhase: false },
  ];

  const phaseEntries: TimelineEntry[] = competitionPhases
    .filter((p) => p.startDate)
    .map((p) => ({
      id: p.id,
      label: p.name,
      date: p.startDate!,
      endDate: p.endDate ?? undefined,
      description: p.description,
      isCompetitionPhase: true,
      phaseType: p.phaseType,
      status: p.status,
      campusFilter: p.campusFilter,
    }));

  const mergedTimeline = [...defaultMilestones, ...phaseEntries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const phaseStatusColors: Record<string, { badge: string; label: string }> = {
    draft: { badge: "bg-muted text-muted-foreground", label: "Draft" },
    active: { badge: "bg-green-500/10 text-green-600 border-green-500/20", label: "Active" },
    scoring: { badge: "bg-blue-500/10 text-blue-600 border-blue-500/20", label: "Scoring" },
    calibration: { badge: "bg-amber-500/10 text-amber-600 border-amber-500/20", label: "Calibration" },
    completed: { badge: "bg-primary/10 text-primary border-primary/20", label: "Completed" },
  };

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      stat.bgColor
                    )}
                  >
                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Competition Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Competition Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {phasesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="shimmer h-10 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {mergedTimeline.map((entry, i) => {
                  const now = new Date();
                  const isPast = new Date(entry.date) < now;
                  const isCurrent =
                    isPast &&
                    entry.endDate &&
                    new Date(entry.endDate) > now;
                  const statusInfo = entry.status
                    ? phaseStatusColors[entry.status]
                    : undefined;

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.03 }}
                      className="flex items-start gap-3 py-2.5"
                    >
                      {/* Vertical connector + icon */}
                      <div className="flex flex-col items-center pt-0.5">
                        <div
                          className={cn(
                            "rounded-full flex items-center justify-center shrink-0",
                            entry.isCompetitionPhase
                              ? "h-7 w-7"
                              : "h-5 w-5",
                            isCurrent
                              ? "bg-primary ring-2 ring-primary/20"
                              : isPast
                                ? "bg-primary"
                                : "bg-muted",
                            entry.isCompetitionPhase &&
                              !isPast &&
                              !isCurrent &&
                              "border border-accent bg-accent/10"
                          )}
                        >
                          {entry.isCompetitionPhase ? (
                            <Flag
                              className={cn(
                                "h-3 w-3",
                                isPast || isCurrent
                                  ? "text-primary-foreground"
                                  : "text-accent"
                              )}
                            />
                          ) : isPast ? (
                            <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                          ) : (
                            <Circle className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        {i < mergedTimeline.length - 1 && (
                          <div className="w-0.5 h-full min-h-[16px] bg-muted mt-1" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 -mt-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            className={cn(
                              "text-sm font-medium",
                              isCurrent && "text-primary"
                            )}
                          >
                            {entry.label}
                          </p>
                          {entry.isCompetitionPhase && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-4 capitalize"
                            >
                              {entry.phaseType}
                            </Badge>
                          )}
                          {statusInfo && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] px-1.5 py-0 h-4",
                                statusInfo.badge
                              )}
                            >
                              {statusInfo.label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(entry.date)}
                          {entry.endDate &&
                            ` — ${formatDate(entry.endDate)}`}
                        </p>
                        {entry.description && (
                          <p className="text-xs text-muted-foreground/80 mt-0.5 line-clamp-2">
                            {entry.description}
                          </p>
                        )}
                        {entry.campusFilter && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">
                              {entry.campusFilter}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, i) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-start gap-3 pb-4 last:pb-0 border-b last:border-b-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <activity.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.detail}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Clock className="h-3 w-3" />
                    {activity.time}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
