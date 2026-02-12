"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy,
  ArrowLeft,
  Search,
  ArrowUpDown,
  ThumbsUp,
  Award,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { mockHackathons, mockSubmissions } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type SortOption = "votes" | "recent";

export default function HackathonSubmissionsPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;

  const hackathon = mockHackathons.find(
    (h) => h.id === hackathonId || h.slug === hackathonId
  );

  const [searchQuery, setSearchQuery] = React.useState("");
  const [trackFilter, setTrackFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState<SortOption>("votes");

  if (!hackathon) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16 text-center">
          <div className="mx-auto max-w-md">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h1 className="font-display text-3xl font-bold mb-2">
              Hackathon Not Found
            </h1>
            <p className="text-muted-foreground mb-6">
              The hackathon you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Button asChild>
              <Link href="/hackathons">Browse Hackathons</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const hackSubs = mockSubmissions.filter(
    (s) => s.hackathonId === hackathon.id
  );

  const filteredSubs = hackSubs
    .filter((sub) => {
      const matchesSearch =
        searchQuery === "" ||
        sub.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.team.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTrack =
        trackFilter === "all" || sub.track?.id === trackFilter;
      return matchesSearch && matchesTrack;
    })
    .sort((a, b) => {
      if (sortBy === "votes") return b.upvotes - a.upvotes;
      return (
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
    });

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    submitted: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    "under-review": "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    scored: "bg-green-500/10 text-green-600 border-green-500/20",
    winner: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link
              href={`/hackathons/${hackathonId}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {hackathon.name}
            </Link>
          </motion.div>

          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display text-4xl font-bold mb-2">
              Submissions
            </h1>
            <p className="text-muted-foreground text-lg">
              {hackSubs.length} project{hackSubs.length !== 1 ? "s" : ""}{" "}
              submitted to {hackathon.name}
            </p>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex flex-col sm:flex-row gap-3 mb-8"
          >
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
              className="h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Tracks</option>
              {hackathon.tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.name}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              size="default"
              onClick={() =>
                setSortBy((prev) => (prev === "votes" ? "recent" : "votes"))
              }
              className="gap-2"
            >
              <ArrowUpDown className="h-4 w-4" />
              {sortBy === "votes" ? "By Votes" : "By Recent"}
            </Button>
          </motion.div>

          {/* Submissions Grid */}
          {filteredSubs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Award className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-display text-lg font-bold mb-1">
                No submissions found
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || trackFilter !== "all"
                  ? "Try adjusting your filters."
                  : "Submissions will appear here once the hacking phase begins."}
              </p>
            </motion.div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSubs.map((sub, i) => (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={`/hackathons/${hackathonId}/submissions/${sub.id}`}
                  >
                    <Card className="h-full hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer">
                      <CardContent className="p-5">
                        {/* Status & Votes */}
                        <div className="flex items-center justify-between mb-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              statusColors[sub.status] || ""
                            )}
                          >
                            {sub.status === "winner" && (
                              <Trophy className="h-3 w-3 mr-1" />
                            )}
                            {sub.status.replace("-", " ")}
                          </Badge>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <ThumbsUp className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">
                              {sub.upvotes}
                            </span>
                          </div>
                        </div>

                        {/* Project Info */}
                        <h3 className="font-display text-lg font-bold mb-1">
                          {sub.projectName}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-1">
                          {sub.tagline}
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">
                          by {sub.team.name}
                        </p>

                        {/* Tech Stack */}
                        <div className="flex flex-wrap gap-1">
                          {sub.techStack.slice(0, 4).map((tech) => (
                            <Badge
                              key={tech}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tech}
                            </Badge>
                          ))}
                          {sub.techStack.length > 4 && (
                            <Badge variant="muted" className="text-xs">
                              +{sub.techStack.length - 4}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
