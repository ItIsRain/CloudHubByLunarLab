"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Gavel,
  Loader2,
  XCircle,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatDate } from "@/lib/utils";
import { useHackathon } from "@/hooks/use-hackathons";
import { useHackathonSubmissions } from "@/hooks/use-submissions";
import {
  useJudgeInvitation,
  useAcceptInvitation,
} from "@/hooks/use-judge-invitation";
import { toast } from "sonner";

type FilterType = "all" | "pending" | "reviewed";

function JudgingPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hackathonId = params.hackathonId as string;
  const token = searchParams.get("token");

  const { data: hackathonData, isLoading } = useHackathon(hackathonId);
  const hackathon = hackathonData?.data;
  const { data: submissionsData, isLoading: submissionsLoading } =
    useHackathonSubmissions(hackathonId);

  const {
    data: invitationData,
    isLoading: invitationLoading,
    error: invitationError,
  } = useJudgeInvitation(hackathonId, token);

  const acceptInvitation = useAcceptInvitation();

  const [filter, setFilter] = React.useState<FilterType>("all");
  const [search, setSearch] = React.useState("");
  const [accepted, setAccepted] = React.useState(false);

  const invitation = invitationData?.data;
  const showInvitationCard =
    token && invitation && invitation.status === "pending" && !accepted;

  const handleAccept = async () => {
    if (!token) return;
    try {
      await acceptInvitation.mutateAsync({ hackathonId, token });
      setAccepted(true);
      toast.success("Invitation accepted! Welcome aboard as a judge.");
      // Strip token from URL
      router.replace(`/judge/${hackathonId}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to accept invitation"
      );
    }
  };

  const handleDecline = () => {
    toast.info("Invitation declined.");
    router.push("/dashboard");
  };

  // Show invitation acceptance screen
  if (token && invitationLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        </main>
      </>
    );
  }

  if (token && invitationError) {
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
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="font-display text-2xl font-bold">
                Invalid Invitation
              </h1>
              <p className="text-muted-foreground mt-2 text-center max-w-md">
                This invitation link is invalid or has already been used. Please
                contact the hackathon organizer for a new invitation.
              </p>
              <Button asChild className="mt-6">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </motion.div>
          </div>
        </main>
      </>
    );
  }

  if (showInvitationCard) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="mx-auto max-w-lg px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Gavel className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="font-display text-2xl">
                    Judge Invitation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-center">
                  <div>
                    <p className="text-muted-foreground">
                      You&apos;ve been invited to judge
                    </p>
                    <p className="font-display text-xl font-bold text-foreground mt-1">
                      {invitation.hackathonName}
                    </p>
                  </div>

                  <div className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
                    <p>
                      As a judge, you&apos;ll evaluate project submissions and
                      provide scores and feedback to participants.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="gradient"
                      className="flex-1"
                      onClick={handleAccept}
                      disabled={acceptInvitation.isPending}
                    >
                      {acceptInvitation.isPending ? (
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
                      onClick={handleDecline}
                      disabled={acceptInvitation.isPending}
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

  // Already-accepted invitation that just arrived — redirect in effect to avoid setState during render
  React.useEffect(() => {
    if (token && invitation?.status === "accepted") {
      router.replace(`/judge/${hackathonId}`);
    }
  }, [token, invitation?.status, hackathonId, router]);

  // Normal judge page below
  if (isLoading || submissionsLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="shimmer rounded-xl h-96 w-full" />
          </div>
        </main>
      </>
    );
  }

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
              <h1 className="font-display text-2xl font-bold">
                Hackathon Not Found
              </h1>
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

  const rawSubmissions = submissionsData?.data || [];
  const submissions = rawSubmissions.map((sub) => ({
    ...sub,
    isReviewed: sub.scores && sub.scores.length > 0,
    mockScore:
      sub.averageScore != null ? sub.averageScore.toFixed(1) : null,
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
            <h1 className="font-display text-3xl font-bold">
              {hackathon.name}
            </h1>
            <p className="text-muted-foreground mt-1">Judging Submissions</p>
            <div className="mt-3 flex items-center gap-3">
              <Badge variant="secondary">
                {reviewed}/{total} reviewed
              </Badge>
              <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                  style={{
                    width: `${total > 0 ? (reviewed / total) * 100 : 0}%`,
                  }}
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
                          <p
                            className={cn(
                              "font-display font-bold text-lg",
                              sub.mockScore
                                ? "text-foreground"
                                : "text-muted-foreground"
                            )}
                          >
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
                        <Button
                          asChild
                          size="sm"
                          variant={sub.isReviewed ? "outline" : "default"}
                        >
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

export default function HackathonJudgingPage() {
  return (
    <React.Suspense
      fallback={
        <>
          <Navbar />
          <main className="min-h-screen bg-background pt-24 pb-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="shimmer rounded-xl h-96 w-full" />
            </div>
          </main>
        </>
      }
    >
      <JudgingPageContent />
    </React.Suspense>
  );
}
