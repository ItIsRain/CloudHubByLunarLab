"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Calendar,
  Trophy,
  Users,
  Plus,
  ArrowRight,
  Bell,
  Settings,
  TrendingUp,
  Clock,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EventCard } from "@/components/cards/event-card";
import { HackathonCard } from "@/components/cards/hackathon-card";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { useMyEvents } from "@/hooks/use-events";
import { useMyHackathons } from "@/hooks/use-hackathons";
import { useNotifications } from "@/hooks/use-notifications";
import { useMyTeams } from "@/hooks/use-teams";
import { useUsage } from "@/hooks/use-usage";
import { UsageBar } from "@/components/ui/usage-bar";

function buildStats(
  events: { registrationCount: number; createdAt: string }[],
  hackathons: { prizes?: { value: number; currency?: string }[]; createdAt: string }[]
) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const eventsThisMonth = events.filter((e) => e.createdAt >= monthStart).length;
  const hackathonsThisMonth = hackathons.filter((h) => h.createdAt >= monthStart).length;
  const totalAttendees = events.reduce((sum, e) => sum + (e.registrationCount || 0), 0);
  const totalPrize = hackathons.reduce(
    (sum, h) => sum + (h.prizes ?? []).reduce((s, p) => s + (p.value || 0), 0),
    0
  );
  // Use the currency from the first hackathon's first prize, or default to USD
  const firstPrize = hackathons.flatMap((h) => h.prizes ?? []).find((p) => p.currency);
  const prizeCurrency = firstPrize?.currency || "USD";

  return [
    {
      label: "Events Hosted",
      value: String(events.length),
      change: eventsThisMonth > 0 ? `+${eventsThisMonth} this month` : "No change",
      trend: "up" as const,
      icon: Calendar,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Hackathons Created",
      value: String(hackathons.length),
      change: hackathonsThisMonth > 0 ? `+${hackathonsThisMonth} this month` : "No change",
      trend: "up" as const,
      icon: Trophy,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      label: "Total Attendees",
      value: totalAttendees.toLocaleString(),
      change: "",
      trend: "up" as const,
      icon: Users,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Total Prize Pool",
      value: formatCurrency(totalPrize, prizeCurrency),
      change: "",
      trend: "up" as const,
      icon: Zap,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];
}

const organizerActions = [
  {
    label: "Create Event",
    href: "/events/create",
    icon: Calendar,
    color: "bg-blue-500",
  },
  {
    label: "Create Hackathon",
    href: "/hackathons/create",
    icon: Trophy,
    color: "bg-yellow-500",
  },
];

