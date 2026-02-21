"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Github,
  Globe,
  ExternalLink,
  Trophy,
  ThumbsUp,
  Edit,
  Share2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ShareDialog } from "@/components/dialogs/share-dialog";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { useSubmission } from "@/hooks/use-submissions";
import { useHackathons } from "@/hooks/use-hackathons";
import { useState } from "react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-500/10 text-blue-600",
  "under-review": "bg-warning/10 text-warning",
  scored: "bg-primary/10 text-primary",
  winner: "bg-success/10 text-success",
};

export default function SubmissionDetailPage() {
  const params = useParams();
  const submissionId = params.submissionId as string;
  const [showShare, setShowShare] = useState(false);
  const [upvoted, setUpvoted] = useState(false);
  const { data: hackathonsData } = useHackathons();
  const hackathons = hackathonsData?.data || [];
  const { data: submissionData, isLoading } = useSubmission(submissionId);

  const submission = submissionData?.data;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="h-4 w-48 rounded bg-muted shimmer" />
          <div className="h-64 w-full rounded-2xl bg-muted shimmer" />
          <div className="space-y-3">
            <div className="h-8 w-2/3 rounded bg-muted shimmer" />
            <div className="h-5 w-1/2 rounded bg-muted shimmer" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted shimmer" />
            ))}
          </div>
          <div className="h-48 rounded-xl bg-muted shimmer" />
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center py-20">
          <h1 className="font-display text-2xl font-bold">Submission not found</h1>
          <p className="text-muted-foreground mt-2">The submission you&apos;re looking for doesn&apos;t exist.</p>
          <Button asChild className="mt-6">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const hackathon = hackathons.find((h) => h.id === submission.hackathonId);

  const handleUpvote = () => {
    setUpvoted(!upvoted);
    toast.success(upvoted ? "Upvote removed" : "Upvoted!");
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <span>/</span>
            <span>Submissions</span>
            <span>/</span>
            <span className="text-foreground">{submission.projectName}</span>
          </div>

          {/* Hero */}
          <div className="space-y-4">
            {submission.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={submission.coverImage}
                alt={submission.projectName}
                className="w-full h-64 object-cover rounded-2xl"
              />
            )}

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-3xl font-bold">{submission.projectName}</h1>
                  <Badge className={cn(statusColors[submission.status], "capitalize")}>
                    {submission.status === "winner" && <Trophy className="h-3 w-3 mr-1" />}
                    {submission.status.replace("-", " ")}
                  </Badge>
                </div>
                <p className="text-lg text-muted-foreground">{submission.tagline}</p>
                {hackathon && (
                  <p className="text-sm text-muted-foreground">
                    Submitted to <span className="font-medium text-foreground">{hackathon.name}</span>
                    {" "}&middot; {submission.track.name}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant={upvoted ? "default" : "outline"}
                  onClick={handleUpvote}
                  className="gap-2"
                >
                  <ThumbsUp className={cn("h-4 w-4", upvoted && "fill-current")} />
                  {submission.upvotes + (upvoted ? 1 : 0)}
                </Button>
                <Button variant="outline" size="icon" onClick={() => setShowShare(true)}>
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <Link href={`/dashboard/submissions/${submissionId}/edit`}>
                    <Edit className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Score & rank */}
          {(submission.averageScore || submission.rank) && (
            <div className="grid gap-4 sm:grid-cols-3">
              {submission.rank && (
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Trophy className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">#{submission.rank}</p>
                      <p className="text-xs text-muted-foreground">Rank</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {submission.averageScore && (
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
                      <Star className="h-6 w-6 text-warning" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{submission.averageScore}/10</p>
                      <p className="text-xs text-muted-foreground">Avg Score</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                    <ThumbsUp className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{submission.upvotes}</p>
                    <p className="text-xs text-muted-foreground">Upvotes</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: submission.description }}
              />
            </CardContent>
          </Card>

          {/* Links */}
          <div className="flex flex-wrap gap-3">
            {submission.githubUrl && (
              <Button variant="outline" asChild className="gap-2">
                <a href={submission.githubUrl} target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4" />
                  GitHub Repository
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}
            {submission.demoUrl && (
              <Button variant="outline" asChild className="gap-2">
                <a href={submission.demoUrl} target="_blank" rel="noopener noreferrer">
                  <Globe className="h-4 w-4" />
                  Live Demo
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}
          </div>

          {/* Tech Stack */}
          {submission.techStack.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tech Stack</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {submission.techStack.map((tech) => (
                    <Badge key={tech} variant="secondary" className="text-sm py-1 px-3">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Team */}
          <Card>
            <CardHeader>
              <CardTitle>Team</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {submission.team.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.user.avatar} alt={member.user.name} />
                      <AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{member.user.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                    {member.isLeader && (
                      <Badge variant="outline" className="text-[10px]">Lead</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <p className="text-sm text-muted-foreground text-center">
            Submitted on {formatDate(submission.submittedAt)}
          </p>
        </motion.div>
      </div>

      <ShareDialog
        open={showShare}
        onOpenChange={setShowShare}
        title={submission.projectName}
        url={typeof window !== "undefined" ? window.location.href : ""}
      />
    </div>
  );
}
