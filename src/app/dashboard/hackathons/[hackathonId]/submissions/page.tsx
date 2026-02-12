"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Download,
  FileText,
  Star,
  ExternalLink,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatDate } from "@/lib/utils";
import { mockHackathons, mockSubmissions } from "@/lib/mock-data";
import { toast } from "sonner";

const submissionStatusConfig: Record<string, { label: string; variant: "muted" | "success" | "warning" | "secondary" | "gradient" }> = {
  draft: { label: "Draft", variant: "muted" },
  submitted: { label: "Submitted", variant: "secondary" },
  "under-review": { label: "Under Review", variant: "warning" },
  scored: { label: "Scored", variant: "success" },
  winner: { label: "Winner", variant: "gradient" },
};

export default function SubmissionsManagementPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;
  const hackathon = mockHackathons.find((h) => h.id === hackathonId);

  const [search, setSearch] = React.useState("");
  const [trackFilter, setTrackFilter] = React.useState("all");

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

  const submissions = mockSubmissions.filter(
    (s) => s.hackathonId === hackathonId
  ).length > 0
    ? mockSubmissions.filter((s) => s.hackathonId === hackathonId)
    : mockSubmissions.slice(0, 10);

  const tracks = Array.from(new Set(submissions.map((s) => s.track.name)));

  const filteredSubmissions = submissions.filter((s) => {
    const matchesSearch =
      s.projectName.toLowerCase().includes(search.toLowerCase()) ||
      s.team.name.toLowerCase().includes(search.toLowerCase());
    const matchesTrack =
      trackFilter === "all" || s.track.name === trackFilter;
    return matchesSearch && matchesTrack;
  });

  const selectClasses =
    "flex h-11 rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary appearance-none";

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
            <h1 className="font-display text-3xl font-bold">Submissions</h1>
            <p className="text-muted-foreground mt-1">
              {submissions.length} total submissions
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              toast.success("Exporting all submissions. Download will begin shortly.")
            }
          >
            <Download className="h-4 w-4" />
            Export All
          </Button>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
          <div className="flex-1">
            <Input
              placeholder="Search submissions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
          <select
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
            className={selectClasses}
          >
            <option value="all">All Tracks</option>
            {tracks.map((track) => (
              <option key={track} value={track}>
                {track}
              </option>
            ))}
          </select>
        </motion.div>

        {/* Submissions Grid */}
        {filteredSubmissions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSubmissions.map((sub, i) => {
              const statusConf = submissionStatusConfig[sub.status] || {
                label: sub.status,
                variant: "muted" as const,
              };
              return (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                >
                  <Link href={`/dashboard/submissions/${sub.id}`}>
                    <Card hover className="h-full">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display font-bold text-base mb-1 truncate">
                              {sub.projectName}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              by {sub.team.name}
                            </p>
                          </div>
                          <Badge variant={statusConf.variant}>
                            {statusConf.label}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline" className="text-xs">
                            {sub.track.name}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Submitted {formatDate(sub.submittedAt)}</span>
                          {sub.averageScore !== undefined && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                              <span className="font-medium text-foreground">
                                {sub.averageScore.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-display text-xl font-bold mb-2">
              No submissions found
            </h3>
            <p className="text-muted-foreground">
              No submissions match your current filters.
            </p>
          </motion.div>
        )}
      </main>
    </>
  );
}
