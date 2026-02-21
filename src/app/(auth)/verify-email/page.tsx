"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { VerificationCodeInput } from "@/components/dashboard/verification-code-input";
import { useAuthStore } from "@/store/auth-store";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const redirectUrl = searchParams.get("redirect") || "/dashboard";
  const { fetchUser } = useAuthStore();
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [verified, setVerified] = React.useState(false);

  const handleComplete = async (code: string) => {
    if (!email) {
      toast.error("Missing email. Please register again.");
      return;
    }

    setIsVerifying(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: code, type: "email" }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Verification failed");
      }

      // Session is now active — fetch user into store
      await fetchUser();
      setVerified(true);
      toast.success("Email verified successfully!");
      setTimeout(() => router.push(redirectUrl), 2000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Invalid code. Please try again.";
      if (message.includes("Token has expired")) {
        toast.error("Code expired. Please request a new one.");
      } else {
        toast.error(message);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error("Missing email. Please register again.");
      return;
    }

    setIsResending(true);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to resend");
      }

      toast.success("New verification code sent! Check your inbox.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to resend code"
      );
    } finally {
      setIsResending(false);
    }
  };

  if (verified) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6"
      >
        <div className="mx-auto h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h1 className="font-display text-3xl font-bold">Email Verified!</h1>
        <p className="text-muted-foreground">
          Your account is ready. Redirecting to dashboard...
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="text-center mb-8">
        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-display text-3xl font-bold mb-2">Verify your email</h1>
        <p className="text-muted-foreground">
          We sent a verification code to{" "}
          {email ? (
            <span className="font-medium text-foreground">{email}</span>
          ) : (
            "your email"
          )}
          . Enter it below to verify.
        </p>
      </div>

      <div className="space-y-6">
        <VerificationCodeInput length={8} onComplete={handleComplete} />

        {isVerifying && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying...
          </div>
        )}

        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Didn&apos;t receive a code?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="text-primary font-medium hover:underline disabled:opacity-50"
            >
              {isResending ? "Sending..." : "Resend code"}
            </button>
          </p>

          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Back to login</Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function VerifyEmailPage() {
  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <VerifyEmailContent />
    </React.Suspense>
  );
}
