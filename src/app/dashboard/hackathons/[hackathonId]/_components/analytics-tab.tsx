"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Users,
  UsersRound,
  FileText,
  GraduationCap,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Hackathon } from "@/lib/types";
import { useHackathonAnalytics } from "@/hooks/use-hackathon-analytics";
import {
  AreaChart,
  Area,
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
  Legend,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";

interface AnalyticsTabProps {
  hackathon: Hackathon;
  hackathonId: string;
}

const CHART_COLORS = [
  "#e8440a",
  "#d946ef",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#8b5cf6",
];

const tooltipStyle = {
  background: "#18181b",
  border: "1px solid #27272a",
  borderRadius: "8px",
};

const axisTickStyle = { fill: "#71717a", fontSize: 12 };

export function AnalyticsTab({ hackathon, hackathonId }: AnalyticsTabProps) {
  const { data: analyticsData, isLoading } =
    useHackathonAnalytics(hackathonId);
  const analytics = analyticsData?.data;

  // Compute KPI values
  const totalParticipants = analytics
    ? Object.values(analytics.registrationsByStatus).reduce(
        (sum, v) => sum + v,
        0
      )
    : hackathon.participantCount ?? 0;
  const teamCount = analytics?.teamCount ?? hackathon.teamCount ?? 0;
  const submissionCount =
    analytics?.submissionCount ?? hackathon.submissionCount ?? 0;
  const scoringProgress = analytics?.scoringProgress ?? {
    scored: 0,
    total: 0,
  };
  const scoringPercent =
    scoringProgress.total > 0
      ? Math.round((scoringProgress.scored / scoringProgress.total) * 100)
      : 0;

  const kpiStats = [
    {
      label: "Participants",
      value: totalParticipants,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Teams",
      value: teamCount,
      icon: UsersRound,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Submissions",
      value: submissionCount,
      icon: FileText,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Scoring Progress",
      value: `${scoringPercent}%`,
      icon: Activity,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
  ];

  // Chart data
  const registrationTimeline = analytics?.registrationTimeline ?? [];
  const trackDistribution = analytics?.trackDistribution ?? [];

  // Placeholder team size data if no real data
  const teamSizeData = [
    { size: "1", count: 0 },
    { size: "2", count: 0 },
    { size: "3", count: 0 },
    { size: "4", count: 0 },
    { size: "5+", count: 0 },
  ];

  // Max count for top tracks progress bars
  const maxTrackCount = trackDistribution.length
    ? Math.max(...trackDistribution.map((t) => t.count))
    : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="font-display text-2xl font-bold">Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Track hackathon performance and engagement
        </p>
      </motion.div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="shimmer rounded-xl h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiStats.map((stat, i) => (
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
      )}

      {/* Charts 2x2 Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="shimmer rounded-xl h-72 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Registration Timeline - Area Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Registration Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {registrationTimeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={registrationTimeline}>
                      <defs>
                        <linearGradient
                          id="registrationGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#e8440a"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#e8440a"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#27272a"
                      />
                      <XAxis
                        dataKey="date"
                        tick={axisTickStyle}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={axisTickStyle}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#e8440a"
                        strokeWidth={2}
                        fill="url(#registrationGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-60 text-sm text-muted-foreground">
                    No registration data available yet
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Team Size Distribution - Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Team Size Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={teamSizeData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#27272a"
                    />
                    <XAxis
                      dataKey="size"
                      tick={axisTickStyle}
                      axisLine={false}
                      tickLine={false}
                      label={{
                        value: "Team Size",
                        position: "insideBottom",
                        offset: -5,
                        style: { fill: "#71717a", fontSize: 11 },
                      }}
                    />
                    <YAxis
                      tick={axisTickStyle}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar
                      dataKey="count"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Track Distribution - Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-primary" />
                  Track Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trackDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={trackDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                        dataKey="count"
                        nameKey="track"
                        label={(props: PieLabelRenderProps) => {
                          const pct = typeof props.percent === "number" ? props.percent : 0;
                          const track = (props as unknown as { track: string }).track ?? "";
                          return `${track} ${(pct * 100).toFixed(0)}%`;
                        }}
                        labelLine={false}
                      >
                        {trackDistribution.map((_, index) => (
                          <Cell
                            key={index}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend
                        wrapperStyle={{ fontSize: 12, color: "#71717a" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-60 text-sm text-muted-foreground">
                    No track data available yet
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Scoring Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Scoring Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-60 space-y-6">
                  <div className="text-center">
                    <p className="text-5xl font-bold font-display text-primary">
                      {scoringPercent}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {scoringProgress.scored} of {scoringProgress.total}{" "}
                      submissions scored
                    </p>
                  </div>
                  <div className="w-full max-w-xs">
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${scoringPercent}%` }}
                        transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      Scored ({scoringProgress.scored})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
                      Remaining (
                      {scoringProgress.total - scoringProgress.scored})
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Top Tracks */}
      {!isLoading && trackDistribution.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Tracks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trackDistribution
                  .sort((a, b) => b.count - a.count)
                  .map((track, i) => {
                    const percentage = Math.round(
                      (track.count / maxTrackCount) * 100
                    );
                    return (
                      <motion.div
                        key={track.track}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.45 + i * 0.05 }}
                        className="space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{track.track}</span>
                          <span className="text-muted-foreground">
                            {track.count} teams
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{
                              duration: 0.8,
                              delay: 0.5 + i * 0.1,
                              ease: "easeOut",
                            }}
                            className="h-full rounded-full"
                            style={{
                              backgroundColor:
                                CHART_COLORS[i % CHART_COLORS.length],
                            }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
