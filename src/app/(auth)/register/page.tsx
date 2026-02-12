"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Github, Mail, Loader2, Eye, EyeOff, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
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

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = React.useState(false);
  const [password, setPassword] = React.useState("");

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
        toast.success("Account created successfully!");
        router.push("/onboarding");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  const handleSocialLogin = (provider: string) => {
    toast.info(`${provider} signup coming soon!`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-bold mb-2">Create an account</h1>
        <p className="text-muted-foreground">
          Join our community of event organizers and participants
        </p>
      </div>

      {/* Social Login Buttons */}
      <div className="space-y-3 mb-6">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleSocialLogin("Google")}
        >
          <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleSocialLogin("GitHub")}
        >
          <Github className="h-5 w-5 mr-2" />
          Continue with GitHub
        </Button>
      </div>

      {/* Divider */}
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
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}
