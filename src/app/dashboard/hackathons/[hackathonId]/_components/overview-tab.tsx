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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency, formatRelativeTime } from "@/lib/utils";
import type { Hackathon } from "@/lib/types";
import { useHackathonParticipants } from "@/hooks/use-hackathon-participants";
import { useHackathonTeams } from "@/hooks/use-teams";
import { useHackathonSubmissions } from "@/hooks/use-submissions";
import { useHackathonAnnouncements } from "@/hooks/use-hackathon-announcements";

interface OverviewTabProps {
  hackathon: Hackathon;
  hackathonId: string;
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

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
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
