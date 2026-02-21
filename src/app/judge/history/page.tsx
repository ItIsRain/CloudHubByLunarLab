"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  History,
  Trophy,
  ClipboardCheck,
  Star,
  Calendar,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { useHackathons } from "@/hooks/use-hackathons";

const summaryStats = [
  { label: "Total Hackathons Judged", value: 3, icon: Trophy },
  { label: "Total Submissions Scored", value: 45, icon: ClipboardCheck },
  { label: "Avg Score Given", value: "7.8", icon: Star },
];

export default function JudgingHistoryPage() {
  const { data: hackathonsData, isLoading: hackathonsLoading } = useHackathons();
  const hackathons = hackathonsData?.data || [];

  const pastJudging = [
    ...(hackathons[2] ? [{
      hackathon: hackathons[2],
      submissionsJudged: 18,
      averageScore: 7.6,
      completedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    }] : []),
    ...(hackathons[0] ? [{
      hackathon: hackathons[0],
      submissionsJudged: 15,
      averageScore: 8.1,
      completedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    }] : []),
    ...(hackathons[1] ? [{
      hackathon: hackathons[1],
      submissionsJudged: 12,
      averageScore: 7.5,
      completedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    }] : []),
  ];

  if (hackathonsLoading) return <><Navbar /><main className="min-h-screen bg-background pt-24 pb-16"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="shimmer rounded-xl h-96 w-full" /></div></main></>;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link
              href="/judge"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Judge Dashboard
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                <History className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold">
                  Judging History
                </h1>
                <p className="text-muted-foreground">
                  Your past judging activity across hackathons.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
            {summaryStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card>
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <stat.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-bold font-display">
                        {stat.value}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Past Hackathons */}
          <div className="space-y-4">
            {pastJudging.map((entry, i) => (
              <motion.div
                key={entry.hackathon.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
              >
                <Card className="group hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-display text-lg font-bold group-hover:text-primary transition-colors">
                            {entry.hackathon.name}
                          </h3>
                          <Badge variant="muted">Completed</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {entry.hackathon.tagline}
                        </p>
                        <div className="mt-3 flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(entry.completedAt)}
                          </span>
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <ClipboardCheck className="h-3.5 w-3.5" />
                            {entry.submissionsJudged} submissions judged
                          </span>
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Star className="h-3.5 w-3.5" />
                            Avg: {entry.averageScore}/10
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/judge/${entry.hackathon.id}/results`}>
                          View Results
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
