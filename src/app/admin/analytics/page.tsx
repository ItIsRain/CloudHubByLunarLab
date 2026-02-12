"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Users,
  UserCheck,
  TrendingUp,
  ArrowUpRight,
  DollarSign,
  Calendar,
  Globe,
  MapPin,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const keyMetrics = [
  {
    label: "Daily Active Users",
    value: "2,345",
    change: "+8.2%",
    icon: Users,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    label: "Monthly Active Users",
    value: "15,678",
    change: "+12.5%",
    icon: UserCheck,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    label: "Retention Rate",
    value: "68%",
    change: "+3.1%",
    icon: TrendingUp,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    label: "Conversion Rate",
    value: "12%",
    change: "+1.8%",
    icon: ArrowUpRight,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
];

const topCategories = [
  { name: "Technology", percentage: 45, color: "bg-blue-500" },
  { name: "AI / ML", percentage: 25, color: "bg-purple-500" },
  { name: "Design", percentage: 15, color: "bg-pink-500" },
  { name: "Business", percentage: 10, color: "bg-green-500" },
  { name: "Other", percentage: 5, color: "bg-gray-500" },
];

const topCities = [
  { city: "San Francisco", country: "USA", participants: 3_420 },
  { city: "New York", country: "USA", participants: 2_890 },
  { city: "London", country: "UK", participants: 2_150 },
  { city: "Berlin", country: "Germany", participants: 1_780 },
  { city: "Tokyo", country: "Japan", participants: 1_540 },
];

export default function AdminAnalyticsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-1">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="gap-1 -ml-2">
                  <ChevronLeft className="h-4 w-4" />
                  Admin
                </Button>
              </Link>
            </div>
            <h1 className="font-display text-3xl font-bold">Platform Analytics</h1>
            <p className="text-muted-foreground mt-1">Key metrics and insights across the platform</p>
          </motion.div>

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

          {/* Chart Placeholders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {[
              {
                title: "Daily Active Users",
                subtitle: "Trending upward over the past 30 days",
                icon: Users,
                gradient: "from-blue-500/20 via-blue-400/10 to-blue-600/5",
                borderColor: "border-blue-500/10",
                iconColor: "text-blue-500",
              },
              {
                title: "Revenue Trend",
                subtitle: "$142K total revenue this quarter",
                icon: DollarSign,
                gradient: "from-green-500/20 via-green-400/10 to-green-600/5",
                borderColor: "border-green-500/10",
                iconColor: "text-green-500",
              },
              {
                title: "Event Creation Rate",
                subtitle: "Average 12 new events per day",
                icon: Calendar,
                gradient: "from-purple-500/20 via-purple-400/10 to-purple-600/5",
                borderColor: "border-purple-500/10",
                iconColor: "text-purple-500",
              },
              {
                title: "Geographic Distribution",
                subtitle: "Users across 45 countries",
                icon: Globe,
                gradient: "from-orange-500/20 via-orange-400/10 to-orange-600/5",
                borderColor: "border-orange-500/10",
                iconColor: "text-orange-500",
              },
            ].map((chart, i) => (
              <motion.div
                key={chart.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{chart.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={cn(
                        "h-44 rounded-xl bg-gradient-to-br flex items-center justify-center border",
                        chart.gradient,
                        chart.borderColor
                      )}
                    >
                      <div className="text-center">
                        <chart.icon className={cn("h-10 w-10 mx-auto mb-2", chart.iconColor)} />
                        <p className="text-sm text-muted-foreground">{chart.title} Chart</p>
                        <p className="text-xs text-muted-foreground mt-1">{chart.subtitle}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Top Categories & Top Cities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Categories */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topCategories.map((cat, i) => (
                      <motion.div
                        key={cat.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.45 + i * 0.05 }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium">{cat.name}</span>
                          <span className="text-sm text-muted-foreground">{cat.percentage}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={cn("h-full rounded-full", cat.color)}
                            initial={{ width: 0 }}
                            animate={{ width: `${cat.percentage}%` }}
                            transition={{ delay: 0.5 + i * 0.05, duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Top Cities */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Cities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topCities.map((city, i) => (
                      <motion.div
                        key={city.city}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.05 }}
                        className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{city.city}</p>
                            <p className="text-xs text-muted-foreground">{city.country}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{city.participants.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">participants</p>
                        </div>
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
