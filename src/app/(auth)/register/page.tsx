"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Github, Mail, Loader2, Eye, EyeOff, Check, X, Gavel } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { UserRole } from "@/lib/types";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: z.string().min(1, "Please select a role"),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions",
  }),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const passwordRequirements = [
  { regex: /.{8,}/, label: "At least 8 characters" },
  { regex: /[A-Z]/, label: "One uppercase letter" },
  { regex: /[0-9]/, label: "One number" },
];

const roleOptions: { value: UserRole; label: string; description: string }[] = [
  {
    value: "attendee",
    label: "Attendee",
    description: "Join events and hackathons",
  },
  {
    value: "organizer",
    label: "Organizer",
    description: "Host events and hackathons",
  },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register: registerUser, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = React.useState(false);
  const [password, setPassword] = React.useState("");

  const redirectParam = searchParams.get("redirect") || "";
  const isJudgeInvite =
    redirectParam.includes("/judge/") && redirectParam.includes("token=");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "",
      acceptTerms: false,
    },
  });

  const selectedRole = watch("role");

  const selectRole = (role: string) => {
    setValue("role", role);
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const success = await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        roles: [data.role] as UserRole[],
      });
      if (success) {
        toast.success("Account created! Check your email for a verification code.");
        const verifyUrl = redirectParam
          ? `/verify-email?email=${encodeURIComponent(data.email)}&redirect=${encodeURIComponent(redirectParam)}`
          : `/verify-email?email=${encodeURIComponent(data.email)}`;
        router.push(verifyUrl);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      if (message.includes("User already registered")) {
        toast.error("An account with this email already exists");
      } else if (message.includes("Password")) {
        toast.error(message);
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
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectParam || "/onboarding")}`;
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
              Create an account to accept your judge invitation
            </p>
          </div>
        </div>
      )}

      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-bold mb-2">Create an account</h1>
        <p className="text-muted-foreground">
          Join our community of event organizers and participants
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

      {/* Register Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1.5">
            Full Name
          </label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
          )}
        </div>

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
          <label htmlFor="password" className="block text-sm font-medium mb-1.5">
            Password
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
              {...register("password", {
                onChange: (e) => setPassword(e.target.value),
              })}
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

          {/* Password Requirements */}
          {password && (
            <div className="mt-2 space-y-1">
              {passwordRequirements.map((req) => (
                <div
                  key={req.label}
                  className={cn(
                    "flex items-center gap-2 text-xs",
                    req.regex.test(password)
                      ? "text-success"
                      : "text-muted-foreground"
                  )}
                >
                  {req.regex.test(password) ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  {req.label}
                </div>
              ))}
            </div>
          )}
          {errors.password && (
            <p className="text-sm text-destructive mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            I want to...
          </label>
          <div className="grid grid-cols-2 gap-3">
            {roleOptions.map((role) => (
              <button
                key={role.value}
                type="button"
                onClick={() => selectRole(role.value)}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  selectedRole === role.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="font-medium mb-0.5">{role.label}</div>
                <div className="text-xs text-muted-foreground">
                  {role.description}
                </div>
              </button>
            ))}
          </div>
          {errors.role && (
            <p className="text-sm text-destructive mt-1">
              {errors.role.message}
            </p>
          )}
        </div>

        {/* Terms */}
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="acceptTerms"
            className="h-4 w-4 rounded border-input mt-0.5"
            {...register("acceptTerms")}
          />
          <label htmlFor="acceptTerms" className="text-sm text-muted-foreground">
            I agree to the{" "}
            <Link href="/legal/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/legal/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </label>
        </div>
        {errors.acceptTerms && (
          <p className="text-sm text-destructive">{errors.acceptTerms.message}</p>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      {/* Sign in link */}
      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account?{" "}
        <Link
          href={redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : "/login"}
          className="text-primary font-medium hover:underline"
        >
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}

export default function RegisterPage() {
  return (
    <React.Suspense fallback={null}>
      <RegisterForm />
    </React.Suspense>
  );
}
