"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  UsersRound,
  FileText,
  GraduationCap,
  BarChart3,
  TrendingUp,
  PieChart,
  Activity,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { mockHackathons } from "@/lib/mock-data";

const stats = [
  { label: "Participants", value: "245", icon: Users, color: "text-blue-500", bgColor: "bg-blue-500/10", change: "+12%" },
  { label: "Teams", value: "52", icon: UsersRound, color: "text-green-500", bgColor: "bg-green-500/10", change: "+8%" },
  { label: "Submissions", value: "38", icon: FileText, color: "text-purple-500", bgColor: "bg-purple-500/10", change: "+5%" },
  { label: "Mentoring Sessions", value: "67", icon: GraduationCap, color: "text-orange-500", bgColor: "bg-orange-500/10", change: "+15%" },
];

const chartPlaceholders = [
  { title: "Registration Timeline", icon: TrendingUp, description: "Daily registration count over the past 30 days" },
  { title: "Team Size Distribution", icon: BarChart3, description: "Breakdown of team sizes (1-6 members)" },
  { title: "Track Distribution", icon: PieChart, description: "Number of submissions per track" },
  { title: "Submission Timeline", icon: Activity, description: "Submission activity over the hacking period" },
];

const topTracks = [
  { name: "AI/ML Innovation", participants: 89, percentage: 36 },
  { name: "Web3 & Blockchain", participants: 67, percentage: 27 },
  { name: "Developer Tools", participants: 52, percentage: 21 },
  { name: "Social Impact", participants: 37, percentage: 16 },
];

export default function AnalyticsPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;
  const hackathon = mockHackathons.find((h) => h.id === hackathonId);

  if (!hackathon) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h2 className="font-display text-2xl font-bold mb-2">Hackathon Not Found</h2>
            <Link href="/dashboard/hackathons">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link
            href={`/dashboard/hackathons/${hackathonId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Overview
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Insights and metrics for {hackathon.name}
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
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
                  <div className="mt-2">
                    <Badge variant="success" className="text-xs">
                      {stat.change}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Chart Placeholders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {chartPlaceholders.map((chart, i) => (
            <motion.div
              key={chart.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <chart.icon className="h-5 w-5 text-primary" />
                    {chart.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 rounded-xl bg-muted/50 border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center">
                    <chart.icon className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground text-center px-4">
                      {chart.description}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-2">
                      Chart visualization coming soon
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Top Tracks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Top Tracks by Participation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topTracks.map((track, i) => (
                  <motion.div
                    key={track.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + i * 0.05 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{track.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {track.participants} participants
                        </span>
                        <Badge variant="muted" className="text-xs">
                          {track.percentage}%
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${track.percentage}%` }}
                        transition={{
                          duration: 0.8,
                          ease: "easeOut",
                          delay: 0.5 + i * 0.1,
                        }}
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </>
  );
}
