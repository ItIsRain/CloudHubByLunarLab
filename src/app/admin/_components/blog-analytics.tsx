"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Eye,
  Users,
  Clock,
  ScrollText,
  Share2,
  MousePointerClick,
  Monitor,
  Smartphone,
  Tablet,
  TrendingUp,
  Globe,
  BarChart3,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/fetch-json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BlogAnalyticsPost {
  blog_post_id: string;
  slug: string;
  title: string;
  status: string;
  view_count: number;
  published_at: string | null;
  created_at: string;
  unique_visitors: number;
  avg_time_on_page: number;
  avg_scroll_depth: number;
  avg_read_completion: number;
  deep_readers: number;
  share_count: number;
  related_clicks: number;
  desktop_count: number;
  mobile_count: number;
  tablet_count: number;
  visitors_today: number;
  visitors_7d: number;
  visitors_30d: number;
}

interface BlogAnalyticsTotals {
  totalViews: number;
  totalVisitors: number;
  totalShares: number;
  totalRelatedClicks: number;
  avgTimeOnPage: number;
  avgScrollDepth: number;
  avgReadCompletion: number;
  count: number;
}

interface DailyEngagement {
  date: string;
  views: number;
  visitors: number;
}

interface TopReferrer {
  source: string;
  count: number;
}

