"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Scale,
  Edit,
  Plus,
  Trophy,
  CheckCircle,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import { mockHackathons, mockUsers } from "@/lib/mock-data";
import { toast } from "sonner";

const judgingCriteria = [
  { name: "Innovation", weight: 25, color: "bg-blue-500" },
  { name: "Technical Execution", weight: 25, color: "bg-green-500" },
  { name: "Design & UX", weight: 25, color: "bg-purple-500" },
  { name: "Impact & Usefulness", weight: 25, color: "bg-yellow-500" },
];

const mockJudges = [
  {
    user: mockUsers[2],
    assignedCount: 15,
    scoredCount: 10,
  },
  {
    user: mockUsers[3],
    assignedCount: 12,
    scoredCount: 5,
  },
  {
    user: mockUsers[4],
    assignedCount: 11,
    scoredCount: 0,
  },
];

const totalSubmissions = 38;
const totalScored = 15;

export default function JudgingManagementPage() {
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

  const allScored = totalScored >= totalSubmissions;

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
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="font-display text-3xl font-bold">Judging</h1>
            <p className="text-muted-foreground mt-1">
              Manage judging criteria, judges, and scoring
            </p>
          </div>
          <Button
            variant="gradient"
            disabled={!allScored}
            onClick={() =>
              toast.success("Results published! Winners have been notified.")
            }
          >
            <Trophy className="h-4 w-4" />
            Publish Results
          </Button>
        </motion.div>

        {/* Scoring Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8"
        >
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span className="font-medium">Scoring Progress</span>
                </div>
                <span className="text-sm font-mono text-muted-foreground">
                  {totalScored}/{totalSubmissions} submissions scored
                </span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(totalScored / totalSubmissions) * 100}%`,
                  }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                />
              </div>
              {!allScored && (
                <p className="text-xs text-muted-foreground mt-2">
                  All submissions must be scored before publishing results.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Judging Criteria */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Judging Criteria</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast.success("Criteria editor coming soon!")
                    }
                  >
                    <Edit className="h-4 w-4" />
                    Edit Criteria
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {judgingCriteria.map((criteria, i) => (
                    <motion.div
                      key={criteria.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.05 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {criteria.name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {criteria.weight}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            criteria.color
                          )}
                          style={{ width: `${criteria.weight}%` }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Judges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Judges</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast.success("Judge invitation sent!")
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Add Judge
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockJudges.map((judge, i) => {
                    const progress =
                      judge.assignedCount > 0
                        ? (judge.scoredCount / judge.assignedCount) * 100
                        : 0;
                    return (
                      <motion.div
                        key={judge.user.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 + i * 0.05 }}
                        className="p-3 rounded-xl border bg-muted/30"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar size="sm">
                            <AvatarImage
                              src={judge.user.avatar}
                              alt={judge.user.name}
                            />
                            <AvatarFallback>
                              {getInitials(judge.user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {judge.user.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {judge.scoredCount}/{judge.assignedCount}{" "}
                              submissions scored
                            </p>
                          </div>
                          <Badge
                            variant={
                              judge.scoredCount === judge.assignedCount
                                ? "success"
                                : "muted"
                            }
                          >
                            {Math.round(progress)}%
                          </Badge>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </>
  );
}
