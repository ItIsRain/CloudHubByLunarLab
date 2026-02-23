"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Github,
  Flag,
  Send,
  Gavel,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHackathon } from "@/hooks/use-hackathons";
import { useSubmission, useHackathonSubmissions, useSubmitScore } from "@/hooks/use-submissions";
import { useHackathonPhase } from "@/hooks/use-hackathon-phase";

const defaultCriteria = [
  {
    id: "innovation",
    name: "Innovation",
    description: "How novel and creative is the solution?",
    weight: 25,
    maxScore: 10,
  },
  {
    id: "technical",
    name: "Technical Excellence",
    description: "Quality of code, architecture, and implementation.",
    weight: 25,
    maxScore: 10,
  },
  {
    id: "design",
    name: "Design & UX",
    description: "User interface and overall user experience.",
    weight: 25,
    maxScore: 10,
  },
  {
    id: "impact",
    name: "Impact",
    description: "How well does it solve the problem? Is it useful?",
    weight: 25,
    maxScore: 10,
  },
];

export default function ScoringPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;
  const submissionId = params.submissionId as string;

  const { data: hackathonData, isLoading } = useHackathon(hackathonId);
  const hackathon = hackathonData?.data;
  const { data: submissionData, isLoading: submissionLoading } = useSubmission(submissionId);
  const phase = useHackathonPhase(hackathon);
  const submission = submissionData?.data;
  const { data: allSubmissionsData, isLoading: allSubsLoading } = useHackathonSubmissions(hackathonId);
  const allSubmissions = allSubmissionsData?.data || [];
  const currentIndex = allSubmissions.findIndex((s) => s.id === submissionId);
  const prevSub = currentIndex > 0 ? allSubmissions[currentIndex - 1] : null;
  const nextSub =
    currentIndex < allSubmissions.length - 1
      ? allSubmissions[currentIndex + 1]
      : null;
  const submitScoreMutation = useSubmitScore();

  const scoringCriteria = React.useMemo(() => {
    if (hackathon?.judgingCriteria && hackathon.judgingCriteria.length > 0) {
      return hackathon.judgingCriteria;
    }
    return defaultCriteria;
  }, [hackathon]);

  const [scores, setScores] = React.useState<Record<string, number>>({});
  const [feedback, setFeedback] = React.useState<Record<string, string>>({});
  const [overallComments, setOverallComments] = React.useState("");
  const [flagged, setFlagged] = React.useState(false);

  // Initialize scores/feedback when criteria load
  React.useEffect(() => {
    setScores((prev) => {
      const next: Record<string, number> = {};
      for (const c of scoringCriteria) {
        next[c.id] = prev[c.id] ?? Math.round((c.maxScore || 10) * 0.7);
      }
      return next;
    });
    setFeedback((prev) => {
      const next: Record<string, string> = {};
      for (const c of scoringCriteria) {
        next[c.id] = prev[c.id] ?? "";
      }
      return next;
    });
  }, [scoringCriteria]);

  if (isLoading || submissionLoading || allSubsLoading) return <><Navbar /><main className="min-h-screen bg-background pt-24 pb-16"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="shimmer rounded-xl h-96 w-full" /></div></main></>;

  if (!submission || !hackathon) {
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
              <h1 className="font-display text-2xl font-bold">
                Submission Not Found
              </h1>
              <p className="text-muted-foreground mt-2">
                The submission you are looking for does not exist.
              </p>
              <Button asChild className="mt-6">
                <Link href={`/judge/${hackathonId}`}>Back to Submissions</Link>
              </Button>
            </motion.div>
          </div>
        </main>
      </>
    );
  }

  const handleSubmitScore = async () => {
    try {
      const criteria = scoringCriteria.map((c) => ({
        criteriaId: c.id,
        score: scores[c.id] ?? 0,
        maxScore: c.maxScore || 10,
        weight: c.weight,
        feedback: feedback[c.id] || undefined,
      }));
      // Weighted average normalized to 0-100
      const totalWeight = scoringCriteria.reduce((s, c) => s + (c.weight || 1), 0);
      const weightedSum = scoringCriteria.reduce((s, c) => {
        const score = scores[c.id] ?? 0;
        const max = c.maxScore || 10;
        return s + (score / max) * (c.weight || 1);
      }, 0);
      const totalScoreNum = parseFloat(((weightedSum / totalWeight) * 100).toFixed(1));

      await submitScoreMutation.mutateAsync({
        submissionId,
        criteria,
        totalScore: totalScoreNum,
        overallFeedback: overallComments || undefined,
        flagged,
      });
      toast.success("Score submitted successfully!", {
        description: `Your review for "${submission.projectName}" has been saved.`,
      });
    } catch (error) {
      toast.error("Failed to submit score", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  // Weighted average for display (0-10 scale)
  const totalWeight = scoringCriteria.reduce((s, c) => s + (c.weight || 1), 0);
  const weightedAvg = scoringCriteria.reduce((s, c) => {
    const score = scores[c.id] ?? 0;
    const max = c.maxScore || 10;
    return s + (score / max) * (c.weight || 1) * 10;
  }, 0) / totalWeight;
  const totalScore = weightedAvg.toFixed(1);

  const reviewedCount = allSubmissions.filter((s) => s.scores && s.scores.length > 0).length;
  const totalForReview = allSubmissions.length;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back Link & Progress */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between mb-6"
          >
            <Link
              href={`/judge/${hackathonId}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Submissions
            </Link>
            <Badge variant="secondary">
              {reviewedCount} of {totalForReview} reviewed
            </Badge>
          </motion.div>

          {/* Split Layout */}
          <div className="grid gap-8 lg:grid-cols-5">
            {/* Left: Submission Details (60%) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="lg:col-span-3 space-y-6"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="font-display text-2xl">
                        {submission.projectName}
                      </CardTitle>
                      <p className="text-muted-foreground mt-1">
                        {submission.tagline}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        by {submission.team.name}
                      </p>
                    </div>
                    <Badge variant="outline">{submission.track.name}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Description */}
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {submission.description}
                    </p>
                  </div>

                  {/* Tech Stack */}
                  <div>
                    <h3 className="font-semibold mb-2">Tech Stack</h3>
                    <div className="flex flex-wrap gap-2">
                      {submission.techStack.map((tech) => (
                        <Badge key={tech} variant="secondary">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Links */}
                  <div className="flex gap-3">
                    {submission.demoUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={submission.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-1.5 h-4 w-4" />
                          Live Demo
                        </a>
                      </Button>
                    )}
                    {submission.githubUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={submission.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Github className="mr-1.5 h-4 w-4" />
                          GitHub
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Right: Scoring Form (40%) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2 space-y-6"
            >
              {!phase.canJudge && (
                <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground mb-6">
                  {phase.getMessage("judge")}
                </div>
              )}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Gavel className="h-5 w-5 text-primary" />
                      Score Submission
                    </CardTitle>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Average</p>
                      <p className="font-display text-2xl font-bold text-primary">
                        {totalScore}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Criteria Sliders */}
                  {scoringCriteria.map((criteria) => {
                    const maxScore = criteria.maxScore || 10;
                    const midScore = Math.round(maxScore / 2);
                    return (
                      <div key={criteria.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="font-medium text-sm">
                              {criteria.name}
                            </label>
                            <p className="text-xs text-muted-foreground">
                              {criteria.description}
                            </p>
                            {criteria.weight && (
                              <p className="text-xs text-muted-foreground/70">Weight: {criteria.weight}%</p>
                            )}
                          </div>
                          <span className="font-display text-xl font-bold min-w-[2ch] text-right">
                            {scores[criteria.id] ?? 0}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={maxScore}
                          step={1}
                          value={scores[criteria.id] ?? 0}
                          onChange={(e) =>
                            setScores((prev) => ({
                              ...prev,
                              [criteria.id]: parseInt(e.target.value),
                            }))
                          }
                          className="w-full h-2 rounded-full appearance-none bg-muted cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>0</span>
                          <span>{midScore}</span>
                          <span>{maxScore}</span>
                        </div>
                        <textarea
                          placeholder={`Feedback on ${criteria.name.toLowerCase()}...`}
                          value={feedback[criteria.id] ?? ""}
                          onChange={(e) =>
                            setFeedback((prev) => ({
                              ...prev,
                              [criteria.id]: e.target.value,
                            }))
                          }
                          rows={2}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                      </div>
                    );
                  })}

                  {/* Overall Comments */}
                  <div className="space-y-2">
                    <label className="font-medium text-sm">
                      Overall Comments
                    </label>
                    <textarea
                      placeholder="Share your overall thoughts about this submission..."
                      value={overallComments}
                      onChange={(e) => setOverallComments(e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                  </div>

                  {/* Flag for Review */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={flagged}
                      onChange={(e) => setFlagged(e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    <Flag className={cn("h-4 w-4", flagged ? "text-destructive" : "text-muted-foreground")} />
                    <span className="text-sm">Flag for Review</span>
                  </label>

                  {/* Submit */}
                  <Button
                    onClick={handleSubmitScore}
                    className="w-full"
                    size="lg"
                    disabled={submitScoreMutation.isPending || !phase.canJudge}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {submitScoreMutation.isPending ? "Submitting..." : !phase.canJudge ? "Judging Closed" : "Submit Score"}
                  </Button>
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex gap-3">
                {prevSub ? (
                  <Button variant="outline" asChild className="flex-1">
                    <Link href={`/judge/${hackathonId}/${prevSub.id}`}>
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" disabled className="flex-1">
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>
                )}
                {nextSub ? (
                  <Button variant="outline" asChild className="flex-1">
                    <Link href={`/judge/${hackathonId}/${nextSub.id}`}>
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" disabled className="flex-1">
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </>
  );
}