interface BlogAnalyticsResponse {
  posts: BlogAnalyticsPost[];
  totals: BlogAnalyticsTotals;
  dailyEngagement: DailyEngagement[];
  topReferrers: TopReferrer[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

function useBlogAnalytics() {
  return useQuery<BlogAnalyticsResponse>({
    queryKey: ["admin-blog-analytics"],
    queryFn: () => fetchJson<BlogAnalyticsResponse>("/api/admin/blog/analytics"),
    refetchInterval: 30000, // Auto-refresh every 30s
  });
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  subtitle,
  color = "text-primary",
  delay = 0,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  subtitle?: string;
  color?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {label}
              </p>
              <p className="text-2xl font-bold font-display mt-1">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10",
                color
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function ProgressBar({
  value,
  max = 100,
  color = "bg-primary",
}: {
  value: number;
  max?: number;
  color?: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <motion.div
        className={cn("h-full rounded-full", color)}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini bar chart (last 30 days)
// ---------------------------------------------------------------------------

function MiniBarChart({ data }: { data: DailyEngagement[] }) {
  const maxViews = Math.max(1, ...data.map((d) => d.views));

  return (
    <div className="flex items-end gap-[2px] h-24">
      {data.map((d, i) => {
        const h = Math.max(2, (d.views / maxViews) * 100);
        return (
          <motion.div
            key={d.date}
            className="flex-1 rounded-t bg-primary/70 hover:bg-primary transition-colors cursor-default relative group"
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ delay: i * 0.02, duration: 0.4 }}
            title={`${d.date}: ${d.views} visits`}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
              <div className="rounded-md bg-popover border border-border px-2 py-1 text-[10px] whitespace-nowrap shadow-lg">
                <p className="font-medium">{d.date}</p>
                <p className="text-muted-foreground">{d.views} visits</p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Device breakdown
// ---------------------------------------------------------------------------

function DeviceBreakdown({
  desktop,
  mobile,
  tablet,
}: {
  desktop: number;
  mobile: number;
  tablet: number;
}) {
  const total = Math.max(1, desktop + mobile + tablet);
  const items = [
    {
      label: "Desktop",
      icon: Monitor,
      count: desktop,
      pct: Math.round((desktop / total) * 100),
      color: "bg-blue-500",
    },
    {
      label: "Mobile",
      icon: Smartphone,
      count: mobile,
      pct: Math.round((mobile / total) * 100),
      color: "bg-green-500",
    },
    {
      label: "Tablet",
      icon: Tablet,
      count: tablet,
      pct: Math.round((tablet / total) * 100),
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </div>
              <span className="font-medium">
                {item.pct}%{" "}
                <span className="text-muted-foreground font-normal">
                  ({item.count})
                </span>
              </span>
            </div>
            <ProgressBar value={item.pct} color={item.color} />
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// ---------------------------------------------------------------------------
// Blog Analytics Component (exported)
// ---------------------------------------------------------------------------

export function BlogAnalytics() {
  const { data, isLoading } = useBlogAnalytics();

  if (isLoading) {
    return <div className="shimmer rounded-xl h-96 w-full" />;
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-display text-lg font-bold">No analytics data</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Analytics will appear once blog posts receive engagement.
        </p>
      </div>
    );
  }

  const { posts, totals, dailyEngagement, topReferrers } = data;

  // Aggregate device counts across all posts
  const totalDesktop = posts.reduce((s, p) => s + p.desktop_count, 0);
  const totalMobile = posts.reduce((s, p) => s + p.mobile_count, 0);
  const totalTablet = posts.reduce((s, p) => s + p.tablet_count, 0);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Total Views"
          value={totals.totalViews.toLocaleString()}
          icon={Eye}
          delay={0}
        />
        <StatCard
          label="Unique Visitors"
          value={totals.totalVisitors.toLocaleString()}
          icon={Users}
          delay={0.05}
        />
        <StatCard
          label="Avg. Time on Page"
          value={formatTime(totals.avgTimeOnPage)}
          icon={Clock}
          delay={0.1}
        />
        <StatCard
          label="Avg. Scroll Depth"
          value={`${totals.avgScrollDepth}%`}
          icon={ScrollText}
          delay={0.15}
        />
        <StatCard
          label="Total Shares"
          value={totals.totalShares.toLocaleString()}
          icon={Share2}
          delay={0.2}
        />
        <StatCard
          label="Related Clicks"
          value={totals.totalRelatedClicks.toLocaleString()}
          icon={MousePointerClick}
          delay={0.25}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Engagement Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display font-bold text-sm">
                    Engagement Trend
                  </h3>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              {dailyEngagement.length > 0 ? (
                <MiniBarChart data={dailyEngagement} />
              ) : (
                <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                  No engagement data yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Device Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card>
            <CardContent className="p-5">
              <h3 className="font-display font-bold text-sm mb-4">
                Device Breakdown
              </h3>
              <DeviceBreakdown
                desktop={totalDesktop}
                mobile={totalMobile}
                tablet={totalTablet}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Referrers + Top Posts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Referrers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-display font-bold text-sm">
                  Top Referrers
                </h3>
              </div>
              {topReferrers.length > 0 ? (
                <div className="space-y-2.5">
                  {topReferrers.map((ref, i) => (
                    <div
                      key={ref.source}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground truncate flex-1 mr-3">
                        <span className="text-foreground font-medium">
                          {i + 1}.
                        </span>{" "}
                        {ref.source}
                      </span>
                      <Badge variant="muted" className="text-[10px] shrink-0">
                        {ref.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No referrer data yet
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Performing Posts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-display font-bold text-sm">
                  Top Performing Posts
                </h3>
              </div>
              {posts.length > 0 ? (
                <div className="space-y-3">
                  {posts.slice(0, 5).map((post, i) => (
                    <div key={post.blog_post_id} className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium line-clamp-1 flex-1">
                          <span className="text-muted-foreground">
                            {i + 1}.
                          </span>{" "}
                          {post.title}
                        </p>
                        <Badge
                          variant="muted"
                          className="text-[10px] shrink-0"
                        >
                          {post.view_count} views
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>{post.unique_visitors} visitors</span>
                        <span>{formatTime(post.avg_time_on_page)} avg</span>
                        <span>{post.avg_scroll_depth}% scroll</span>
                        <span>{post.avg_read_completion}% read</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No posts with engagement data yet
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Per-Post Engagement Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardContent className="p-5">
            <h3 className="font-display font-bold text-sm mb-4">
              Post-by-Post Engagement
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="pb-2 pr-4 font-medium">Post</th>
                    <th className="pb-2 px-2 font-medium text-right">Views</th>
                    <th className="pb-2 px-2 font-medium text-right">
                      Visitors
                    </th>
                    <th className="pb-2 px-2 font-medium text-right hidden sm:table-cell">
                      Avg. Time
                    </th>
                    <th className="pb-2 px-2 font-medium text-right hidden md:table-cell">
                      Scroll
                    </th>
                    <th className="pb-2 px-2 font-medium text-right hidden md:table-cell">
                      Read %
                    </th>
                    <th className="pb-2 px-2 font-medium text-right hidden lg:table-cell">
                      Deep Readers
                    </th>
                    <th className="pb-2 px-2 font-medium text-right hidden lg:table-cell">
                      Shares
                    </th>
                    <th className="pb-2 pl-2 font-medium text-right">Today</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr
                      key={post.blog_post_id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-2.5 pr-4">
                        <div className="min-w-[160px]">
                          <p className="font-medium line-clamp-1">
                            {post.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            /{post.slug}
                          </p>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono">
                        {post.view_count.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono">
                        {post.unique_visitors.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono hidden sm:table-cell">
                        {formatTime(post.avg_time_on_page)}
                      </td>
                      <td className="py-2.5 px-2 text-right hidden md:table-cell">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12">
                            <ProgressBar value={post.avg_scroll_depth} />
                          </div>
                          <span className="font-mono text-xs w-8 text-right">
                            {post.avg_scroll_depth}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right hidden md:table-cell">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12">
                            <ProgressBar
                              value={post.avg_read_completion}
                              color="bg-green-500"
                            />
                          </div>
                          <span className="font-mono text-xs w-8 text-right">
                            {post.avg_read_completion}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono hidden lg:table-cell">
                        {post.deep_readers}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono hidden lg:table-cell">
                        {post.share_count}
                      </td>
                      <td className="py-2.5 pl-2 text-right">
                        <Badge
                          variant={
                            post.visitors_today > 0 ? "success" : "muted"
                          }
                          className="text-[10px]"
                        >
                          {post.visitors_today}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {posts.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-8 text-center text-muted-foreground"
                      >
                        No blog posts with engagement data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
