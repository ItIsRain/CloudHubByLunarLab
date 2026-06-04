"use client";

import * as React from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { GraduationCap, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { useMentorInvitation, useAcceptMentorInvite } from "@/hooks/use-mentorship";

export default function MentorAcceptClient() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data, isLoading, error } = useMentorInvitation(hackathonId, token);
  const accept = useAcceptMentorInvite(hackathonId);

  const invitation = data?.data;

  async function handleAccept(action: "accept" | "decline") {
    if (!token) return;
    try {
      await accept.mutateAsync({ token, action });
      if (action === "accept") {
        toast.success("You're now a mentor!");
        router.push(`/hackathons/${hackathonId}/manage-mentorship`);
      } else {
        toast.success("Invitation declined.");
        router.push(`/hackathons/${hackathonId}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to respond to invitation.");
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-md px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                  <GraduationCap className="h-7 w-7 text-primary" />
                </div>

                {isLoading ? (
                  <div className="py-6">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : error || !invitation || !token ? (
                  <>
                    <h1 className="font-display text-xl font-bold mb-2">Invalid invitation</h1>
                    <p className="text-sm text-muted-foreground mb-6">
                      This mentor invitation is invalid or has expired.
                    </p>
                    <Button asChild variant="outline">
                      <Link href={`/hackathons/${hackathonId}`}>Go to competition</Link>
                    </Button>
                  </>
                ) : invitation.status === "accepted" ? (
                  <>
                    <h1 className="font-display text-xl font-bold mb-2">Already accepted</h1>
                    <p className="text-sm text-muted-foreground mb-6">
                      You&apos;re already a mentor for {invitation.hackathonName}.
                    </p>
                    <Button asChild>
                      <Link href={`/hackathons/${hackathonId}/manage-mentorship`}>
                        Manage Mentorship
                      </Link>
                    </Button>
                  </>
                ) : !isAuthenticated ? (
                  <>
                    <h1 className="font-display text-xl font-bold mb-2">
                      Mentor invitation
                    </h1>
                    <p className="text-sm text-muted-foreground mb-6">
                      You&apos;ve been invited to mentor at{" "}
                      <strong>{invitation.hackathonName}</strong>. Sign in with the invited
                      email to accept.
                    </p>
                    <Button asChild>
                      <Link
                        href={`/login?redirect=${encodeURIComponent(
                          `/hackathons/${hackathonId}/mentors/accept?token=${token}`
                        )}`}
                      >
                        Sign in to accept
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <h1 className="font-display text-xl font-bold mb-2">
                      Mentor at {invitation.hackathonName}
                    </h1>
                    <p className="text-sm text-muted-foreground mb-6">
                      Hi {invitation.name}, accept to set your availability and let participants
                      book sessions with you.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        variant="outline"
                        onClick={() => handleAccept("decline")}
                        disabled={accept.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                      <Button onClick={() => handleAccept("accept")} disabled={accept.isPending}>
                        {accept.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                        )}
                        Accept
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
