"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  Calendar,
  Trophy,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Eye,
  ShieldAlert,
  BarChart3,
  Star,
  Settings,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { mockUsers } from "@/lib/mock-data";
import { toast } from "sonner";

const stats = [
  {
    label: "Total Users",
    value: "10,234",
    change: "+12% this month",
    icon: Users,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    label: "Total Events",
    value: "1,456",
    change: "+8% this month",
    icon: Calendar,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    label: "Total Hackathons",
    value: "289",
    change: "+15% this month",
    icon: Trophy,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    label: "Revenue",
    value: "$45,670",
    change: "+22% this month",
    icon: DollarSign,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

const sidebarLinks = [
  { label: "Overview", href: "/admin", icon: BarChart3 },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Events", href: "/admin/events", icon: Calendar },
  { label: "Hackathons", href: "/admin/hackathons", icon: Trophy },
  { label: "Reports", href: "/admin/reports", icon: ShieldAlert },
  { label: "Analytics", href: "/admin/analytics", icon: TrendingUp },
  { label: "Featured", href: "/admin/featured", icon: Star },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

const flaggedAlerts = [
  {
    id: "flag-1",
    type: "Event",
    title: "Suspicious Crypto Giveaway Event",
    reporter: "Sarah Kim",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "flag-2",
    type: "User",
    title: "Spam account: bot_user_2938",
    reporter: "Marcus Johnson",
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "flag-3",
    type: "Hackathon",
    title: "Misleading prize pool advertisement",
    reporter: "Emma Wilson",
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function AdminDashboardPage() {
  const recentUsers = mockUsers.slice(0, 5);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
          >
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
              <Badge variant="gradient">Admin</Badge>
            </div>
            <div className="flex items-center gap-2">
              {sidebarLinks.slice(1).map((link) => (
                <Link key={link.href} href={link.href}>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <link.icon className="h-4 w-4" />
                    <span className="hidden md:inline">{link.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, i) => (
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

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">User Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 rounded-xl bg-gradient-to-br from-blue-500/20 via-blue-400/10 to-blue-600/5 flex items-center justify-center border border-blue-500/10">
                    <div className="text-center">
                      <TrendingUp className="h-10 w-10 text-blue-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">User Growth Chart</p>
                      <p className="text-xs text-muted-foreground mt-1">+18% compared to last month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Active Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 rounded-xl bg-gradient-to-br from-green-500/20 via-green-400/10 to-green-600/5 flex items-center justify-center border border-green-500/10">
                    <div className="text-center">
                      <Calendar className="h-10 w-10 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Active Events Chart</p>
                      <p className="text-xs text-muted-foreground mt-1">42 events this week</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Recent Signups & Flagged Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Signups Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2"
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Recent Signups</CardTitle>
                  <Link href="/admin/users">
                    <Button variant="ghost" size="sm">
                      View All
                    </Button>
                  </Link>
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
                        {recentUsers.map((user, i) => (
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
                                  <AvatarImage src={user.avatar} alt={user.name} />
                                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-sm">{user.name}</span>
                              </div>
                            </td>
                            <td className="py-3 text-sm text-muted-foreground hidden sm:table-cell">{user.email}</td>
                            <td className="py-3 text-sm text-muted-foreground hidden md:table-cell">{formatDate(user.createdAt)}</td>
                            <td className="py-3">
                              <Badge variant="secondary" className="capitalize text-xs">
                                {user.roles[0]}
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
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Flagged Content Alerts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Flagged Content</CardTitle>
                  <Link href="/admin/reports">
                    <Button variant="ghost" size="sm">
                      View All
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {flaggedAlerts.map((alert, i) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.05 }}
                        className="p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <Badge
                            variant={
                              alert.type === "Event"
                                ? "default"
                                : alert.type === "User"
                                ? "destructive"
                                : "warning"
                            }
                            className="text-xs"
                          >
                            {alert.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(alert.date)}
                          </span>
                        </div>
                        <p className="text-sm font-medium mb-1">{alert.title}</p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Reported by {alert.reporter}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8"
                          onClick={() => toast.info(`Reviewing: ${alert.title}`)}
                        >
                          <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                          Review
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </>
  );
}
