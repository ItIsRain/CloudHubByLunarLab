"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Gavel,
  ClipboardCheck,
  Clock,
  Star,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { useHackathons } from "@/hooks/use-hackathons";
import { useAuthStore } from "@/store/auth-store";

export default function JudgeDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const { data: hackathonsData, isLoading: hackathonsLoading } = useHackathons();
  const hackathons = hackathonsData?.data || [];
  const assignedHackathons = hackathons.filter(
    (h) => h.status === "judging" || h.status === "submission"
  );

  const stats = [
    { label: "Assigned Hackathons", value: assignedHackathons.length, icon: ClipboardCheck, color: "text-blue-500" },
    { label: "Completed", value: 0, icon: Gavel, color: "text-green-500" },
    { label: "Pending", value: assignedHackathons.length, icon: Clock, color: "text-amber-500" },
    { label: "Avg Score", value: "-", icon: Star, color: "text-primary" },
  ];

  const reviewed = 0;
  const total = assignedHackathons.length || 1;
  const progressPercent = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  if (hackathonsLoading) return <><Navbar /><main className="min-h-screen bg-background pt-24 pb-16"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="shimmer rounded-xl h-96 w-full" /></div></main></>;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                <Gavel className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold">Judge Dashboard</h1>
                <p className="text-muted-foreground">
                  Welcome back! You have submissions waiting for your review.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="relative overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className="mt-1 text-3xl font-bold font-display">{stat.value}</p>
                      </div>
                      <stat.icon className={cn("h-8 w-8 opacity-80", stat.color)} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Overall Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Overall Progress
                  </CardTitle>
                  <Badge variant="secondary">{reviewed} of {total} submissions reviewed</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{progressPercent}%</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Assigned Hackathons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">Assigned Hackathons</h2>
              {assignedHackathons.length > 0 && (
                <Badge variant="default" dot pulse>
                  {assignedHackathons.length} active
                </Badge>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {assignedHackathons.map((h, i) => (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.05 }}
                >
                  <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-display text-lg font-bold group-hover:text-primary transition-colors">
                              {h.name}
                            </h3>
                            <Badge
                              variant={
                                h.status === "hacking"
                                  ? "warning"
                                  : h.status === "judging"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {h.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {h.tagline}
                          </p>
                          <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{h.participantCount} participants</span>
                            <span>{h.teamCount} teams</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Judging: {formatDate(h.judgingStart)} - {formatDate(h.judgingEnd)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Button asChild size="sm" className="w-full">
                          <Link href={`/judge/${h.id}`}>
                            Review Submissions
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <Button variant="outline" asChild>
              <Link href="/judge/history">View Judging History</Link>
            </Button>
          </motion.div>
        </div>
      </main>
    </>
  );
}
