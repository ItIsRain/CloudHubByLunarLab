"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  Users,
  Calendar,
  Trophy,
  ShieldAlert,
  Eye,
  TrendingUp,
  Star,
  Settings,
  BarChart3,
  BookOpen,
  Loader2,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "events", label: "Events", icon: Calendar },
  { id: "hackathons", label: "Hackathons", icon: Trophy },
  { id: "reports", label: "Reports", icon: ShieldAlert },
  { id: "audit-logs", label: "Audit Logs", icon: Eye },
  { id: "analytics", label: "Analytics", icon: TrendingUp },
  { id: "featured", label: "Featured", icon: Star },
  { id: "blog", label: "Blog", icon: BookOpen },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type TabId = (typeof tabs)[number]["id"];

const TabFallback = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const OverviewTab = dynamic(
  () => import("./_components/overview-tab").then((m) => ({ default: m.OverviewTab })),
  { loading: TabFallback }
);
const UsersTab = dynamic(
  () => import("./_components/users-tab").then((m) => ({ default: m.UsersTab })),
  { loading: TabFallback }
);
const EventsTab = dynamic(
  () => import("./_components/events-tab").then((m) => ({ default: m.EventsTab })),
  { loading: TabFallback }
);
const HackathonsTab = dynamic(
  () => import("./_components/hackathons-tab").then((m) => ({ default: m.HackathonsTab })),
  { loading: TabFallback }
);
const ReportsTab = dynamic(
  () => import("./_components/reports-tab").then((m) => ({ default: m.ReportsTab })),
  { loading: TabFallback }
);
const AuditLogsTab = dynamic(
  () => import("./_components/audit-logs-tab").then((m) => ({ default: m.AuditLogsTab })),
  { loading: TabFallback }
);
const AnalyticsTab = dynamic(
  () => import("./_components/analytics-tab").then((m) => ({ default: m.AnalyticsTab })),
  { loading: TabFallback }
);
const FeaturedTab = dynamic(
  () => import("./_components/featured-tab").then((m) => ({ default: m.FeaturedTab })),
  { loading: TabFallback }
);
const BlogTab = dynamic(
  () => import("./_components/blog-tab").then((m) => ({ default: m.BlogTab })),
  { loading: TabFallback }
);
const SettingsTab = dynamic(
  () => import("./_components/settings-tab").then((m) => ({ default: m.SettingsTab })),
  { loading: TabFallback }
);

const tabComponents: Record<TabId, React.ComponentType> = {
  overview: OverviewTab,
  users: UsersTab,
  events: EventsTab,
  hackathons: HackathonsTab,
  reports: ReportsTab,
  "audit-logs": AuditLogsTab,
  analytics: AnalyticsTab,
  featured: FeaturedTab,
  blog: BlogTab,
  settings: SettingsTab,
};

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = React.useState<TabId>("overview");

  const ActiveComponent = tabComponents[activeTab];

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-6"
          >
            <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
            <Badge variant="gradient">Admin</Badge>
          </motion.div>

          {/* Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-8"
          >
            <div className="flex overflow-x-auto scrollbar-hide gap-1 p-1 bg-muted/50 rounded-xl border border-border">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                      "hover:text-foreground",
                      isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background/50"
                    )}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Tab Content */}
          <ActiveComponent />
        </div>
      </main>
    </>
  );
}
