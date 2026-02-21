"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, FileText, Star, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatDate } from "@/lib/utils";
import type { Hackathon } from "@/lib/types";
import { useHackathonSubmissions } from "@/hooks/use-submissions";
import { toast } from "sonner";

interface SubmissionsTabProps {
  hackathon: Hackathon;
  hackathonId: string;
}

const submissionStatusConfig: Record<
  string,
  {
    label: string;
    variant: "muted" | "success" | "warning" | "secondary" | "gradient";
  }
> = {
  draft: { label: "Draft", variant: "muted" },
  submitted: { label: "Submitted", variant: "secondary" },
  "under-review": { label: "Under Review", variant: "warning" },
  scored: { label: "Scored", variant: "success" },
  winner: { label: "Winner", variant: "gradient" },
};

const selectClasses =
  "flex h-11 rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary appearance-none";

export function SubmissionsTab({
  hackathon,
  hackathonId,
}: SubmissionsTabProps) {
  const { data: submissionsData, isLoading } =
    useHackathonSubmissions(hackathonId);

  const [search, setSearch] = React.useState("");
  const [trackFilter, setTrackFilter] = React.useState("all");

  const submissions = submissionsData?.data ?? [];

  const tracks = Array.from(
    new Set(submissions.map((s) => s.track?.name).filter(Boolean))
  );

  const filteredSubmissions = submissions.filter((s) => {
    const matchesSearch =
      s.projectName.toLowerCase().includes(search.toLowerCase()) ||
      s.team.name.toLowerCase().includes(search.toLowerCase());
    const matchesTrack =
      trackFilter === "all" || s.track?.name === trackFilter;
    return matchesSearch && matchesTrack;
  });

  const handleExport = () => {
    const csv = [
      [
        "Project Name",
        "Team",
        "Track",
        "Status",
        "Average Score",
        "Submitted At",
      ].join(","),
      ...filteredSubmissions.map((s) =>
        [
          `"${s.projectName}"`,
          `"${s.team.name}"`,
          `"${s.track?.name || "N/A"}"`,
          s.status,
          s.averageScore?.toFixed(1) || "N/A",
          s.submittedAt,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "submissions.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="font-display text-2xl font-bold">Submissions</h2>
          <p className="text-muted-foreground mt-1">
            {isLoading ? "--" : submissions.length} total submissions
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export All
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col sm:flex-row gap-4"
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

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shimmer rounded-xl h-36 w-full" />
          ))}
        </div>
      )}

      {/* Submissions Grid */}
      {!isLoading && filteredSubmissions.length > 0 && (
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
                transition={{ delay: 0.1 + i * 0.05 }}
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
                        {sub.track?.name && (
                          <Badge variant="outline" className="text-xs">
                            {sub.track.name}
                          </Badge>
                        )}
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
      )}

      {/* Empty state */}
      {!isLoading && filteredSubmissions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <FileText className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="font-display text-xl font-bold mb-2">
            No submissions found
          </h3>
          <p className="text-muted-foreground max-w-md">
            No submissions match your current filters.
          </p>
        </motion.div>
      )}
    </div>
  );
}
