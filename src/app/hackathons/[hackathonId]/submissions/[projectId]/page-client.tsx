"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy,
  ArrowLeft,
  ThumbsUp,
  Github,
  ExternalLink,
  Award,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSubmission } from "@/hooks/use-submissions";
import { cn, getInitials } from "@/lib/utils";

export default function ProjectDetailPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;
  const projectId = params.projectId as string;

  const { data: submissionData, isLoading } = useSubmission(projectId);
  const submission = submissionData?.data;

  const [upvoted, setUpvoted] = React.useState(false);
  const [upvoteCount, setUpvoteCount] = React.useState(0);

  React.useEffect(() => {
    if (submission) {
      setUpvoteCount(submission.upvotes);
    }
  }, [submission]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="shimmer rounded-xl h-6 w-40 mb-8" />
            <div className="shimmer rounded-xl h-10 w-72 mb-3" />
            <div className="shimmer rounded-xl h-6 w-96 mb-8" />
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="shimmer rounded-xl h-64 w-full" />
                <div className="shimmer rounded-xl h-32 w-full" />
              </div>
              <div className="space-y-6">
                <div className="shimmer rounded-xl h-48 w-full" />
                <div className="shimmer rounded-xl h-32 w-full" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16 text-center">
          <div className="mx-auto max-w-md">
            <Award className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h1 className="font-display text-3xl font-bold mb-2">
              Project Not Found
            </h1>
            <p className="text-muted-foreground mb-6">
              The project you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Button asChild>
              <Link href={`/hackathons/${hackathonId}/submissions`}>
                Back to Submissions
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handleUpvote = () => {
    setUpvoted((prev) => !prev);
    setUpvoteCount((prev) => (upvoted ? prev - 1 : prev + 1));
  };

  const statusColors: Record<string, string> = {
    draft: "bg-muted",
    submitted: "bg-blue-500 text-white",
    "under-review": "bg-yellow-500 text-white",
    scored: "bg-green-500 text-white",
    winner: "bg-amber-500 text-white",
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
              href={`/hackathons/${hackathonId}/submissions`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Submissions
            </Link>
          </motion.div>

          {/* Hero / Project Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <Badge
                    className={cn(
                      statusColors[submission.status] || "bg-muted"
                    )}
                  >
                    {submission.status === "winner" && (
                      <Trophy className="h-3 w-3 mr-1" />
                    )}
                    {submission.status.replace("-", " ")}
                  </Badge>
                  {submission.track && (
                    <Badge variant="outline">{submission.track.name}</Badge>
                  )}
                </div>
                <h1 className="font-display text-4xl font-bold mb-2">
                  {submission.projectName}
                </h1>
                <p className="text-lg text-muted-foreground">
                  {submission.tagline}
                </p>
              </div>

              {/* Upvote Button */}
              <Button
                variant={upvoted ? "default" : "outline"}
                size="lg"
                onClick={handleUpvote}
                className={cn(
                  "gap-2 min-w-[120px]",
                  upvoted && "bg-primary"
                )}
              >
                <ThumbsUp
                  className={cn("h-5 w-5", upvoted && "fill-current")}
                />
                <span className="font-bold">{upvoteCount}</span>
              </Button>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>About the Project</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {submission.description.split("\n").map((p, i) => {
                        if (p.startsWith("## "))
                          return (
                            <h3
                              key={i}
                              className="font-display text-lg font-bold mt-4 mb-2"
                            >
                              {p.replace("## ", "")}
                            </h3>
                          );
                        if (p.startsWith("- **")) {
                          const parts = p.replace("- **", "").split("**");
                          return (
                            <li key={i} className="ml-4">
                              <strong>{parts[0]}</strong>
                              {parts[1]}
                            </li>
                          );
                        }
                        if (p.trim()) return <p key={i}>{p}</p>;
                        return null;
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Tech Stack */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Tech Stack</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {submission.techStack.map((tech) => (
                        <Badge
                          key={tech}
                          variant="secondary"
                          className="text-sm px-3 py-1"
                        >
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Team Members */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Team</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar>
                        <AvatarImage src={submission.team.avatar} />
                        <AvatarFallback>
                          {submission.team.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{submission.team.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {submission.team.members.length} member
                          {submission.team.members.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {submission.team.members.map((member, i) => (
                        <motion.div
                          key={member.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + i * 0.05 }}
                          className="flex items-center gap-3"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.user.avatar} />
                            <AvatarFallback className="text-xs">
                              {getInitials(member.user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.user.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {member.role}
                              {member.isLeader && " (Lead)"}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Links */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Links</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {submission.githubUrl && (
                      <a
                        href={submission.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors"
                      >
                        <Github className="h-5 w-5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">GitHub Repository</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {submission.githubUrl}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    )}
                    {submission.demoUrl && (
                      <a
                        href={submission.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors"
                      >
                        <ExternalLink className="h-5 w-5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Live Demo</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {submission.demoUrl}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    )}
                    {!submission.githubUrl && !submission.demoUrl && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No links provided
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Score (if available) */}
              {submission.averageScore && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-sm text-muted-foreground mb-1">
                        Average Score
                      </p>
                      <p className="font-display text-4xl font-bold text-primary">
                        {submission.averageScore.toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        out of 10
                      </p>
                      {submission.rank && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm text-muted-foreground">
                            Rank: <span className="font-bold text-foreground">#{submission.rank}</span>
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
