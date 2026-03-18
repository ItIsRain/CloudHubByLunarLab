"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Users,
  UsersRound,
  FileText,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Filter,
  ArrowDown,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Globe,
  UserCircle,
  CalendarDays,
  Building2,
  Trophy,
  Lock,
  ThumbsUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Hackathon } from "@/lib/types";
import { KPISection } from "./kpi-section";
import {
  useHackathonAnalytics,
  type FunnelData,
  type ScoringPhaseProgress,
  type ScreeningProgress,
  type RegistrationDateEntry,
  type Demographics,
  type CampusPerformance,
  type WinnerStats,
} from "@/hooks/use-hackathon-analytics";
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

interface AnalyticsTabProps {
  hackathon: Hackathon;
  hackathonId: string;
}

// ── Design tokens ────────────────────────────────────────
const CHART_COLORS = [
  "#e8440a", // primary (Electric Coral)
  "#d946ef", // accent (Vibrant Magenta)
  "#3b82f6", // blue
  "#22c55e", // green
  "#eab308", // yellow
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#f97316", // orange
];

const SCREENING_COLORS: Record<string, string> = {
  eligible: "#22c55e",
  ineligible: "#ef4444",
  underReview: "#eab308",
  pending: "#71717a",
};

const FUNNEL_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#22c55e",
  "#e8440a",
  "#d946ef",
];

const tooltipStyle = {
  background: "#18181b",
  border: "1px solid #27272a",
  borderRadius: "8px",
  color: "#fafafa",
  fontSize: "13px",
};

const axisTickStyle = { fill: "#71717a", fontSize: 12 };

// ── Skeleton components ──────────────────────────────────
function SkeletonKPI() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="shimmer rounded-xl h-24 w-full" />
      ))}
    </div>
  );
}

function SkeletonChart() {
  return <div className="shimmer rounded-xl h-80 w-full" />;
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <SkeletonChart key={i} />
      ))}
    </div>
  );
}

// ── Empty state component ────────────────────────────────
function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-60 text-sm text-muted-foreground gap-2">
      <BarChart3 className="h-8 w-8 opacity-30" />
      <span>{message}</span>
    </div>
  );
}

// ── Animation variants ───────────────────────────────────
const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" as const },
  }),
};

