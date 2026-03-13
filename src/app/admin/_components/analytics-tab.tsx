"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Users,
  TrendingUp,
  Calendar,
  Trophy,
  FileText,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAdminStats } from "@/hooks/use-admin-stats";

const CATEGORY_COLORS: Record<string, string> = {
  tech: "#3b82f6",
  "ai-ml": "#8b5cf6",
  web3: "#f59e0b",
  design: "#ec4899",
  business: "#10b981",
  health: "#06b6d4",
  music: "#f43f5e",
  social: "#6366f1",
  workshop: "#14b8a6",
  conference: "#f97316",
  meetup: "#84cc16",
  networking: "#a855f7",
  unknown: "#6b7280",
};

const PIE_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#ec4899",
  "#10b981",
  "#06b6d4",
  "#f43f5e",
  "#6366f1",
  "#14b8a6",
  "#f97316",
  "#84cc16",
  "#a855f7",
  "#6b7280",
];

const ROLE_COLORS: Record<string, string> = {
  attendee: "#3b82f6",
  organizer: "#10b981",
  judge: "#f59e0b",
  mentor: "#8b5cf6",
  admin: "#ef4444",
};

export function AnalyticsTab() {
  const { data, isLoading, error } = useAdminStats();
  const stats = data?.data;

  // Prepare chart data
  const categoryChartData = React.useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.eventsByCategory)
      .map(([category, count]) => ({
        name: category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: count,
        fill: CATEGORY_COLORS[category] || CATEGORY_COLORS.unknown,
      }))
      .sort((a, b) => b.value - a.value);
  }, [stats]);

  const roleChartData = React.useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.usersByRole)
      .map(([role, count]) => ({
        name: role.charAt(0).toUpperCase() + role.slice(1),
        value: count,
        fill: ROLE_COLORS[role] || "#6b7280",
      }))
      .sort((a, b) => b.value - a.value);
  }, [stats]);

  const trendData = React.useMemo(() => {
    if (!stats) return [];
    return stats.registrationTrends.map((point) => ({
      date: new Date(point.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      registrations: point.count,
    }));
  }, [stats]);

  const hackathonStatusData = React.useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.hackathonsByStatus)
      .map(([status, count]) => ({
        name: status.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: count,
      }))
      .sort((a, b) => b.value - a.value);
  }, [stats]);

  const keyMetrics = React.useMemo(() => {
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
        label: "Active Hackathons",
        value: stats.activeHackathons.toLocaleString(),
        change: `${stats.totalHackathons} total`,
        icon: Trophy,
        color: "text-purple-500",
        bgColor: "bg-purple-500/10",
      },
      {
        label: "Total Submissions",
        value: stats.totalSubmissions.toLocaleString(),
        change: `${stats.totalTeams} teams`,
        icon: FileText,
        color: "text-orange-500",
        bgColor: "bg-orange-500/10",
      },
    ];
  }, [stats]);

  return (
    <>
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center mb-8">
          <p className="text-sm text-destructive">
            Failed to load analytics. Make sure you have admin access.
          </p>
        </div>
      )}

      {stats && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {keyMetrics.map((metric, i) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card hover>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className={cn("p-2.5 rounded-xl", metric.bgColor)}>
                        <metric.icon className={cn("h-5 w-5", metric.color)} />
                      </div>
                      <Badge variant="success" className="text-xs">
                        {metric.change}
                      </Badge>
                    </div>
                    <p className="text-3xl font-bold font-display">{metric.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{metric.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Registration Trends & Events by Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Registration Trends Line Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    Registration Trends (30 days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          interval="preserveStartEnd"
                          tickMargin={8}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          allowDecimals={false}
                          tickMargin={8}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "0.75rem",
                            fontSize: "0.875rem",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="registrations"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">No registration data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Events by Category Pie Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-500" />
                    Events by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          innerRadius={50}
                          paddingAngle={2}
                          dataKey="value"
                          label={(props: PieLabelRenderProps) =>
                            `${props.name ?? ""} ${(((props.percent as number) ?? 0) * 100).toFixed(0)}%`
                          }
                          labelLine={false}
                        >
                          {categoryChartData.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "0.75rem",
                            fontSize: "0.875rem",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">No event data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Users by Role Bar Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-500" />
                    Users by Role
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {roleChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={roleChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          allowDecimals={false}
                          tickMargin={8}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                          width={80}
                          tickMargin={8}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "0.75rem",
                            fontSize: "0.875rem",
                          }}
                        />
                        <Bar
                          dataKey="value"
                          radius={[0, 6, 6, 0]}
                        >
                          {roleChartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">No user data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Hackathons by Status Bar Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Hackathons by Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hackathonStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={hackathonStatusData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          interval={0}
                          angle={-30}
                          textAnchor="end"
                          height={60}
                          tickMargin={8}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          allowDecimals={false}
                          tickMargin={8}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "0.75rem",
                            fontSize: "0.875rem",
                          }}
                        />
                        <Bar
                          dataKey="value"
                          fill="#f59e0b"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">No hackathon data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Events by Category Detailed Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Event Categories Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryChartData.map((cat, i) => {
                    const total = stats.totalEvents || 1;
                    const pct = Math.round((cat.value / total) * 100);
                    return (
                      <motion.div
                        key={cat.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.45 + i * 0.03 }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium">{cat.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {cat.value.toLocaleString()} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: cat.fill }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.5 + i * 0.03, duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                  {categoryChartData.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No events created yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </>
  );
}
