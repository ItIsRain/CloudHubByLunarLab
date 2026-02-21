"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  Calendar,
  Mail,
  Settings,
  Plus,
  TrendingUp,
  ArrowRight,
  BarChart3,
  UserPlus,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { mockCommunities } from "@/lib/mock-data";
import { useEvents } from "@/hooks/use-events";

const community = mockCommunities[0];

const quickActions = [
  {
    label: "Create Event",
    description: "Host a new event for your community",
    icon: Plus,
    href: "/events/create",
    color: "bg-primary/10 text-primary",
  },
  {
    label: "Send Newsletter",
    description: "Send updates to your subscribers",
    icon: Mail,
    href: "/dashboard/community/newsletter",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    label: "Manage Members",
    description: "View and manage community members",
    icon: UserPlus,
    href: "/dashboard/community/members",
    color: "bg-green-500/10 text-green-600",
  },
];

const growthData = [
  { month: "Aug", members: 3200 },
  { month: "Sep", members: 3650 },
  { month: "Oct", members: 4100 },
  { month: "Nov", members: 4580 },
  { month: "Dec", members: 4900 },
  { month: "Jan", members: 5420 },
];

export default function CommunityDashboardPage() {
  const { data: eventsData } = useEvents();
  const recentEvents = (eventsData?.data || []).slice(0, 3);

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="font-display text-3xl font-bold">My Community</h1>
              <p className="text-muted-foreground mt-1">
                Manage your community, events, and members
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/dashboard/community/settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </Button>
          </motion.div>

          {/* Community Overview Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-8"
          >
            <Card className="overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-primary to-accent" />
              <CardContent className="p-6 -mt-10 relative">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="h-20 w-20 rounded-2xl bg-card border-4 border-card shadow-lg flex items-center justify-center">
                    <span className="font-display text-2xl font-bold text-primary">
                      {community.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h2 className="font-display text-2xl font-bold">
                      {community.name}
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      {community.description}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t">
                  <div>
                    <p className="text-2xl font-bold font-display">
                      {formatNumber(community.memberCount)}
                    </p>
                    <p className="text-sm text-muted-foreground">Members</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display">
                      {community.eventCount}
                    </p>
                    <p className="text-sm text-muted-foreground">Events</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display">23</p>
                    <p className="text-sm text-muted-foreground">This Month</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-2xl font-bold font-display text-green-600">
                        +12%
                      </p>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="text-sm text-muted-foreground">Growth</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="font-display text-xl font-bold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {quickActions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                  >
                    <Link href={action.href}>
                      <Card hover className="h-full">
                        <CardContent className="p-5">
                          <div
                            className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center mb-3",
                              action.color
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <h3 className="font-display font-bold mb-1">
                            {action.label}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {action.description}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Events */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold">Recent Events</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/events">
                    View All <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
              <div className="space-y-3">
                {recentEvents.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                  >
                    <Card hover>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">
                              {event.title}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(event.startDate)}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {event.registrationCount} registered
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Member Growth Chart Placeholder */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold">Member Growth</h2>
                <Badge variant="secondary">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Last 6 months
                </Badge>
              </div>
              <Card className="p-6">
                <div className="flex items-end gap-2 h-48">
                  {growthData.map((d, i) => {
                    const maxVal = Math.max(...growthData.map((g) => g.members));
                    const height = (d.members / maxVal) * 100;
                    return (
                      <motion.div
                        key={d.month}
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ delay: 0.3 + i * 0.05, duration: 0.5 }}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-primary to-accent/80 min-h-[4px]"
                          style={{ height: "100%" }}
                        />
                        <span className="text-xs text-muted-foreground mt-1">
                          {d.month}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t text-center">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {formatNumber(community.memberCount)}
                    </span>{" "}
                    total members
                  </p>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Links to Sub-Pages */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {[
              { label: "Members", href: "/dashboard/community/members", icon: Users },
              {
                label: "Newsletter",
                href: "/dashboard/community/newsletter",
                icon: Mail,
              },
              {
                label: "Settings",
                href: "/dashboard/community/settings",
                icon: Settings,
              },
              {
                label: "Analytics",
                href: "/dashboard",
                icon: BarChart3,
              },
            ].map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.label} href={link.href}>
                  <Card hover className="p-4 text-center">
                    <Icon className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">{link.label}</p>
                  </Card>
                </Link>
              );
            })}
          </motion.div>
        </div>
      </main>
    </>
  );
}
