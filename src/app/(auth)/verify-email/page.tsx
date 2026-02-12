"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { VerificationCodeInput } from "@/components/dashboard/verification-code-input";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [verified, setVerified] = React.useState(false);

  const handleComplete = async (code: string) => {
    setIsVerifying(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsVerifying(false);

    if (code === "000000") {
      toast.error("Invalid code. Please try again.");
      return;
    }

    setVerified(true);
    toast.success("Email verified successfully!");
    setTimeout(() => router.push("/dashboard"), 2000);
  };

  const handleResend = async () => {
    setIsResending(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsResending(false);
    toast.success("Verification code resent!");
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
          We sent a 6-digit code to your email. Enter it below to verify.
        </p>
      </div>

      <div className="space-y-6">
        <VerificationCodeInput onComplete={handleComplete} />

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
