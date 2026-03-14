"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, CheckCircle2, Send, Save, Loader2, AlertTriangle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DynamicFormRenderer } from "@/components/forms/dynamic-form-renderer";
import { useCompetitionForm, useSubmitApplication } from "@/hooks/use-competitions";
import { useAuthStore } from "@/store/auth-store";
import { cn, formatDate } from "@/lib/utils";

export default function ApplyPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const { data: formData, isLoading, error } = useCompetitionForm(slug);
  const form = formData?.data;
  const submitMutation = useSubmitApplication();

  const [values, setValues] = React.useState<Record<string, unknown>>({});
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const [submitted, setSubmitted] = React.useState(false);

  // Pre-fill from user profile
  React.useEffect(() => {
    if (user && form) {
      const prefill: Record<string, unknown> = {};
      for (const field of form.fields) {
        if (field.mappingKey === "applicant_name" && user.name) {
          prefill[field.id] = user.name;
        }
        if (field.mappingKey === "applicant_email" && user.email) {
          prefill[field.id] = user.email;
        }
      }
      if (Object.keys(prefill).length > 0) {
        setValues((prev) => ({ ...prefill, ...prev }));
      }
    }
  }, [user, form]);

  const handleChange = (fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    // Clear error on change
    if (formErrors[fieldId]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    if (!form) return false;
    const errors: Record<string, string> = {};

    for (const field of form.fields) {
      if (field.type === "heading" || field.type === "paragraph") continue;

      const val = values[field.id];
      if (field.required) {
        if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
          errors[field.id] = `${field.label} is required`;
          continue;
        }
      }

      if (val && field.validation) {
        const v = field.validation;
        if (v.minLength && typeof val === "string" && val.length < v.minLength) {
          errors[field.id] = `Minimum ${v.minLength} characters`;
        }
        if (v.maxLength && typeof val === "string" && val.length > v.maxLength) {
          errors[field.id] = `Maximum ${v.maxLength} characters`;
        }
        if (v.pattern) {
          try {
            if (!new RegExp(v.pattern).test(String(val))) {
              errors[field.id] = v.patternMessage || "Invalid format";
            }
          } catch { /* invalid regex, skip */ }
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (isDraft = false) => {
    if (!form) return;
    if (!isDraft && !validate()) return;

    if (!user) {
      router.push(`/login?redirect=/apply/${slug}`);
      return;
    }

    try {
      await submitMutation.mutateAsync({
        formId: form.id,
        data: values,
        status: isDraft ? "draft" : "submitted",
        applicantName: values[form.fields.find((f) => f.mappingKey === "applicant_name")?.id || ""] || user.name,
        applicantEmail: values[form.fields.find((f) => f.mappingKey === "applicant_email")?.id || ""] || user.email,
        applicantPhone: values[form.fields.find((f) => f.mappingKey === "applicant_phone")?.id || ""],
        startupName: values[form.fields.find((f) => f.mappingKey === "startup_name")?.id || ""],
        campus: values[form.fields.find((f) => f.mappingKey === "campus")?.id || ""],
        sector: values[form.fields.find((f) => f.mappingKey === "sector")?.id || ""],
      });

      if (!isDraft) {
        setSubmitted(true);
      }
    } catch {
      // Error handled by mutation
    }
  };

  // Loading
  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background">
          <div className="flex items-center justify-center pt-40 pb-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Not found
  if (!form || error) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background">
          <div className="mx-auto max-w-3xl px-4 pt-24 pb-16 text-center">
            <AlertTriangle className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h1 className="font-display text-3xl font-bold">Application Not Found</h1>
            <p className="mt-3 text-muted-foreground">
              This competition application does not exist or is no longer accepting submissions.
            </p>
            <Link href="/explore" className="mt-6 inline-block">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Explore Events
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Check if form is open
  const now = new Date();
  const isOpen = form.status === "published"
    && (!form.opensAt || new Date(form.opensAt) <= now)
    && (!form.closesAt || new Date(form.closesAt) >= now);

  // Success state
  if (submitted) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background">
          <div className="mx-auto max-w-2xl px-4 pt-24 pb-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="font-display text-3xl font-bold mb-3">Application Submitted!</h1>
              <p className="text-lg text-muted-foreground mb-8">
                Your application for <strong>{form.competitionName}</strong> has been received.
                You will receive updates via email.
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
                <Button asChild>
                  <Link href="/explore">Explore More</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        {/* Header */}
        {form.coverImage && (
          <div className="relative h-[200px] sm:h-[280px] w-full">
            <Image
              src={form.coverImage}
              alt={form.competitionName}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>
        )}

        <div className={cn("mx-auto max-w-3xl px-4 sm:px-6 pb-16", form.coverImage ? "-mt-20 relative z-10" : "pt-24")}>
          {/* Back link */}
          <Link href="/explore" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Explore
          </Link>

          {/* Competition info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-3">
              {form.logo && (
                <Image
                  src={form.logo}
                  alt=""
                  width={48}
                  height={48}
                  className="rounded-lg"
                />
              )}
              <div>
                <Badge variant="secondary">{form.competitionType}</Badge>
                <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1">
                  {form.title}
                </h1>
              </div>
            </div>
            {form.description && (
              <p className="text-muted-foreground leading-relaxed">{form.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              {form.closesAt && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Deadline: {formatDate(form.closesAt)}
                </span>
              )}
            </div>
          </motion.div>

          {/* Form */}
          {!isOpen ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="font-display text-xl font-bold mb-2">Applications Closed</h2>
                <p className="text-muted-foreground">
                  {form.closesAt && new Date(form.closesAt) < now
                    ? `Applications closed on ${formatDate(form.closesAt)}.`
                    : form.opensAt && new Date(form.opensAt) > now
                      ? `Applications open on ${formatDate(form.opensAt)}.`
                      : "This competition is not currently accepting applications."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="p-6 sm:p-8">
                  <DynamicFormRenderer
                    fields={form.fields}
                    sections={form.sections}
                    values={values}
                    onChange={handleChange}
                    errors={formErrors}
                  />

                  {/* Action buttons */}
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSubmit(true)}
                      disabled={submitMutation.isPending}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save Draft
                    </Button>

                    <Button
                      type="button"
                      onClick={() => handleSubmit(false)}
                      disabled={submitMutation.isPending}
                    >
                      {submitMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Submit Application
                    </Button>
                  </div>

                  {submitMutation.isError && (
                    <p className="mt-4 text-sm text-destructive text-center">
                      {submitMutation.error.message}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
