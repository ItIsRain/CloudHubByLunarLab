"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Loader2,
  MessageSquare,
  SkipForward,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  usePhaseConfig,
  useMyPhaseAssignments,
  useMyPhaseScores,
  useSubmitPhaseScore,
} from "@/hooks/use-phase-scoring";
import type {
  CriteriaScore,
  ScoringCriteria,
  ReviewerAssignment,
  PhaseScore,
} from "@/hooks/use-phase-scoring";

export default function QuickScorePage() {
  return (
    <React.Suspense
      fallback={
        <>
          <Navbar />
          <main className="min-h-screen bg-background pt-24 pb-16">
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </main>
        </>
      }
    >
      <QuickScoreContent />
    </React.Suspense>
  );
}

function QuickScoreContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hackathonId = params.hackathonId as string;
  const phaseId = params.phaseId as string;
  const reviewerToken = searchParams.get("reviewerToken");

  // ── All hooks MUST be called before any conditional returns ──
  const { data: phaseData, isLoading: phaseLoading } = usePhaseConfig(
    hackathonId,
    phaseId
  );
  const { data: assignmentsData, isLoading: assignmentsLoading } =
    useMyPhaseAssignments(hackathonId, phaseId);
  const { data: scoresData, isLoading: scoresLoading } = useMyPhaseScores(
    hackathonId,
    phaseId
  );
  const submitScore = useSubmitPhaseScore();

  const phase = phaseData?.data;
  const assignments = assignmentsData?.data || [];
  const existingScores = scoresData?.data || [];

  // Build a map: registrationId -> existing score
  const scoreMap = React.useMemo(() => {
    const m = new Map<string, PhaseScore>();
    for (const s of existingScores) {
      m.set(s.registration_id, s);
    }
    return m;
  }, [existingScores]);

  // Current assignment index
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [scores, setScores] = React.useState<Record<string, number>>({});
  const [feedbacks, setFeedbacks] = React.useState<Record<string, string>>({});
  const [overallFeedback, setOverallFeedback] = React.useState("");
  const [recommendation, setRecommendation] = React.useState<string | null>(
    null
  );
  const [flagged, setFlagged] = React.useState(false);
  const [showFeedback, setShowFeedback] = React.useState(false);
  const [timerSeconds, setTimerSeconds] = React.useState(0);
  const [timerRunning, setTimerRunning] = React.useState(true);
  const [completed, setCompleted] = React.useState(false);

  // ── Invitation acceptance flow ──────────────────────────
  const [invitationState, setInvitationState] = React.useState<
    "idle" | "loading" | "pending" | "accepting" | "accepted" | "error"
  >(reviewerToken ? "loading" : "idle");
  const [invitationData, setInvitationData] = React.useState<{
    reviewerName: string;
    phaseName: string;
    hackathonName: string;
    status: string;
  } | null>(null);

  React.useEffect(() => {
    if (!reviewerToken) return;

    fetch(
      `/api/hackathons/${hackathonId}/phases/${phaseId}/reviewers/accept?token=${reviewerToken}`
    )
      .then((r) => r.json())
      .then((json) => {
        if (json.error) {
          setInvitationState("error");
        } else if (json.data.status === "accepted") {
          // Already accepted — go straight to scoring
          setInvitationState("accepted");
          router.replace(`/judge/${hackathonId}/phases/${phaseId}/quick-score`);
        } else if (json.data.status === "invited") {
          setInvitationData(json.data);
          setInvitationState("pending");
        } else {
          setInvitationState("error");
        }
      })
      .catch(() => setInvitationState("error"));
  }, [reviewerToken, hackathonId, phaseId, router]);

  const handleAcceptInvitation = async () => {
    if (!reviewerToken) return;
    setInvitationState("accepting");
    try {
      const res = await fetch(
        `/api/hackathons/${hackathonId}/phases/${phaseId}/reviewers/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: reviewerToken, action: "accept" }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to accept");
      toast.success("Invitation accepted! Welcome aboard as a reviewer.");
      setInvitationState("accepted");
      router.replace(`/judge/${hackathonId}/phases/${phaseId}/quick-score`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept invitation");
      setInvitationState("pending");
    }
  };

  const handleDeclineInvitation = async () => {
    if (!reviewerToken) return;
    try {
      await fetch(
        `/api/hackathons/${hackathonId}/phases/${phaseId}/reviewers/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: reviewerToken, action: "decline" }),
        }
      );
      toast.info("Invitation declined.");
      router.push("/dashboard");
    } catch {
      toast.error("Failed to decline invitation");
    }
  };

  // ── Derived state and effects (must be before conditional returns) ──

  const currentAssignment = assignments[currentIndex] as
    | ReviewerAssignment
    | undefined;
  const currentRegId = currentAssignment?.registration_id;

  // Initialize scores from existing score when switching assignment
  React.useEffect(() => {
    if (!currentRegId || !phase) return;

    const existing = scoreMap.get(currentRegId);
    if (existing) {
      const scoreObj: Record<string, number> = {};
      const feedbackObj: Record<string, string> = {};
      for (const cs of existing.criteria_scores) {
        scoreObj[cs.criteriaId] = cs.score;
        if (cs.feedback) feedbackObj[cs.criteriaId] = cs.feedback;
      }
      setScores(scoreObj);
      setFeedbacks(feedbackObj);
      setOverallFeedback(existing.overall_feedback || "");
      setRecommendation(existing.recommendation);
      setFlagged(existing.flagged);
    } else {
      setScores({});
      setFeedbacks({});
      setOverallFeedback("");
      setRecommendation(null);
      setFlagged(false);
    }
    setShowFeedback(false);
    setTimerSeconds(0);
    setTimerRunning(true);
  }, [currentRegId, phase, scoreMap]);

  // Timer
  React.useEffect(() => {
    if (!timerRunning || completed) return;
    const interval = setInterval(() => {
      setTimerSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, completed]);

  const scoredCount = assignments.filter((a) =>
    scoreMap.has(a.registration_id)
  ).length;

  const allCriteriaScored =
    phase?.scoringCriteria?.every((c) => scores[c.id] !== undefined) ?? false;
  const canSubmit =
    allCriteriaScored &&
    (!phase?.requireRecommendation || recommendation !== null);

  const handleNext = React.useCallback(() => {
    if (currentIndex < assignments.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, assignments.length]);

  const handlePrev = React.useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const handleScoreChange = (criteriaId: string, value: number) => {
    setScores((prev) => ({ ...prev, [criteriaId]: value }));
  };

  const handleSubmitScore = React.useCallback(async () => {
    if (!phase || !currentRegId || !canSubmit) return;

    const criteriaScores: CriteriaScore[] = phase.scoringCriteria.map((c) => ({
      criteriaId: c.id,
      score: scores[c.id] ?? 0,
      feedback: feedbacks[c.id] || undefined,
    }));

    try {
      await submitScore.mutateAsync({
        hackathonId,
        phaseId,
        registrationId: currentRegId,
        criteriaScores,
        recommendation: recommendation || undefined,
        overallFeedback: overallFeedback || undefined,
        flagged,
      });

      toast.success("Score submitted");

      const nextUnscored = assignments.findIndex(
        (a, i) => i > currentIndex && !scoreMap.has(a.registration_id)
      );
      if (nextUnscored >= 0) {
        setCurrentIndex(nextUnscored);
      } else if (scoredCount + 1 >= assignments.length) {
        setCompleted(true);
      } else {
        handleNext();
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit score"
      );
    }
  }, [phase, currentRegId, canSubmit, scores, feedbacks, recommendation, overallFeedback, flagged, submitScore, hackathonId, phaseId, assignments, currentIndex, scoreMap, scoredCount, handleNext]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "ArrowRight" || e.key === "n") {
        e.preventDefault();
        handleNext();
      }
      if (e.key === "ArrowLeft" || e.key === "p") {
        e.preventDefault();
        handlePrev();
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmitScore();
      }
      if (e.key === "f") {
        e.preventDefault();
        setFlagged((f) => !f);
      }
      if (e.key === "r" && phase?.requireRecommendation) {
        e.preventDefault();
        setRecommendation((r) =>
          r === "recommend" ? "do_not_recommend" : "recommend"
        );
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleNext, handlePrev, handleSubmitScore, phase?.requireRecommendation]);

  // ── Conditional returns (all hooks are above this line) ──────────

  // Show invitation acceptance UI if token present and invitation pending
  if (invitationState === "loading") {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </>
    );
  }

  if (invitationState === "error") {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="mx-auto max-w-lg px-4 text-center py-20">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold">Invalid Invitation</h1>
            <p className="text-muted-foreground mt-2">
              This invitation link is invalid, expired, or has already been used.
            </p>
            <Button asChild className="mt-6">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </main>
      </>
    );
  }

  if ((invitationState === "pending" || invitationState === "accepting") && invitationData) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="mx-auto max-w-lg px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
                <CardContent className="p-8 text-center space-y-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Trophy className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h1 className="font-display text-2xl font-bold">Reviewer Invitation</h1>
                    <p className="text-muted-foreground mt-2">You&apos;ve been invited to review</p>
                    <p className="font-display text-xl font-bold text-foreground mt-1">
                      {invitationData.hackathonName}
                    </p>
                    <Badge variant="secondary" className="mt-2">{invitationData.phaseName}</Badge>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
                    As a reviewer, you&apos;ll evaluate applicant pitches using structured scoring criteria
                    and provide recommendations.
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="gradient"
                      className="flex-1"
                      onClick={handleAcceptInvitation}
                      disabled={invitationState === "accepting"}
                    >
                      {invitationState === "accepting" ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Accepting...</>
                      ) : (
                        <><CheckCircle2 className="h-4 w-4 mr-2" />Accept Invitation</>
                      )}
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={handleDeclineInvitation}>
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
      </>
    );
  }

  // ── Normal scoring flow below ───────────────────────────

  // Loading
  if (phaseLoading || assignmentsLoading || scoresLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </>
    );
  }

  if (!phase) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="mx-auto max-w-2xl px-4 text-center py-20">
            <AlertTriangle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold">Phase Not Found</h1>
            <p className="text-muted-foreground mt-2">
              This scoring phase does not exist or you don&apos;t have access.
            </p>
            <Button asChild className="mt-6">
              <Link href="/judge">Back to Dashboard</Link>
            </Button>
          </div>
        </main>
      </>
    );
  }

  if (phase.status !== "scoring" && phase.status !== "active") {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="mx-auto max-w-2xl px-4 text-center py-20">
            <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold">
              Scoring Not Open
            </h1>
            <p className="text-muted-foreground mt-2">
              This phase is currently in &quot;{phase.status}&quot; status.
              Scoring is only available when the phase is active or in scoring
              mode.
            </p>
            <Button asChild className="mt-6">
              <Link href={`/judge/${hackathonId}`}>Back to Hackathon</Link>
            </Button>
          </div>
        </main>
      </>
    );
  }

  if (assignments.length === 0) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="mx-auto max-w-2xl px-4 text-center py-20">
            <Trophy className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold">
              No Assignments Yet
            </h1>
            <p className="text-muted-foreground mt-2">
              You haven&apos;t been assigned any applicants to review for this
              phase. The organizer will assign reviewers soon.
            </p>
            <Button asChild className="mt-6">
              <Link href={`/judge/${hackathonId}`}>Back to Hackathon</Link>
            </Button>
          </div>
        </main>
      </>
    );
  }

  // Completed all
  if (completed) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="mx-auto max-w-2xl px-4 text-center py-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="font-display text-3xl font-bold mb-3">
                All Done!
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                You&apos;ve scored all {assignments.length} assigned applicants
                for this phase.
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" asChild>
                  <Link href={`/judge/${hackathonId}`}>
                    Back to Hackathon
                  </Link>
                </Button>
                <Button
                  onClick={() => {
                    setCompleted(false);
                    setCurrentIndex(0);
                  }}
                >
                  Review Scores
                </Button>
              </div>
            </motion.div>
          </div>
        </main>
      </>
    );
  }

  const applicantName =
    currentAssignment?.registration?.applicant?.name || `Applicant ${currentIndex + 1}`;
  const isAlreadyScored = currentRegId
    ? scoreMap.has(currentRegId)
    : false;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-20 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <Link
              href={`/judge/${hackathonId}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>

            <div className="flex items-center gap-4">
              {/* Timer */}
              <div className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {formatTimer(timerSeconds)}
              </div>

              {/* Progress */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {scoredCount}/{assignments.length}
                </span>
                <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${
                        assignments.length > 0
                          ? (scoredCount / assignments.length) * 100
                          : 0
                      }%`,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Phase name */}
          <h1 className="font-display text-xl font-bold mb-1">{phase.name}</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Quick Score — {phase.scoringCriteria.length} criteria
            {phase.isWeighted ? " (weighted)" : ""}
          </p>

          {/* Navigation strip */}
          <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
            {assignments.map((a, i) => {
              const isScored = scoreMap.has(a.registration_id);
              const isCurrent = i === currentIndex;
              return (
                <button
                  key={a.id}
                  onClick={() => setCurrentIndex(i)}
                  className={cn(
                    "flex-shrink-0 h-8 w-8 rounded-lg text-xs font-bold transition-all",
                    isCurrent
                      ? "bg-primary text-primary-foreground scale-110 shadow-md"
                      : isScored
                        ? "bg-green-500/15 text-green-500 hover:bg-green-500/25"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {isScored && !isCurrent ? (
                    <CheckCircle2 className="h-3.5 w-3.5 mx-auto" />
                  ) : (
                    i + 1
                  )}
                </button>
              );
            })}
          </div>

          {/* Scorecard */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentRegId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
            >
              <Card className="mb-6">
                <CardContent className="p-6 sm:p-8">
                  {/* Applicant header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="font-display text-lg font-bold">
                        {phase.blindReview
                          ? `Applicant #${currentIndex + 1}`
                          : applicantName}
                      </h2>
                      {isAlreadyScored && (
                        <Badge
                          variant="outline"
                          className="text-green-500 border-green-500/30 mt-1"
                        >
                          Previously scored
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={flagged ? "destructive" : "outline"}
                        onClick={() => setFlagged(!flagged)}
                        title="Flag for review (F)"
                      >
                        <Flag className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Criteria sliders */}
                  <div className="space-y-6">
                    {phase.scoringCriteria.map((criteria) => (
                      <CriteriaSlider
                        key={criteria.id}
                        criteria={criteria}
                        value={scores[criteria.id]}
                        onChange={(v) => handleScoreChange(criteria.id, v)}
                        feedback={feedbacks[criteria.id] || ""}
                        onFeedbackChange={(v) =>
                          setFeedbacks((prev) => ({
                            ...prev,
                            [criteria.id]: v,
                          }))
                        }
                        showFeedback={showFeedback}
                      />
                    ))}
                  </div>

                  {/* Recommendation toggle */}
                  {phase.requireRecommendation && (
                    <div className="mt-6 pt-6 border-t border-border">
                      <p className="text-sm font-medium mb-3">
                        Recommendation
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setRecommendation("recommend")}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-medium transition-all border-2",
                            recommendation === "recommend"
                              ? "border-green-500 bg-green-500/10 text-green-500"
                              : "border-border hover:border-green-500/50 text-muted-foreground"
                          )}
                        >
                          <ThumbsUp className="h-4 w-4" />
                          Recommend
                        </button>
                        <button
                          onClick={() =>
                            setRecommendation("do_not_recommend")
                          }
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-medium transition-all border-2",
                            recommendation === "do_not_recommend"
                              ? "border-red-500 bg-red-500/10 text-red-500"
                              : "border-border hover:border-red-500/50 text-muted-foreground"
                          )}
                        >
                          <ThumbsDown className="h-4 w-4" />
                          Do Not Recommend
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Overall feedback (collapsible) */}
                  <div className="mt-6 pt-6 border-t border-border">
                    <button
                      onClick={() => setShowFeedback(!showFeedback)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MessageSquare className="h-4 w-4" />
                      {showFeedback
                        ? "Hide feedback fields"
                        : "Add feedback (optional)"}
                    </button>

                    {showFeedback && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-3"
                      >
                        <textarea
                          value={overallFeedback}
                          onChange={(e) => setOverallFeedback(e.target.value)}
                          placeholder="Overall feedback for this applicant..."
                          rows={3}
                          maxLength={5000}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y min-h-[80px]"
                        />
                      </motion.div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Bottom action bar */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleNext}
                    disabled={currentIndex >= assignments.length - 1}
                    title="Skip (N or Arrow Right)"
                  >
                    <SkipForward className="mr-1 h-4 w-4" />
                    Skip
                  </Button>

                  <Button
                    onClick={handleSubmitScore}
                    disabled={!canSubmit || submitScore.isPending}
                    title="Submit (Enter)"
                  >
                    {submitScore.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    {isAlreadyScored ? "Update Score" : "Submit Score"}
                  </Button>
                </div>

                <Button
                  variant="outline"
                  onClick={handleNext}
                  disabled={currentIndex >= assignments.length - 1}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>

              {/* Keyboard shortcuts help */}
              <div className="mt-6 text-center">
                <p className="text-xs text-muted-foreground">
                  Keyboard:{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
                    Enter
                  </kbd>{" "}
                  submit &middot;{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
                    &larr; &rarr;
                  </kbd>{" "}
                  navigate &middot;{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
                    F
                  </kbd>{" "}
                  flag
                  {phase.requireRecommendation && (
                    <>
                      {" "}
                      &middot;{" "}
                      <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
                        R
                      </kbd>{" "}
                      recommend
                    </>
                  )}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}

// ── Criteria Slider Component ───────────────────────────

function CriteriaSlider({
  criteria,
  value,
  onChange,
  feedback,
  onFeedbackChange,
  showFeedback,
}: {
  criteria: ScoringCriteria;
  value: number | undefined;
  onChange: (value: number) => void;
  feedback: string;
  onFeedbackChange: (value: string) => void;
  showFeedback: boolean;
}) {
  const max = criteria.maxScore;
  const scoreValue = value ?? 0;
  const percentage = max > 0 ? (scoreValue / max) * 100 : 0;

  // Generate score buttons (0 to max)
  const scoreButtons = Array.from({ length: max + 1 }, (_, i) => i);

  const getScoreColor = (pct: number) => {
    if (pct >= 70) return "text-green-500";
    if (pct >= 40) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{criteria.name}</p>
          {criteria.description && (
            <p className="text-xs text-muted-foreground truncate">
              {criteria.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          {criteria.weight > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {criteria.weight}%
            </Badge>
          )}
          <span
            className={cn(
              "font-display text-lg font-bold tabular-nums min-w-[3ch] text-right",
              value !== undefined ? getScoreColor(percentage) : "text-muted-foreground"
            )}
          >
            {value !== undefined ? value : "-"}
          </span>
          <span className="text-xs text-muted-foreground">/{max}</span>
        </div>
      </div>

      {/* Score buttons — large, touchable */}
      <div className="flex gap-1.5">
        {scoreButtons.map((s) => {
          const isSelected = value === s;
          const btnPct = max > 0 ? (s / max) * 100 : 0;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className={cn(
                "flex-1 h-11 rounded-lg text-sm font-bold transition-all",
                "hover:scale-105 active:scale-95",
                isSelected
                  ? btnPct >= 70
                    ? "bg-green-500 text-white shadow-lg shadow-green-500/25"
                    : btnPct >= 40
                      ? "bg-amber-500 text-white shadow-lg shadow-amber-500/25"
                      : "bg-red-500 text-white shadow-lg shadow-red-500/25"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              )}
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* Slider (for fine-grained scores with high maxScore) */}
      {max > 10 && (
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={scoreValue}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full mt-2 accent-primary h-2"
        />
      )}

      {/* Per-criteria feedback */}
      {showFeedback && (
        <input
          type="text"
          value={feedback}
          onChange={(e) => onFeedbackChange(e.target.value)}
          placeholder={`Feedback for ${criteria.name}...`}
          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
