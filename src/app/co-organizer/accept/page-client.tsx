"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Shield,
  Check,
  X,
  Loader2,
  ArrowRight,
  LogIn,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";
import { fetchJson } from "@/lib/fetch-json";
import { toast } from "sonner";

interface InvitationSummary {
  id: string;
  role: string;
  alreadyAccepted: boolean;
  hackathonId: string;
  hackathonName: string;
  hackathonSlug: string | null;
  inviterName: string | null;
}

export default function CoOrganizerAcceptClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hackathonId = searchParams.get("hackathonId");
  const token = searchParams.get("token");
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);

  const [invite, setInvite] = React.useState<InvitationSummary | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [accepting, setAccepting] = React.useState(false);

  React.useEffect(() => {
    if (!hackathonId || !token) {
      setLoadError("Missing invitation parameters.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await fetchJson<{ data: InvitationSummary }>(
          `/api/hackathons/${hackathonId}/collaborators/accept?token=${encodeURIComponent(token)}`
        );
        if (cancelled) return;
        setInvite(result.data);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : "Invitation not found"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hackathonId, token]);

  const handleAccept = async () => {
    if (!hackathonId || !token) return;
    if (!isAuthenticated) {
      const next = `/co-organizer/accept?hackathonId=${hackathonId}&token=${token}`;
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    setAccepting(true);
    try {
      const res = await fetch(
        `/api/hackathons/${hackathonId}/collaborators/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to accept invitation");
      }
      toast.success("Invitation accepted — welcome to the team!");
      router.push(`/dashboard/hackathons/${hackathonId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept");
      setAccepting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16 grid place-items-center px-4">
          <Card className="w-full max-w-md">
            <CardContent className="py-16 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                Looking up your invitation…
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (loadError || !invite) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16 grid place-items-center px-4">
          <Card className="w-full max-w-md">
            <CardContent className="py-12 text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <X className="h-7 w-7 text-destructive" />
              </div>
              <h1 className="font-display text-xl font-bold">
                Invitation unavailable
              </h1>
              <p className="text-sm text-muted-foreground">
                {loadError ||
                  "This invitation link is invalid or has been revoked."}
              </p>
              <Button asChild variant="outline">
                <Link href="/">Back to home</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-16 grid place-items-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card>
            <CardContent className="py-10 px-6 sm:px-8 text-center space-y-5">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-1">
                <h1 className="font-display text-2xl font-bold">
                  Co-organizer invitation
                </h1>
                <p className="text-sm text-muted-foreground">
                  {invite.inviterName
                    ? `${invite.inviterName} invited you to help administrate`
                    : "You've been invited to help administrate"}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Competition
                </p>
                <p className="font-semibold">{invite.hackathonName}</p>
                <Badge variant="muted" className="mt-2 capitalize">
                  Role: {invite.role}
                </Badge>
              </div>

              {invite.alreadyAccepted ? (
                <div className="space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Check className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="text-sm">
                    You&apos;ve already accepted this invitation.
                  </p>
                  <Button asChild className="w-full">
                    <Link href={`/dashboard/hackathons/${invite.hackathonId}`}>
                      Open dashboard
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              ) : !isAuthenticated ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Sign in to the account this invitation was sent to, then
                    accept here.
                  </p>
                  <Button onClick={handleAccept} className="w-full">
                    <LogIn className="h-4 w-4 mr-1" />
                    Sign in to accept
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="w-full"
                >
                  {accepting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Accepting…
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Accept invitation
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
