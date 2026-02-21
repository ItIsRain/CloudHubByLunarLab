"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Trophy,
  Medal,
  Download,
  Gavel,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHackathon } from "@/hooks/use-hackathons";
import { useHackathonSubmissions } from "@/hooks/use-submissions";

export default function ResultsPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;
  const { data: hackathonData, isLoading } = useHackathon(hackathonId);
  const hackathon = hackathonData?.data;
  const { data: submissionsData, isLoading: submissionsLoading } = useHackathonSubmissions(hackathonId);

  if (isLoading || submissionsLoading) return <><Navbar /><main className="min-h-screen bg-background pt-24 pb-16"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="shimmer rounded-xl h-96 w-full" /></div></main></>;

  if (!hackathon) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <Trophy className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h1 className="font-display text-2xl font-bold">Hackathon Not Found</h1>
              <p className="text-muted-foreground mt-2">
                The hackathon you are looking for does not exist.
              </p>
              <Button asChild className="mt-6">
                <Link href="/judge">Back to Dashboard</Link>
              </Button>
            </motion.div>
          </div>
        </main>
      </>
    );
  }

  // Rank submissions by averageScore descending
  const rankedSubmissions = [...(submissionsData?.data || [])]
    .sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0))
    .map((sub, i) => ({
      ...sub,
      finalScore: sub.averageScore ?? 0,
      rank: i + 1,
    }));

  const getRankStyle = (rank: number) => {
    if (rank === 1)
      return {
        bg: "bg-amber-500/10 border-amber-500/30",
        text: "text-amber-500",
        medal: "#FFD700",
      };
    if (rank === 2)
      return {
        bg: "bg-gray-300/10 border-gray-400/30",
        text: "text-gray-400",
        medal: "#C0C0C0",
      };
    if (rank === 3)
      return {
        bg: "bg-orange-700/10 border-orange-700/30",
        text: "text-orange-600",
        medal: "#CD7F32",
      };
    return { bg: "", text: "text-muted-foreground", medal: "" };
  };

  const handleExport = () => {
    toast.success("Results exported!", {
      description: "The results CSV has been downloaded.",
    });
  };

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
              href={`/judge/${hackathonId}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Submissions
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="font-display text-3xl font-bold">{hackathon.name}</h1>
              <p className="text-muted-foreground mt-1">Final Rankings</p>
            </div>
            <Button onClick={handleExport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Results
            </Button>
          </motion.div>

          {/* Results Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Team
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Project
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Track
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Final Score
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankedSubmissions.map((sub, i) => {
                        const style = getRankStyle(sub.rank);
                        return (
                          <motion.tr
                            key={sub.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 + i * 0.05 }}
                            className={cn(
                              "border-b last:border-0 transition-colors hover:bg-muted/50",
                              sub.rank <= 3 && style.bg
                            )}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {sub.rank <= 3 ? (
                                  <div
                                    className="flex h-8 w-8 items-center justify-center rounded-full"
                                    style={{ backgroundColor: `${style.medal}20` }}
                                  >
                                    {sub.rank === 1 ? (
                                      <Trophy
                                        className="h-4 w-4"
                                        style={{ color: style.medal }}
                                      />
                                    ) : (
                                      <Medal
                                        className="h-4 w-4"
                                        style={{ color: style.medal }}
                                      />
                                    )}
                                  </div>
                                ) : (
                                  <span className="flex h-8 w-8 items-center justify-center text-sm font-medium text-muted-foreground">
                                    {sub.rank}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-medium text-sm">
                                {sub.team.name}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <p className={cn(
                                "font-semibold text-sm",
                                sub.rank <= 3 && style.text
                              )}>
                                {sub.projectName}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {sub.tagline}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className="text-[10px]">
                                {sub.track.name}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span
                                className={cn(
                                  "font-display text-lg font-bold",
                                  sub.rank <= 3 ? style.text : "text-foreground"
                                )}
                              >
                                {sub.finalScore}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                /10
                              </span>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-8"
          >
            <Button variant="outline" asChild>
              <Link href="/judge">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Judge Dashboard
              </Link>
            </Button>
          </motion.div>
        </div>
      </main>
    </>
  );
}
