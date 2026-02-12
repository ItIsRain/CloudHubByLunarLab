"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Eye,
  TrendingUp,
  DollarSign,
  BarChart3,
  PieChart,
  Globe,
  MapPin,
  Calendar,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { mockEvents } from "@/lib/mock-data";

const overviewStats = [
  {
    label: "Total Registrations",
    value: "156",
    icon: Users,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    change: "+23%",
  },
  {
    label: "Page Views",
    value: "1,234",
    icon: Eye,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    change: "+18%",
  },
  {
    label: "Conversion Rate",
    value: "12.6%",
    icon: TrendingUp,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    change: "+4.2%",
  },
  {
    label: "Revenue",
    value: "$2,340",
    icon: DollarSign,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    change: "+$580",
  },
];

const trafficSources = [
  { source: "Direct", percentage: 45, color: "bg-blue-500" },
  { source: "Social", percentage: 30, color: "bg-purple-500" },
  { source: "Email", percentage: 15, color: "bg-green-500" },
  { source: "Other", percentage: 10, color: "bg-yellow-500" },
];

const topCities = [
  { city: "San Francisco", count: 42, percentage: 27 },
  { city: "New York", count: 31, percentage: 20 },
  { city: "Austin", count: 24, percentage: 15 },
  { city: "Seattle", count: 19, percentage: 12 },
  { city: "Los Angeles", count: 15, percentage: 10 },
];

export default function AnalyticsPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const event = mockEvents.find((e) => e.id === eventId);

  if (!event) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <h2 className="font-display text-2xl font-bold mb-2">Event not found</h2>
              <p className="text-muted-foreground mb-6">
                The event you are looking for does not exist or has been removed.
              </p>
              <Button asChild>
                <Link href="/dashboard/events">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to My Events
                </Link>
              </Button>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/events/${eventId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Overview
              </Link>
            </Button>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="font-display text-3xl font-bold">Analytics</h1>
              <p className="text-muted-foreground mt-1">{event.title}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Last 30 days</span>
            </div>
          </motion.div>

          {/* Stats Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            {overviewStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.05 }}
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
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-green-500">
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

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Registration Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Registration Timeline</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-48 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-dashed border-primary/20 flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="h-10 w-10 text-primary/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Registration chart visualization
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Recharts integration coming soon
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Ticket Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Ticket Distribution</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-48 rounded-xl bg-gradient-to-br from-accent/5 to-primary/5 border border-dashed border-accent/20 flex items-center justify-center">
                    <div className="text-center">
                      <PieChart className="h-10 w-10 text-accent/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Ticket distribution breakdown
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Recharts integration coming soon
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Traffic Sources */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Traffic Sources</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {trafficSources.map((source, i) => (
                      <motion.div
                        key={source.source}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.05 }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium">
                            {source.source}
                          </span>
                          <span className="text-sm font-bold">
                            {source.percentage}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              source.color
                            )}
                            style={{ width: `${source.percentage}%` }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Geographic Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">
                      Geographic Distribution
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topCities.map((city, i) => (
                      <motion.div
                        key={city.city}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 + i * 0.05 }}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-sm font-bold">
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{city.city}</p>
                            <p className="text-xs text-muted-foreground">
                              {city.count} registrations
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">{city.percentage}%</Badge>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
