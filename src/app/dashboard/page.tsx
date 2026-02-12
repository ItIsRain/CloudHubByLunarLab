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
import { cn, formatDate } from "@/lib/utils";
import {
  mockEvents,
  mockHackathons,
  mockNotifications,
  mockTeams,
} from "@/lib/mock-data";

const stats = [
  {
    label: "Events Hosted",
    value: "12",
    change: "+2 this month",
    trend: "up",
    icon: Calendar,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    label: "Hackathons Joined",
    value: "8",
    change: "+3 this month",
    trend: "up",
    icon: Trophy,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    label: "Total Attendees",
    value: "2,847",
    change: "+324 this month",
    trend: "up",
    icon: Users,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    label: "Prize Money Won",
    value: "$15,500",
    change: "+$5,000 this month",
    trend: "up",
    icon: Zap,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

const quickActions = [
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

export default function DashboardPage() {
  const { user } = useAuthStore();
  const firstName = user?.name?.split(" ")[0] || "there";
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
  }, []);

  const upcomingEvents = mockEvents.slice(0, 3);
  const activeHackathons = mockHackathons
    .filter((h) => h.status !== "completed")
    .slice(0, 2);
  const recentNotifications = mockNotifications.slice(0, 5);
  const userTeams = mockTeams.slice(0, 3);

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
                <div className="grid sm:grid-cols-2 gap-4">
                  {upcomingEvents.slice(0, 2).map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
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
                <div className="space-y-4">
                  {activeHackathons.map((hackathon) => (
                    <HackathonCard key={hackathon.id} hackathon={hackathon} />
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Right Column - Notifications & Teams */}
            <div className="space-y-8">
              {/* Notifications */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
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
                    {recentNotifications.map((notification) => (
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
                    <Button variant="ghost" className="w-full" size="sm" asChild>
                      <Link href="/dashboard/notifications">
                        View all notifications
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Your Teams */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
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
                    {userTeams.map((team) => (
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
                    <Button variant="ghost" className="w-full" size="sm" asChild>
                      <Link href="/dashboard/team">View all teams</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Links */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
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
