"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useValidateInvitation, useAcceptEntityInvitation } from "@/hooks/use-invitations";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const { user } = useAuthStore();

  const { data: invitation, isLoading, error } = useValidateInvitation(token);
  const acceptMutation = useAcceptEntityInvitation();

  const handleAccept = async () => {
    if (!token) return;
    try {
      const result = await acceptMutation.mutateAsync(token);
      const { entityType, entitySlug } = result.data;
      toast.success("Invitation accepted!");
      router.push(`/${entityType}s/${entitySlug}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept invitation.");
    }
  };

  const handleSignIn = () => {
    router.push(`/login?redirect=/invite/accept?token=${token}`);
  };

  if (!token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h1 className="font-display text-xl font-bold">Invalid Link</h1>
            <p className="text-sm text-muted-foreground">
              This invitation link is missing or malformed.
            </p>
            <Button onClick={() => router.push("/")} variant="outline">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h1 className="font-display text-xl font-bold">Invitation Not Found</h1>
            <p className="text-sm text-muted-foreground">
              This invitation may have expired or been revoked.
            </p>
            <Button onClick={() => router.push("/")} variant="outline">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation.status === "accepted") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <h1 className="font-display text-xl font-bold">Already Accepted</h1>
              <p className="text-sm text-muted-foreground">
                You've already accepted this invitation to{" "}
                <strong>{invitation.entityName}</strong>.
              </p>
              <Button
                onClick={() =>
                  router.push(`/${invitation.entityType}s/${invitation.entitySlug}`)
                }
              >
                Go to {invitation.entityType === "event" ? "Event" : "Hackathon"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-bold">
                You're Invited!
              </h1>
              <p className="text-muted-foreground">
                You've been invited to join
              </p>
              <p className="text-lg font-semibold text-primary">
                {invitation.entityName}
              </p>
            </div>

            <div className="w-full rounded-lg border p-4 text-left">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Invited as</p>
                <p className="text-sm font-medium">{invitation.name}</p>
                <p className="text-xs text-muted-foreground">{invitation.email}</p>
              </div>
            </div>

            {user ? (
              <Button
                onClick={handleAccept}
                disabled={acceptMutation.isPending}
                className="w-full gap-2"
                size="lg"
              >
                {acceptMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Accept Invitation
              </Button>
            ) : (
              <div className="w-full space-y-3">
                <p className="text-sm text-muted-foreground">
                  Sign in with your account to accept this invitation.
                </p>
                <Button onClick={handleSignIn} className="w-full" size="lg">
                  Sign In to Accept
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
