"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  Calendar,
  Trophy,
  FileText,
  Eye,
  ShieldAlert,
  Loader2,
  Activity,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { useAdminStats } from "@/hooks/use-admin-stats";
import { toast } from "sonner";

function formatActionLabel(action: string): string {
  return action
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function OverviewTab() {
  const { data, isLoading, error } = useAdminStats();
  const stats = data?.data;

  const statCards = React.useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: "Total Users",
        value: stats.totalUsers.toLocaleString(),
        change: `+${stats.newUsersThisMonth} this month`,
        icon: Users,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
      },
      {
        label: "Total Events",
        value: stats.totalEvents.toLocaleString(),
        change: `+${stats.newEventsThisMonth} this month`,
        icon: Calendar,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
      },
      {
        label: "Total Competitions",
        value: stats.totalHackathons.toLocaleString(),
        change: `${stats.activeHackathons} active`,
        icon: Trophy,
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
      },
      {
        label: "Total Teams",
        value: stats.totalTeams.toLocaleString(),
        change: `${stats.totalSubmissions} submissions`,
        icon: FileText,
        color: "text-purple-500",
        bgColor: "bg-purple-500/10",
      },
    ];
  }, [stats]);

  /* Loading State */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* Error State */
  if (error) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center mb-8">
        <p className="text-sm text-destructive">
          Failed to load admin stats. Make sure you have admin access.
        </p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card hover>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold font-display mt-1">{stat.value}</p>
                    <p className="text-xs text-green-500 mt-1">{stat.change}</p>
                  </div>
                  <div className={cn("p-3 rounded-xl", stat.bgColor)}>
                    <stat.icon className={cn("h-6 w-6", stat.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Users by Role */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-500" />
                Users by Role
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.usersByRole)
                  .sort(([, a], [, b]) => b - a)
                  .map(([role, count]) => {
                    const total = stats.totalUsers || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={role}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium capitalize">{role}</span>
                          <span className="text-sm text-muted-foreground">
                            {count.toLocaleString()} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-blue-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Hackathons by Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Hackathons by Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.hackathonsByStatus)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count]) => {
                    const total = stats.totalHackathons || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium capitalize">
                            {status.replace(/-/g, " ")}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {count.toLocaleString()} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-yellow-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                {Object.keys(stats.hackathonsByStatus).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hackathons yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Signups & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Signups Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Signups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">User</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3 hidden sm:table-cell">Email</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3 hidden md:table-cell">Joined</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">Role</th>
                      <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stats.recentUsers.map((user, i) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 + i * 0.05 }}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <Avatar size="sm">
                              <AvatarImage src={user.avatar || undefined} alt={user.name} />
                              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{user.name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-sm text-muted-foreground hidden sm:table-cell">{user.email}</td>
                        <td className="py-3 text-sm text-muted-foreground hidden md:table-cell">{formatDate(user.createdAt)}</td>
                        <td className="py-3">
                          <Badge variant="secondary" className="capitalize text-xs">
                            {user.roles[0] || "attendee"}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/profile/${user.username}`}>
                              <Button variant="ghost" size="sm" className="h-8 px-2">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-yellow-500 hover:text-yellow-600"
                              onClick={() => {
                                if (window.confirm(`Suspend user ${user.name}?`)) {
                                  toast.success(`${user.name} has been suspended`);
                                }
                              }}
                            >
                              <ShieldAlert className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                    {stats.recentUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity Feed (from audit logs) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentAuditLogs.map((log, i) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                    className="p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge
                        variant={log.status === "success" ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {log.entityType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm font-medium mb-1">
                      {formatActionLabel(log.action)}
                    </p>
                    {log.actor && (
                      <div className="flex items-center gap-2 mt-2">
                        <Avatar size="sm">
                          <AvatarImage src={log.actor.avatar || undefined} alt={log.actor.name} />
                          <AvatarFallback>{getInitials(log.actor.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {log.actor.name}
                        </span>
                      </div>
                    )}
                  </motion.div>
                ))}
                {stats.recentAuditLogs.length === 0 && (
                  <div className="text-center py-8">
                    <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
