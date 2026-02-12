"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileCode2,
  Search,
  Filter,
  Plus,
  Eye,
  Edit3,
  Trophy,
  ArrowUpRight,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getSubmissionsForUser } from "@/lib/mock-data";
import type { SubmissionStatus } from "@/lib/types";

const statusColors: Record<SubmissionStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-500/10 text-blue-500",
  "under-review": "bg-yellow-500/10 text-yellow-500",
  scored: "bg-green-500/10 text-green-500",
  winner: "bg-amber-500/10 text-amber-500",
};

const statusFilters: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "under-review", label: "Under Review" },
  { value: "scored", label: "Scored" },
  { value: "winner", label: "Winner" },
];

export default function SubmissionsPage() {
  const submissions = getSubmissionsForUser("user-1");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const filtered = submissions.filter((sub) => {
    const matchesSearch =
      sub.projectName.toLowerCase().includes(search.toLowerCase()) ||
      sub.tagline.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
          >
            <div>
              <h1 className="font-display text-3xl font-bold">My Submissions</h1>
              <p className="text-muted-foreground">{submissions.length} project submissions</p>
            </div>
            <Button asChild>
              <Link href="/dashboard/submissions/new">
                <Plus className="h-4 w-4 mr-2" />
                New Submission
              </Link>
            </Button>
          </motion.div>

          {/* Search & Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex flex-col sm:flex-row gap-3 mb-6"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search submissions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              {statusFilters.map((opt) => (
                <Badge
                  key={opt.value}
                  variant={statusFilter === opt.value ? "default" : "outline"}
                  className="cursor-pointer whitespace-nowrap"
                  onClick={() => setStatusFilter(opt.value)}
                >
                  {opt.label}
                </Badge>
              ))}
            </div>
          </motion.div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <FileCode2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-display text-lg font-bold mb-1">No submissions found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search
                  ? "Try adjusting your search."
                  : "Submit your first project to a hackathon!"}
              </p>
              <Button asChild>
                <Link href="/dashboard/submissions/new">Create Submission</Link>
              </Button>
            </motion.div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((sub, i) => (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
                    <CardContent className="p-5 flex flex-col flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <Badge className={cn("text-xs", statusColors[sub.status])}>
                          {sub.status === "winner" && <Trophy className="h-3 w-3 mr-1" />}
                          {sub.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {sub.upvotes} upvotes
                        </span>
                      </div>
                      <h3 className="font-display text-lg font-bold mb-1">{sub.projectName}</h3>
                      <p className="text-sm text-muted-foreground mb-3 flex-1">{sub.tagline}</p>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {sub.techStack.slice(0, 3).map((tech) => (
                          <Badge key={tech} variant="secondary" className="text-xs">{tech}</Badge>
                        ))}
                        {sub.techStack.length > 3 && (
                          <Badge variant="secondary" className="text-xs">+{sub.techStack.length - 3}</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" asChild>
                          <Link href={`/dashboard/submissions/${sub.id}`}>
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            View
                          </Link>
                        </Button>
                        {sub.status === "draft" && (
                          <Button variant="outline" size="sm" className="flex-1" asChild>
                            <Link href={`/dashboard/submissions/${sub.id}/edit`}>
                              <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                              Edit
                            </Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
