"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Github, Mail, Loader2, Eye, EyeOff, Gavel } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginForm />
    </React.Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = React.useState(false);

  const redirectParam = searchParams.get("redirect") || "";
  const isJudgeInvite =
    redirectParam.includes("/judge/") && redirectParam.includes("token=");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const success = await login(data.email, data.password);
      if (success) {
        toast.success("Welcome back!");
        const redirect = searchParams.get("redirect") || "/dashboard";
        router.push(redirect);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Invalid email or password";
      if (message.includes("Invalid login credentials")) {
        toast.error("Invalid email or password");
      } else if (message.includes("Email not confirmed")) {
        toast.error("Please verify your email before signing in");
      } else {
        toast.error(message);
      }
    }
  };

  const [oauthLoading, setOauthLoading] = React.useState(false);

  const handleGitHubLogin = async () => {
    try {
      setOauthLoading(true);
      const supabase = getSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectParam || "/dashboard")}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo },
      });
      if (error) {
        toast.error(error.message);
        setOauthLoading(false);
      }
    } catch {
      toast.error("Failed to connect to GitHub");
      setOauthLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {isJudgeInvite && (
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Gavel className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Judge Invitation</p>
            <p className="text-xs text-muted-foreground">
              Sign in to accept your judge invitation
            </p>
          </div>
        </div>
      )}

      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-bold mb-2">Welcome back</h1>
        <p className="text-muted-foreground">
          Sign in to your account to continue
        </p>
      </div>

      <div className="mb-6">
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGitHubLogin}
          disabled={oauthLoading}
        >
          {oauthLoading ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <Github className="h-5 w-5 mr-2" />
          )}
          Continue with GitHub
        </Button>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            or continue with email
          </span>
        </div>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1.5">
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            icon={<Mail className="h-4 w-4" />}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-destructive mt-1">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-destructive mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="rememberMe"
            className="h-4 w-4 rounded border-input"
            {...register("rememberMe")}
          />
          <label htmlFor="rememberMe" className="text-sm text-muted-foreground">
            Remember me for 30 days
          </label>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      {/* Sign up link */}
      <p className="text-center text-sm text-muted-foreground mt-6">
        Don&apos;t have an account?{" "}
        <Link
          href={redirectParam ? `/register?redirect=${encodeURIComponent(redirectParam)}` : "/register"}
          className="text-primary font-medium hover:underline"
        >
          Sign up
        </Link>
      </p>
    </motion.div>
  );
}
