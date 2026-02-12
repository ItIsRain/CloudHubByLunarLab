"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Gavel,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatDate } from "@/lib/utils";
import { mockHackathons, mockSubmissions } from "@/lib/mock-data";

type FilterType = "all" | "pending" | "reviewed";

export default function HackathonJudgingPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;
  const hackathon = mockHackathons.find((h) => h.id === hackathonId);
  const [filter, setFilter] = React.useState<FilterType>("all");
  const [search, setSearch] = React.useState("");

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
              <Gavel className="h-16 w-16 text-muted-foreground/30 mb-4" />
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

  // Simulate some reviewed/pending states for each submission
  const submissions = mockSubmissions.slice(0, 12).map((sub, i) => ({
    ...sub,
    isReviewed: i < 5,
    mockScore: i < 5 ? (7 + (i * 0.4)).toFixed(1) : null,
  }));

  const reviewed = submissions.filter((s) => s.isReviewed).length;
  const total = submissions.length;

  const filteredSubmissions = submissions.filter((sub) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "reviewed" && sub.isReviewed) ||
      (filter === "pending" && !sub.isReviewed);
    const matchesSearch =
      !search ||
      sub.projectName.toLowerCase().includes(search.toLowerCase()) ||
      sub.team.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filters: { label: string; value: FilterType; count: number }[] = [
    { label: "All", value: "all", count: total },
    { label: "Pending", value: "pending", count: total - reviewed },
    { label: "Reviewed", value: "reviewed", count: reviewed },
  ];

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
            <h1 className="font-display text-3xl font-bold">{hackathon.name}</h1>
            <p className="text-muted-foreground mt-1">Judging Submissions</p>
            <div className="mt-3 flex items-center gap-3">
              <Badge variant="secondary">
                {reviewed}/{total} reviewed
              </Badge>
              <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                  style={{ width: `${(reviewed / total) * 100}%` }}
                />
              </div>
            </div>
          </motion.div>

          {/* Filters & Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row gap-4 mb-6"
          >
            <div className="flex gap-2">
              {filters.map((f) => (
                <Button
                  key={f.value}
                  variant={filter === f.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(f.value)}
                >
                  <Filter className="mr-1.5 h-3.5 w-3.5" />
                  {f.label}
                  <Badge variant="secondary" className="ml-1.5 text-[10px]">
                    {f.count}
                  </Badge>
                </Button>
              ))}
            </div>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search submissions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </motion.div>

          {/* Submissions List */}
          <div className="space-y-3">
            {filteredSubmissions.map((sub, i) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
              >
                <Card className="group hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display font-semibold truncate group-hover:text-primary transition-colors">
                            {sub.projectName}
                          </h3>
                          <Badge variant="outline" className="text-[10px]">
                            {sub.track.name}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          by {sub.team.name}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Score */}
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Score</p>
                          <p className={cn(
                            "font-display font-bold text-lg",
                            sub.mockScore ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {sub.mockScore ?? "\u2014"}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <Badge
                          variant={sub.isReviewed ? "success" : "warning"}
                          dot
                        >
                          {sub.isReviewed ? (
                            <>
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Reviewed
                            </>
                          ) : (
                            <>
                              <Clock className="mr-1 h-3 w-3" />
                              Pending
                            </>
                          )}
                        </Badge>

                        {/* Action */}
                        <Button asChild size="sm" variant={sub.isReviewed ? "outline" : "default"}>
                          <Link href={`/judge/${hackathonId}/${sub.id}`}>
                            {sub.isReviewed ? "Edit" : "Score"}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {filteredSubmissions.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center py-16"
              >
                <Gavel className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">
                  No submissions match your filters.
                </p>
              </motion.div>
            )}
          </div>

          {/* Results Link */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-8"
          >
            <Button variant="outline" asChild>
              <Link href={`/judge/${hackathonId}/results`}>
                View Final Rankings
              </Link>
            </Button>
          </motion.div>
        </div>
      </main>
    </>
  );
}
