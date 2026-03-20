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
  Clock,
  Eye,
  FileText,
  Flag,
  Loader2,
  MessageSquare,
  SkipForward,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  AlertTriangle,
  User,
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
  RegistrationField,
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

// ── View modes ──────────────────────────────────────────
type ViewMode = "grid" | "judging";
type JudgingStep = "review" | "score";

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
      if (s.registration_id) m.set(s.registration_id, s);
    }
    return m;
  }, [existingScores]);

  // ── State ──
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [judgingStep, setJudgingStep] = React.useState<JudgingStep>("review");
  const [scores, setScores] = React.useState<Record<string, number>>({});
  const [feedbacks, setFeedbacks] = React.useState<Record<string, string>>({});
  const [overallFeedback, setOverallFeedback] = React.useState("");
  const [recommendation, setRecommendation] = React.useState<string | null>(
    null
  );
  const [flagged, setFlagged] = React.useState(false);
  const [showFeedback, setShowFeedback] = React.useState(false);
  const [timerSeconds, setTimerSeconds] = React.useState(0);
  const [timerRunning, setTimerRunning] = React.useState(false);

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
          setInvitationState("accepted");
          router.replace(
            `/judge/${hackathonId}/phases/${phaseId}/quick-score`
          );
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
      toast.error(
        err instanceof Error ? err.message : "Failed to accept invitation"
      );
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

  // ── Derived state ──
  const currentAssignment = assignments[selectedIndex] as
    | ReviewerAssignment
    | undefined;
  const currentRegId = currentAssignment?.registrationId;

  // Initialize scores from existing score when switching assignment
  React.useEffect(() => {
    if (!currentRegId || !phase || viewMode !== "judging") return;

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
    setJudgingStep("review");
    setTimerSeconds(0);
    setTimerRunning(true);
  }, [currentRegId, phase, scoreMap, viewMode]);

  // Timer
  React.useEffect(() => {
    if (!timerRunning || viewMode !== "judging") return;
    const interval = setInterval(() => {
      setTimerSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, viewMode]);

  const scoredCount = assignments.filter((a) =>
    scoreMap.has(a.registrationId)
  ).length;

  const allCriteriaScored =
    phase?.scoringCriteria?.every((c) => scores[c.id] !== undefined) ?? false;
  const canSubmit =
    allCriteriaScored &&
    (!phase?.requireRecommendation || recommendation !== null);

  // ── Handlers ──
  const handleSelectApplicant = (index: number) => {
    setSelectedIndex(index);
    setViewMode("judging");
  };

  const handleBackToGrid = () => {
    setViewMode("grid");
    setTimerRunning(false);
  };

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

      // Go back to grid after submission
      setViewMode("grid");
      setTimerRunning(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit score"
      );
    }
  }, [
    phase,
    currentRegId,
    canSubmit,
    scores,
    feedbacks,
    recommendation,
    overallFeedback,
    flagged,
    submitScore,
    hackathonId,
    phaseId,
  ]);

  // Keyboard shortcuts (only in judging mode)
  React.useEffect(() => {
    if (viewMode !== "judging") return;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "Escape") {
        e.preventDefault();
        handleBackToGrid();
      }
      if (e.key === "Enter" && !e.shiftKey && judgingStep === "score") {
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
  }, [viewMode, judgingStep, handleSubmitScore, phase?.requireRecommendation]);

  // ── Conditional returns (all hooks are above this line) ──────────

  // Invitation states
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
            <h1 className="font-display text-2xl font-bold">
              Invalid Invitation
            </h1>
            <p className="text-muted-foreground mt-2">
              This invitation link is invalid, expired, or has already been
              used.
            </p>
            <Button asChild className="mt-6">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </main>
      </>
    );
  }

  if (
    (invitationState === "pending" || invitationState === "accepting") &&
    invitationData
  ) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="mx-auto max-w-lg px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
                <CardContent className="p-8 text-center space-y-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Trophy className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h1 className="font-display text-2xl font-bold">
                      Reviewer Invitation
                    </h1>
                    <p className="text-muted-foreground mt-2">
                      You&apos;ve been invited to review
                    </p>
                    <p className="font-display text-xl font-bold text-foreground mt-1">
                      {invitationData.hackathonName}
                    </p>
                    <Badge variant="secondary" className="mt-2">
                      {invitationData.phaseName}
                    </Badge>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
                    As a reviewer, you&apos;ll evaluate applicant pitches using
                    structured scoring criteria and provide recommendations.
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="gradient"
                      className="flex-1"
                      onClick={handleAcceptInvitation}
                      disabled={invitationState === "accepting"}
                    >
                      {invitationState === "accepting" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Accepting...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Accept Invitation
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleDeclineInvitation}
                    >
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
            <h1 className="font-display text-2xl font-bold">
              Phase Not Found
            </h1>
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

  if (phase.status !== "scoring" && phase.status !== "active" && phase.status !== "completed") {
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

  // ── GRID VIEW: All assigned applicants ──
  if (viewMode === "grid") {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-20 pb-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6">
              <Link
                href={`/judge/${hackathonId}`}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>

              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {scoredCount}/{assignments.length} reviewed
                </Badge>
                <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                    style={{
                      width: `${
                        assignments.length > 0
                          ? (scoredCount / assignments.length) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Phase name */}
            <h1 className="font-display text-2xl font-bold mb-1">
              {phase.name}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              Select an applicant to review and score &middot;{" "}
              {phase.scoringCriteria.length} criteria
              {phase.isWeighted ? " (weighted)" : ""}
            </p>

            {/* Applicant grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignments.map((assignment, index) => {
                const isScored = scoreMap.has(assignment.registrationId);
                const applicant = assignment.registration?.applicant;
                const formData = (assignment.registration?.form_data ||
                  {}) as Record<string, unknown>;

                // Extract a summary from form_data for the card preview
                const fieldMap = phase.registrationFields
                  ? new Map(phase.registrationFields.map((f) => [f.id, f]))
                  : new Map<string, { label: string; order: number }>();
                const previewFields = getPreviewFields(formData, fieldMap);

                return (
                  <motion.div
                    key={assignment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card
                      className={cn(
                        "group cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
                        isScored && "border-green-500/20 bg-green-500/5"
                      )}
                      onClick={() => handleSelectApplicant(index)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                                {applicant?.name ||
                                  assignment.applicantName ||
                                  `Applicant ${index + 1}`}
                              </p>
                              {(applicant?.email || assignment.applicantEmail) && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {applicant?.email || assignment.applicantEmail}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant={isScored ? "success" : "outline"}
                            className="text-[10px] shrink-0"
                          >
                            {isScored ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-0.5" />
                                Scored
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 mr-0.5" />
                                Pending
                              </>
                            )}
                          </Badge>
                        </div>

                        {/* Preview of form data */}
                        {previewFields.length > 0 && (
                          <div className="space-y-1.5 mt-2">
                            {previewFields.slice(0, 3).map(([key, value, label]) => (
                              <div
                                key={key}
                                className="flex items-start gap-2 text-xs"
                              >
                                <span className="text-muted-foreground font-medium shrink-0 min-w-0 truncate max-w-[40%]">
                                  {label}:
                                </span>
                                <span className="text-foreground truncate">
                                  {String(value)}
                                </span>
                              </div>
                            ))}
                            {previewFields.length > 3 && (
                              <p className="text-[10px] text-muted-foreground">
                                +{previewFields.length - 3} more fields
                              </p>
                            )}
                          </div>
                        )}

                        {/* Score preview if already scored */}
                        {isScored && (
                          <div className="mt-3 pt-2 border-t border-border">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                Score
                              </span>
                              <span className="font-display text-sm font-bold text-green-500">
                                {scoreMap
                                  .get(assignment.registrationId)
                                  ?.total_score?.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* All done banner */}
            {scoredCount === assignments.length && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 text-center"
              >
                <div className="inline-flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 px-6 py-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-500">
                    All {assignments.length} applicants scored!
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </>
    );
  }

  // ── JUDGING VIEW: Two-page flow ──
  const applicantName =
    currentAssignment?.registration?.applicant?.name ||
    currentAssignment?.applicantName ||
    `Applicant ${selectedIndex + 1}`;
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
            <button
              onClick={handleBackToGrid}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to All Applicants
            </button>

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

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => setJudgingStep("review")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                judgingStep === "review"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              1. Review Application
            </button>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              onClick={() => setJudgingStep("score")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                judgingStep === "score"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <Trophy className="h-3.5 w-3.5" />
              2. Score
            </button>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentRegId}-${judgingStep}`}
              initial={{ opacity: 0, x: judgingStep === "score" ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: judgingStep === "score" ? -20 : 20 }}
              transition={{ duration: 0.15 }}
            >
              {judgingStep === "review" ? (
                /* ── PAGE 1: Application Review ── */
                <>
                  <Card className="mb-6">
                    <CardContent className="p-6 sm:p-8">
                      {/* Applicant header */}
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="font-display text-lg font-bold">
                            {applicantName}
                          </h2>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            <FileText className="inline h-3.5 w-3.5 mr-1" />
                            Application Data
                          </p>
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

                      {/* Form data display */}
                      <FormDataDisplay
                        registration={currentAssignment?.registration}
                        blindReview={phase.blindReview}
                        registrationFields={phase.registrationFields}
                      />
                    </CardContent>
                  </Card>

                  {/* Bottom action bar */}
                  <div className="flex items-center justify-between">
                    <Button variant="outline" onClick={handleBackToGrid}>
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      All Applicants
                    </Button>

                    <Button onClick={() => setJudgingStep("score")}>
                      Proceed to Scoring
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                /* ── PAGE 2: Scoring Interface ── */
                <>
                  <Card className="mb-6">
                    <CardContent className="p-6 sm:p-8">
                      {/* Applicant header */}
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="font-display text-lg font-bold">
                            {applicantName}
                          </h2>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            Scoring &middot; {phase.scoringCriteria.length}{" "}
                            criteria
                          </p>
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
                            variant="outline"
                            onClick={() => setJudgingStep("review")}
                            title="Back to review"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View Application
                          </Button>
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
                              onChange={(e) =>
                                setOverallFeedback(e.target.value)
                              }
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
                      onClick={() => setJudgingStep("review")}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Back to Review
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

                  {/* Keyboard shortcuts help */}
                  <div className="mt-6 text-center">
                    <p className="text-xs text-muted-foreground">
                      <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
                        Enter
                      </kbd>{" "}
                      submit &middot;{" "}
                      <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
                        Esc
                      </kbd>{" "}
                      back to grid &middot;{" "}
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
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}

// ── Form Data Display Component ──────────────────────────

function FormDataDisplay({
  registration,
  blindReview,
  registrationFields,
}: {
  registration?: ReviewerAssignment["registration"];
  blindReview: boolean;
  registrationFields?: RegistrationField[];
}) {
  if (!registration) {
    return (
      <div className="flex flex-col items-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm">No application data available.</p>
      </div>
    );
  }

  const formData = (registration.form_data || {}) as Record<string, unknown>;

  // Build a map of field ID -> field definition for proper labels
  const fieldMap = React.useMemo(() => {
    const map = new Map<string, RegistrationField>();
    for (const f of registrationFields || []) {
      map.set(f.id, f);
    }
    return map;
  }, [registrationFields]);

  // Filter out internal fields (starting with _) and empty values
  // Sort by field definition order if available
  const entries = Object.entries(formData)
    .filter(
      ([key, value]) =>
        !key.startsWith("_") &&
        value !== null &&
        value !== undefined &&
        value !== ""
    )
    .sort((a, b) => {
      const fieldA = fieldMap.get(a[0]);
      const fieldB = fieldMap.get(b[0]);
      if (fieldA && fieldB) return fieldA.order - fieldB.order;
      if (fieldA) return -1;
      if (fieldB) return 1;
      return 0;
    });

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm">No form data submitted.</p>
      </div>
    );
  }

  const applicant = registration.applicant;

  return (
    <div className="space-y-4">
      {/* Applicant identity card (hidden in blind review) */}
      {!blindReview && applicant && (
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">{applicant.name}</p>
            <p className="text-xs text-muted-foreground">{applicant.email}</p>
          </div>
        </div>
      )}

      {/* Form fields */}
      <div className="space-y-3">
        {entries.map(([key, value]) => {
          const fieldDef = fieldMap.get(key);
          return (
            <FormFieldDisplay
              key={key}
              fieldKey={key}
              value={value}
              fieldDef={fieldDef}
            />
          );
        })}
      </div>
    </div>
  );
}

function FormFieldDisplay({
  fieldKey,
  value,
  fieldDef,
}: {
  fieldKey: string;
  value: unknown;
  fieldDef?: RegistrationField;
}) {
  const displayLabel = fieldDef?.label || formatFieldLabel(fieldKey);
  const fieldType = fieldDef?.type;

  // Handle file uploads — detect by field type or by value shape
  if (fieldType === "file" || isFileValue(value)) {
    const fileObj = value as Record<string, unknown>;
    const url = fileObj.url as string | undefined;
    const filename =
      (fileObj.originalFilename as string) || (fileObj.publicId as string) || "File";
    const bytes = fileObj.bytes as number | undefined;

    return (
      <div className="rounded-lg border border-border p-3">
        <p className="text-xs font-medium text-muted-foreground mb-1.5">
          {displayLabel}
        </p>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <FileText className="h-4 w-4" />
            {filename}
            {bytes && (
              <span className="text-xs text-muted-foreground">
                ({formatFileSize(bytes)})
              </span>
            )}
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">File uploaded</p>
        )}
      </div>
    );
  }

  // Handle arrays (multi-select)
  if (Array.isArray(value)) {
    // Resolve option labels if available
    const optionMap = new Map<string, string>();
    for (const opt of fieldDef?.options || []) {
      optionMap.set(opt.value, opt.label);
    }

    return (
      <div className="rounded-lg border border-border p-3">
        <p className="text-xs font-medium text-muted-foreground mb-1.5">
          {displayLabel}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {value.map((item, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {optionMap.get(String(item)) || String(item)}
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  // Handle booleans and checkbox-like values
  if (typeof value === "boolean" || value === "true" || value === "false") {
    const boolVal = value === true || value === "true";
    return (
      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <p className="text-xs font-medium text-muted-foreground">
          {displayLabel}
        </p>
        <Badge variant={boolVal ? "success" : "outline"} className="text-xs">
          {boolVal ? "Yes" : "No"}
        </Badge>
      </div>
    );
  }

  // Handle select/radio — resolve option label
  if (
    typeof value === "string" &&
    fieldDef?.options &&
    fieldDef.options.length > 0
  ) {
    const opt = fieldDef.options.find((o) => o.value === value);
    const displayValue = opt?.label || value;

    return (
      <div className="rounded-lg border border-border p-3">
        <p className="text-xs font-medium text-muted-foreground mb-1">
          {displayLabel}
        </p>
        <p className="text-sm text-foreground">{displayValue}</p>
      </div>
    );
  }

  // Handle objects (nested data, but not files)
  if (typeof value === "object" && value !== null) {
    return (
      <div className="rounded-lg border border-border p-3">
        <p className="text-xs font-medium text-muted-foreground mb-1.5">
          {displayLabel}
        </p>
        <pre className="text-xs text-foreground whitespace-pre-wrap font-mono bg-muted/50 rounded p-2">
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    );
  }

  const strValue = String(value);
  const isLongText = strValue.length > 100;
  const isUrl =
    strValue.startsWith("http://") || strValue.startsWith("https://");

  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs font-medium text-muted-foreground mb-1">
        {displayLabel}
      </p>
      {isUrl ? (
        <a
          href={strValue}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline break-all"
        >
          {strValue}
        </a>
      ) : isLongText ? (
        <p className="text-sm text-foreground whitespace-pre-wrap">
          {strValue}
        </p>
      ) : (
        <p className="text-sm text-foreground">{strValue}</p>
      )}
    </div>
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
              value !== undefined
                ? getScoreColor(percentage)
                : "text-muted-foreground"
            )}
          >
            {value !== undefined ? value : "-"}
          </span>
          <span className="text-xs text-muted-foreground">/{max}</span>
        </div>
      </div>

      {/* Score buttons */}
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

/**
 * Convert a camelCase or snake_case field key to a human-readable label.
 * Fallback when no field definition is found.
 */
function formatFieldLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Check if a value looks like a Cloudinary file upload object.
 */
function isFileValue(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const obj = value as Record<string, unknown>;
  return !!(obj.url && obj.publicId);
}

/**
 * Format file size in bytes to human-readable string.
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Extract preview fields from form_data for the grid card.
 * Returns [key, displayValue, label] tuples.
 */
function getPreviewFields(
  formData: Record<string, unknown>,
  fieldMap: Map<string, { label: string; order: number }>
): [string, string, string][] {
  return Object.entries(formData)
    .filter(
      ([key, value]) =>
        !key.startsWith("_") &&
        value !== null &&
        value !== undefined &&
        value !== "" &&
        !isFileValue(value)
    )
    .sort((a, b) => {
      const fa = fieldMap.get(a[0]);
      const fb = fieldMap.get(b[0]);
      if (fa && fb) return fa.order - fb.order;
      if (fa) return -1;
      if (fb) return 1;
      return 0;
    })
    .map(([key, value]) => {
      const field = fieldMap.get(key);
      const label = field?.label || formatFieldLabel(key);
      const displayValue =
        typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
      return [key, displayValue, label] as [string, string, string];
    });
}