// ── Funnel Visualization ─────────────────────────────────
function FunnelVisualization({ data }: { data: FunnelData }) {
  const stages = [
    { key: "applied", label: "Applied", value: data.applied },
    { key: "screened", label: "Screened", value: data.screened },
    { key: "eligible", label: "Eligible", value: data.eligible },
    { key: "accepted", label: "Accepted", value: data.accepted },
    { key: "confirmed", label: "Confirmed (RSVP)", value: data.confirmed },
  ];

  const maxValue = Math.max(data.applied, 1);

  return (
    <div className="space-y-3">
      {stages.map((stage, i) => {
        const widthPercent = Math.max((stage.value / maxValue) * 100, 8);
        const conversionFromPrevious =
          i > 0 && stages[i - 1].value > 0
            ? ((stage.value / stages[i - 1].value) * 100).toFixed(1)
            : null;

        return (
          <motion.div
            key={stage.key}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
            className="space-y-1"
          >
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {i > 0 && (
                  <ArrowDown className="h-3 w-3 text-muted-foreground -ml-0.5" />
                )}
                <span className="font-medium">{stage.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base">
                  {stage.value.toLocaleString()}
                </span>
                {conversionFromPrevious && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                    {conversionFromPrevious}%
                  </Badge>
                )}
              </div>
            </div>
            <div className="h-8 rounded-lg bg-muted overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${widthPercent}%` }}
                transition={{ duration: 0.8, delay: 0.4 + i * 0.12, ease: "easeOut" }}
                className="h-full rounded-lg flex items-center justify-end pr-2"
                style={{ backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
              >
                {widthPercent > 15 && (
                  <span className="text-xs font-medium text-white">
                    {((stage.value / maxValue) * 100).toFixed(0)}%
                  </span>
                )}
              </motion.div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Screening Progress Ring ──────────────────────────────
function ScreeningDonut({ data }: { data: ScreeningProgress }) {
  const segments = [
    { key: "eligible", label: "Eligible", value: data.eligible, color: SCREENING_COLORS.eligible },
    { key: "ineligible", label: "Ineligible", value: data.ineligible, color: SCREENING_COLORS.ineligible },
    { key: "underReview", label: "Under Review", value: data.underReview, color: SCREENING_COLORS.underReview },
    { key: "pending", label: "Pending", value: data.pending, color: SCREENING_COLORS.pending },
  ].filter((s) => s.value > 0);

  const screenedPercent = data.total > 0 ? Math.round((data.screened / data.total) * 100) : 0;

  if (data.total === 0) {
    return <EmptyChartState message="No applications to screen yet" />;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <ResponsiveContainer width={220} height={220}>
          <PieChart>
            <Pie
              data={segments}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={90}
              dataKey="value"
              nameKey="label"
              startAngle={90}
              endAngle={-270}
              strokeWidth={2}
              stroke="#09090b"
            >
              {segments.map((segment, index) => (
                <Cell key={index} fill={segment.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold font-display">{screenedPercent}%</span>
          <span className="text-xs text-muted-foreground">Screened</span>
        </div>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs">
        {segments.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.label} ({s.value})
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Scoring Progress by Phase ────────────────────────────
function ScoringByPhase({ phases }: { phases: ScoringPhaseProgress[] }) {
  if (phases.length === 0) {
    return <EmptyChartState message="No competition phases configured yet" />;
  }

  return (
    <div className="space-y-5">
      {phases.map((phase, i) => {
        const percent =
          phase.total > 0
            ? Math.round((phase.scored / phase.total) * 100)
            : 0;

        return (
          <motion.div
            key={phase.phaseId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{phase.phaseName}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="font-mono text-xs">
                  {phase.scored}/{phase.total}
                </span>
                <Badge
                  variant={percent === 100 ? "default" : "outline"}
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-5",
                    percent === 100 && "bg-green-500/20 text-green-500 border-green-500/30"
                  )}
                >
                  {percent}%
                </Badge>
              </div>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.8, delay: 0.4 + i * 0.1, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full",
                  percent === 100
                    ? "bg-green-500"
                    : "bg-gradient-to-r from-primary to-accent"
                )}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Campus Distribution Bar Chart ────────────────────────
function CampusDistributionChart({
  data,
}: {
  data: Record<string, number>;
}) {
  const chartData = Object.entries(data)
    .map(([campus, count]) => ({ campus, count }))
    .sort((a, b) => b.count - a.count);

  if (chartData.length === 0) {
    return <EmptyChartState message="No campus data available" />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
        <XAxis type="number" tick={axisTickStyle} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="campus"
          tick={axisTickStyle}
          axisLine={false}
          tickLine={false}
          width={80}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={32}>
          {chartData.map((_, index) => (
            <Cell
              key={index}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Registration Timeline (Area Chart) ───────────────────
function RegistrationTimelineChart({
  data,
}: {
  data: RegistrationDateEntry[];
}) {
  if (data.length === 0) {
    return <EmptyChartState message="No registration data available yet" />;
  }

  // Format dates for display
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={formatted}>
        <defs>
          <linearGradient id="dailyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#e8440a" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#e8440a" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="cumulativeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#d946ef" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#d946ef" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="label"
          tick={axisTickStyle}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="daily"
          tick={axisTickStyle}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="cumulative"
          orientation="right"
          tick={axisTickStyle}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12, color: "#71717a" }} />
        <Area
          yAxisId="daily"
          type="monotone"
          dataKey="count"
          name="Daily Applications"
          stroke="#e8440a"
          strokeWidth={2}
          fill="url(#dailyGrad)"
        />
        <Area
          yAxisId="cumulative"
          type="monotone"
          dataKey="cumulative"
          name="Cumulative"
          stroke="#d946ef"
          strokeWidth={2}
          strokeDasharray="5 5"
          fill="url(#cumulativeGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Gender Distribution Donut ─────────────────────────────
function GenderDistributionChart({ data }: { data: Record<string, number> }) {
  const segments = Object.entries(data)
    .map(([label, value]) => ({ label, value }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (segments.length === 0) {
    return <EmptyChartState message="No gender data available" />;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <ResponsiveContainer width={220} height={220}>
          <PieChart>
            <Pie
              data={segments}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={90}
              dataKey="value"
              nameKey="label"
              startAngle={90}
              endAngle={-270}
              strokeWidth={2}
              stroke="#09090b"
            >
              {segments.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold font-display">{total}</span>
          <span className="text-xs text-muted-foreground">Responses</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs">
        {segments.map((s, i) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            {s.label} ({s.value})
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Age Distribution Bar Chart ───────────────────────────
function AgeDistributionChart({ data }: { data: Record<string, number> }) {
  // Ensure brackets are in the correct order
  const bracketOrder = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55+"];
  const chartData = bracketOrder
    .filter((bracket) => data[bracket] != null && data[bracket] > 0)
    .map((bracket) => ({ bracket, count: data[bracket] }));

  // Also include any unexpected brackets not in the standard order
  for (const [bracket, count] of Object.entries(data)) {
    if (!bracketOrder.includes(bracket) && count > 0) {
      chartData.push({ bracket, count });
    }
  }

  if (chartData.length === 0) {
    return <EmptyChartState message="No age data available" />;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 48)}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
        <XAxis type="number" tick={axisTickStyle} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="bracket"
          tick={axisTickStyle}
          axisLine={false}
          tickLine={false}
          width={80}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={32}>
          {chartData.map((_, index) => (
            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Nationality Distribution Bar Chart (Top 10 + Other) ──
function NationalityDistributionChart({ data }: { data: Record<string, number> }) {
  const sorted = Object.entries(data)
    .map(([nationality, count]) => ({ nationality, count }))
    .sort((a, b) => b.count - a.count);

  if (sorted.length === 0) {
    return <EmptyChartState message="No nationality data available" />;
  }

  // Top 10 + bucket the rest into "Other"
  const top10 = sorted.slice(0, 10);
  const rest = sorted.slice(10);
  const otherCount = rest.reduce((sum, item) => sum + item.count, 0);

  const chartData = [...top10];
  if (otherCount > 0) {
    chartData.push({ nationality: "Other", count: otherCount });
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 40)}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
        <XAxis type="number" tick={axisTickStyle} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="nationality"
          tick={axisTickStyle}
          axisLine={false}
          tickLine={false}
          width={120}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={32}>
          {chartData.map((_, index) => (
            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Sector Distribution Bar Chart ────────────────────────
function SectorDistributionChart({ data }: { data: Record<string, number> }) {
  const chartData = Object.entries(data)
    .map(([sector, count]) => ({ sector, count }))
    .sort((a, b) => b.count - a.count);

  if (chartData.length === 0) {
    return <EmptyChartState message="No sector data available" />;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 40)}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
        <XAxis type="number" tick={axisTickStyle} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="sector"
          tick={axisTickStyle}
          axisLine={false}
          tickLine={false}
          width={120}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={32}>
          {chartData.map((_, index) => (
            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Campus Performance Table ─────────────────────────────
function CampusPerformanceTable({
  data,
}: {
  data: Record<string, CampusPerformance>;
}) {
  const campuses = Object.entries(data)
    .map(([campus, stats]) => ({
      campus,
      ...stats,
      advancementRate:
        stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  if (campuses.length === 0) {
    return <EmptyChartState message="No campus performance data available" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 text-muted-foreground text-xs">
            <th className="text-left py-2.5 px-3 font-medium">Campus</th>
            <th className="text-right py-2.5 px-3 font-medium">Total</th>
            <th className="text-right py-2.5 px-3 font-medium">Screened</th>
            <th className="text-right py-2.5 px-3 font-medium">Eligible</th>
            <th className="text-right py-2.5 px-3 font-medium">Accepted</th>
            <th className="text-right py-2.5 px-3 font-medium">Confirmed</th>
            <th className="text-right py-2.5 px-3 font-medium">Advancement</th>
          </tr>
        </thead>
        <tbody>
          {campuses.map((row, i) => (
            <motion.tr
              key={row.campus}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              className="border-b border-border/30 hover:bg-muted/30 transition-colors"
            >
              <td className="py-2.5 px-3 font-medium">{row.campus}</td>
              <td className="text-right py-2.5 px-3 font-mono">{row.total}</td>
              <td className="text-right py-2.5 px-3 font-mono">{row.screened}</td>
              <td className="text-right py-2.5 px-3 font-mono">{row.eligible}</td>
              <td className="text-right py-2.5 px-3 font-mono">{row.accepted}</td>
              <td className="text-right py-2.5 px-3 font-mono">{row.confirmed}</td>
              <td className="text-right py-2.5 px-3">
                <Badge
                  variant={row.advancementRate >= 50 ? "default" : "outline"}
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-5",
                    row.advancementRate >= 50
                      ? "bg-green-500/20 text-green-500 border-green-500/30"
                      : row.advancementRate >= 25
                        ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
                        : ""
                  )}
                >
                  {row.advancementRate}%
                </Badge>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Winner Stats KPI Cards ───────────────────────────────
function WinnerStatsCards({ stats }: { stats: WinnerStats }) {
  if (stats.total === 0) {
    return <EmptyChartState message="No winners announced yet" />;
  }

  const items = [
    {
      label: "Total Winners",
      value: stats.total,
      icon: Trophy,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      label: "Confirmed",
      value: stats.confirmed,
      icon: ThumbsUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Locked",
      value: stats.locked,
      icon: Lock,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 + i * 0.08 }}
          className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50",
            item.bgColor
          )}
        >
          <item.icon className={cn("h-5 w-5", item.color)} />
          <span className="text-2xl font-bold font-display">{item.value}</span>
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ── Main Analytics Tab ───────────────────────────────────
export function AnalyticsTab({ hackathon, hackathonId }: AnalyticsTabProps) {
  const { data: analyticsData, isLoading } =
    useHackathonAnalytics(hackathonId);
  const analytics = analyticsData?.data;

  // ── KPI values ─────────────────────────────────────────
  const totalApplications = analytics
    ? Object.values(analytics.registrationsByStatus).reduce(
        (sum, v) => sum + v,
        0
      )
    : hackathon.participantCount ?? 0;
  const teamCount = analytics?.teamCount ?? hackathon.teamCount ?? 0;
  const submissionCount =
    analytics?.submissionCount ?? hackathon.submissionCount ?? 0;
  const screenedPercent =
    analytics && analytics.screeningProgress.total > 0
      ? Math.round(
          (analytics.screeningProgress.screened /
            analytics.screeningProgress.total) *
            100
        )
      : 0;

  const kpiStats = [
    {
      label: "Total Applications",
      value: totalApplications,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Teams Formed",
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
      label: "Screened",
      value: `${screenedPercent}%`,
      icon: Filter,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Loading hackathon performance data...
          </p>
        </div>
        <SkeletonKPI />
        <SkeletonGrid />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="font-display text-2xl font-bold">Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Track hackathon performance, screening progress, and engagement
        </p>
      </motion.div>

      {/* ── KPI Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiStats.map((stat, i) => (
          <motion.div
            key={stat.label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={cardVariant}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      stat.bgColor
                    )}
                  >
                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold font-display truncate">
                      {typeof stat.value === "number"
                        ? stat.value.toLocaleString()
                        : stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {stat.label}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── Charts Grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Application Volume / Registration Timeline */}
        <motion.div
          custom={4}
          initial="hidden"
          animate="visible"
          variants={cardVariant}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Application Volume
                {analytics && analytics.registrationsByDate.length > 0 && (
                  <Badge variant="outline" className="ml-auto text-[10px]">
                    {analytics.registrationsByDate.length} days
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RegistrationTimelineChart
                data={analytics?.registrationsByDate ?? []}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* 2. Campus Distribution */}
        <motion.div
          custom={5}
          initial="hidden"
          animate="visible"
          variants={cardVariant}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Campus Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CampusDistributionChart
                data={analytics?.registrationsByCampus ?? {}}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* 3. Screening Progress */}
        <motion.div
          custom={6}
          initial="hidden"
          animate="visible"
          variants={cardVariant}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-primary" />
                Screening Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics ? (
                <ScreeningDonut data={analytics.screeningProgress} />
              ) : (
                <EmptyChartState message="No screening data available" />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 4. Scoring Progress by Phase */}
        <motion.div
          custom={7}
          initial="hidden"
          animate="visible"
          variants={cardVariant}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Scoring Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScoringByPhase
                phases={analytics?.scoringProgressByPhase ?? []}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* 5. Funnel Visualization */}
        <motion.div
          custom={8}
          initial="hidden"
          animate="visible"
          variants={cardVariant}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowDown className="h-4 w-4 text-primary" />
                Application Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics && analytics.funnelData.applied > 0 ? (
                <FunnelVisualization data={analytics.funnelData} />
              ) : (
                <EmptyChartState message="No application data for funnel yet" />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 6. RSVP Status */}
        <motion.div
          custom={9}
          initial="hidden"
          animate="visible"
          variants={cardVariant}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                RSVP Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics ? (
                <RSVPStatus stats={analytics.rsvpStats} />
              ) : (
                <EmptyChartState message="No RSVP data available" />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 7. Track Distribution (Pie Chart) */}
        {analytics &&
          analytics.trackDistribution.length > 0 && (
            <motion.div
              custom={10}
              initial="hidden"
              animate="visible"
              variants={cardVariant}
              className="lg:col-span-2"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-primary" />
                    Track Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={analytics.trackDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          innerRadius={50}
                          dataKey="count"
                          nameKey="track"
                          strokeWidth={2}
                          stroke="#09090b"
                        >
                          {analytics.trackDistribution.map((_, index) => (
                            <Cell
                              key={index}
                              fill={
                                CHART_COLORS[index % CHART_COLORS.length]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend
                          wrapperStyle={{ fontSize: 12, color: "#71717a" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Track list with progress bars */}
                    <div className="space-y-3">
                      {analytics.trackDistribution
                        .sort((a, b) => b.count - a.count)
                        .map((track, i) => {
                          const maxCount = Math.max(
                            ...analytics.trackDistribution.map((t) => t.count)
                          );
                          const percentage = Math.round(
                            (track.count / maxCount) * 100
                          );
                          return (
                            <motion.div
                              key={track.track}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.5 + i * 0.05 }}
                              className="space-y-1"
                            >
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium truncate">
                                  {track.track}
                                </span>
                                <span className="text-muted-foreground shrink-0 ml-2">
                                  {track.count}
                                </span>
                              </div>
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{
                                    duration: 0.6,
                                    delay: 0.6 + i * 0.08,
                                  }}
                                  className="h-full rounded-full"
                                  style={{
                                    backgroundColor:
                                      CHART_COLORS[
                                        i % CHART_COLORS.length
                                      ],
                                  }}
                                />
                              </div>
                            </motion.div>
                          );
                        })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

        {/* 8. Gender Distribution */}
        {analytics &&
          analytics.demographics &&
          Object.keys(analytics.demographics.genderDistribution).length > 0 && (
            <motion.div
              custom={11}
              initial="hidden"
              animate="visible"
              variants={cardVariant}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCircle className="h-4 w-4 text-primary" />
                    Gender Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <GenderDistributionChart
                    data={analytics.demographics.genderDistribution}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

        {/* 9. Age Distribution */}
        {analytics &&
          analytics.demographics &&
          Object.keys(analytics.demographics.ageDistribution).length > 0 && (
            <motion.div
              custom={12}
              initial="hidden"
              animate="visible"
              variants={cardVariant}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Age Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AgeDistributionChart
                    data={analytics.demographics.ageDistribution}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

        {/* 10. Nationality Distribution */}
        {analytics &&
          analytics.demographics &&
          Object.keys(analytics.demographics.nationalityDistribution).length > 0 && (
            <motion.div
              custom={13}
              initial="hidden"
              animate="visible"
              variants={cardVariant}
              className="lg:col-span-2"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Nationality Distribution
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      {Object.keys(analytics.demographics.nationalityDistribution).length} countries
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <NationalityDistributionChart
                    data={analytics.demographics.nationalityDistribution}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

        {/* 11. Sector Distribution */}
        {analytics &&
          analytics.sectorDistribution &&
          Object.keys(analytics.sectorDistribution).length > 0 && (
            <motion.div
              custom={14}
              initial="hidden"
              animate="visible"
              variants={cardVariant}
              className="lg:col-span-2"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Sector Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SectorDistributionChart data={analytics.sectorDistribution} />
                </CardContent>
              </Card>
            </motion.div>
          )}

        {/* 12. Campus Performance */}
        {analytics &&
          analytics.campusPerformance &&
          Object.keys(analytics.campusPerformance).length > 0 && (
            <motion.div
              custom={15}
              initial="hidden"
              animate="visible"
              variants={cardVariant}
              className="lg:col-span-2"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Campus Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CampusPerformanceTable data={analytics.campusPerformance} />
                </CardContent>
              </Card>
            </motion.div>
          )}

        {/* 13. Winner Stats */}
        {analytics &&
          analytics.winnerStats &&
          analytics.winnerStats.total > 0 && (
            <motion.div
              custom={16}
              initial="hidden"
              animate="visible"
              variants={cardVariant}
              className="lg:col-span-2"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    Winner Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <WinnerStatsCards stats={analytics.winnerStats} />
                </CardContent>
              </Card>
            </motion.div>
          )}
      </div>

      {/* ── Status Breakdown ─────────────────────────────── */}
      {analytics &&
        Object.keys(analytics.registrationsByStatus).length > 0 && (
          <motion.div
            custom={17}
            initial="hidden"
            animate="visible"
            variants={cardVariant}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Registration Status Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(analytics.registrationsByStatus)
                    .sort(([, a], [, b]) => b - a)
                    .map(([status, count]) => (
                      <StatusBadge
                        key={status}
                        status={status}
                        count={count}
                      />
                    ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

      {/* ── Custom KPI Tracking ────────────────────────────── */}
      <KPISection hackathonId={hackathonId} />
    </div>
  );
}

// ── RSVP Status Component ────────────────────────────────
function RSVPStatus({
  stats,
}: {
  stats: { confirmed: number; pending: number; declined: number };
}) {
  const total = stats.confirmed + stats.pending + stats.declined;

  if (total === 0) {
    return <EmptyChartState message="No RSVP responses yet" />;
  }

  const items = [
    {
      label: "Confirmed",
      value: stats.confirmed,
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      barColor: "bg-green-500",
    },
    {
      label: "Pending",
      value: stats.pending,
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      barColor: "bg-yellow-500",
    },
    {
      label: "Declined",
      value: stats.declined,
      icon: XCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      barColor: "bg-red-500",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Summary ring */}
      <div className="flex items-center justify-center gap-8">
        <div className="text-center">
          <p className="text-4xl font-bold font-display text-green-500">
            {stats.confirmed}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Confirmed</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground">of</p>
        </div>
        <div className="text-center">
          <p className="text-4xl font-bold font-display">{total}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Sent</p>
        </div>
      </div>

      {/* Stacked progress bar */}
      <div className="h-4 rounded-full bg-muted overflow-hidden flex">
        {items.map((item) => {
          const widthPercent = total > 0 ? (item.value / total) * 100 : 0;
          if (widthPercent === 0) return null;
          return (
            <motion.div
              key={item.label}
              initial={{ width: 0 }}
              animate={{ width: `${widthPercent}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className={cn("h-full", item.barColor)}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs">
        {items.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <item.icon className={cn("h-3.5 w-3.5", item.color)} />
            {item.label} ({item.value})
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Status Badge Component ───────────────────────────────
function StatusBadge({ status, count }: { status: string; count: number }) {
  const statusConfig: Record<
    string,
    { color: string; bgColor: string; icon: React.ElementType }
  > = {
    pending: { color: "text-zinc-400", bgColor: "bg-zinc-400/10", icon: Clock },
    confirmed: { color: "text-green-500", bgColor: "bg-green-500/10", icon: CheckCircle2 },
    eligible: { color: "text-green-500", bgColor: "bg-green-500/10", icon: CheckCircle2 },
    ineligible: { color: "text-red-500", bgColor: "bg-red-500/10", icon: XCircle },
    under_review: { color: "text-yellow-500", bgColor: "bg-yellow-500/10", icon: AlertTriangle },
    accepted: { color: "text-blue-500", bgColor: "bg-blue-500/10", icon: CheckCircle2 },
    approved: { color: "text-blue-500", bgColor: "bg-blue-500/10", icon: CheckCircle2 },
    waitlisted: { color: "text-orange-500", bgColor: "bg-orange-500/10", icon: Clock },
    rejected: { color: "text-red-500", bgColor: "bg-red-500/10", icon: XCircle },
    cancelled: { color: "text-zinc-500", bgColor: "bg-zinc-500/10", icon: XCircle },
    declined: { color: "text-red-400", bgColor: "bg-red-400/10", icon: XCircle },
  };

  const config = statusConfig[status] || {
    color: "text-zinc-400",
    bgColor: "bg-zinc-400/10",
    icon: Activity,
  };
  const Icon = config.icon;

  const displayLabel = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50",
        config.bgColor
      )}
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", config.color)} />
      <span className="text-sm font-medium">{displayLabel}</span>
      <span className={cn("text-sm font-bold font-display", config.color)}>
        {count}
      </span>
    </div>
  );
}