const commonActions = [
  {
    label: "Browse Events",
    href: "/explore",
    icon: Users,
    color: "bg-green-500",
  },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function PlanUsageCard() {
  const { eventsThisMonth, hackathonsThisMonth, attendeesPerEvent, tier, isLoading } = useUsage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Plan Usage</CardTitle>
            <Badge variant={tier === "free" ? "outline" : "default"} className="capitalize">
              {tier}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-1.5">
                  <div className="shimmer h-4 w-full rounded" />
                  <div className="shimmer h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <UsageBar
                used={eventsThisMonth.used}
                limit={eventsThisMonth.limit}
                label="Events this month"
              />
              <UsageBar
                used={hackathonsThisMonth.used}
                limit={hackathonsThisMonth.limit}
                label="Hackathons this month"
              />
              <UsageBar
                used={attendeesPerEvent.used}
                limit={attendeesPerEvent.limit}
                label="Attendees (largest event)"
              />
              {tier === "free" && (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/dashboard/billing">
                    <Zap className="h-3.5 w-3.5 mr-1.5" />
                    Upgrade for more
                  </Link>
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { user, hasRole } = useAuthStore();
  const firstName = user?.name?.split(" ")[0] || "there";
  const canCreate = hasRole("organizer") || hasRole("admin");
  const quickActions = canCreate
    ? [...organizerActions, ...commonActions]
    : commonActions;
  const [mounted, setMounted] = React.useState(false);
  const [greeting, setGreeting] = React.useState("Hello");
  const [dateStr, setDateStr] = React.useState("");

  React.useEffect(() => {
    setMounted(true);
    setGreeting(getGreeting());
    setDateStr(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    );
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "true") {
      toast.success("Email verified successfully! Welcome to CloudHub.");
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  const { data: eventsData, isLoading: eventsLoading } = useMyEvents();
  const { data: hackathonsData, isLoading: hackathonsLoading } = useMyHackathons();
  const { data: notificationsData, isLoading: notificationsLoading } = useNotifications({ pageSize: 5 });
  const { data: teamsData, isLoading: teamsLoading } = useMyTeams();

  const myEvents = eventsData?.data || [];
  const myHackathons = hackathonsData?.data || [];
  const upcomingEvents = myEvents.slice(0, 3);
  const activeHackathons = myHackathons
    .filter((h) => h.status !== "completed")
    .slice(0, 2);
  const stats = buildStats(myEvents, myHackathons);
  const recentNotifications = notificationsData?.data || [];
  const userTeams = (teamsData?.data || []).slice(0, 3);

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="font-display text-3xl font-bold mb-1">
                {greeting}, {firstName}!
              </h1>
              <p className="text-muted-foreground">
                {mounted ? dateStr : "\u00A0"}
              </p>
            </div>
            <div className="flex gap-3">
              {quickActions.map((action) => (
                <Button key={action.href} asChild>
                  <Link href={action.href}>
                    <Plus className="h-4 w-4 mr-2" />
                    {action.label}
                  </Link>
                </Button>
              ))}
            </div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {stat.label}
                        </p>
                        <p className="font-display text-3xl font-bold">
                          {stat.value}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <TrendingUp className="h-3 w-3 text-success" />
                          <span className="text-xs text-success">
                            {stat.change}
                          </span>
                        </div>
                      </div>
                      <div className={cn("p-3 rounded-xl", stat.bgColor)}>
                        <stat.icon className={cn("h-6 w-6", stat.color)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Events & Hackathons */}
            <div className="lg:col-span-2 space-y-8">
              {/* Upcoming Events */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-xl font-bold">
                    Upcoming Events
                  </h2>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard/events">
                      View all
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
                {eventsLoading ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="shimmer rounded-xl h-64 w-full" />
                    ))}
                  </div>
                ) : upcomingEvents.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {upcomingEvents.slice(0, 2).map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                        <Calendar className="h-6 w-6 text-blue-500" />
                      </div>
                      <h3 className="font-semibold mb-1">No upcoming events</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Discover events happening near you or online
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/explore/events">Browse Events</Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </motion.div>

              {/* Active Hackathons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-xl font-bold">
                      Active Hackathons
                    </h2>
                    <Badge variant="gradient" dot pulse>
                      Live
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard/hackathons">
                      View all
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
                {hackathonsLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="shimmer rounded-xl h-40 w-full" />
                    ))}
                  </div>
                ) : activeHackathons.length > 0 ? (
                  <div className="space-y-4">
                    {activeHackathons.map((hackathon) => (
                      <HackathonCard key={hackathon.id} hackathon={hackathon} />
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
                        <Trophy className="h-6 w-6 text-yellow-500" />
                      </div>
                      <h3 className="font-semibold mb-1">No active hackathons</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Find hackathons to compete in and win prizes
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/explore/hackathons">Browse Hackathons</Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </div>

            {/* Right Column - Plan Usage, Notifications & Teams */}
            <div className="space-y-8">
              {/* Plan Usage */}
              <PlanUsageCard />

              {/* Notifications */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Notifications</CardTitle>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/notifications">
                          <Bell className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {notificationsLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="shimmer rounded-lg h-14 w-full" />
                        ))}
                      </div>
                    ) : recentNotifications.length === 0 ? (
                      <div className="text-center py-6">
                        <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">No notifications yet</p>
                      </div>
                    ) : recentNotifications.map((notification) => (
                      <Link
                        key={notification.id}
                        href={notification.link || "#"}
                        className={cn(
                          "block p-3 rounded-lg transition-colors",
                          notification.isRead
                            ? "hover:bg-muted"
                            : "bg-primary/5 hover:bg-primary/10"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                              notification.isRead ? "bg-muted" : "bg-primary"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                    {!notificationsLoading && (
                      <Button variant="ghost" className="w-full" size="sm" asChild>
                        <Link href="/dashboard/notifications">
                          View all notifications
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Your Teams */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Your Teams</CardTitle>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/team">
                          <Users className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {teamsLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="shimmer rounded-lg h-14 w-full" />
                        ))}
                      </div>
                    ) : userTeams.length === 0 ? (
                      <div className="text-center py-6">
                        <Users className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">No teams yet</p>
                      </div>
                    ) : userTeams.map((team) => (
                      <Link
                        key={team.id}
                        href={`/dashboard/team/${team.id}`}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Avatar>
                          <AvatarImage src={team.avatar} />
                          <AvatarFallback>{team.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {team.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {team.members.length} members
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {team.status}
                        </Badge>
                      </Link>
                    ))}
                    {!teamsLoading && (
                      <Button variant="ghost" className="w-full" size="sm" asChild>
                        <Link href="/dashboard/team">View all teams</Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Links */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Quick Links</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/dashboard/profile">Profile</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/dashboard/settings">Settings</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/dashboard/certificates">Certificates</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/dashboard/bookmarks">Bookmarks</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
