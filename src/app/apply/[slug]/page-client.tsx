"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  Send,
  Save,
  Loader2,
  AlertTriangle,
  Eye,
  Pencil,
  CloudOff,
  Cloud,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DynamicFormRenderer } from "@/components/forms/dynamic-form-renderer";
import {
  useCompetitionForm,
  useSubmitApplication,
  useUpdateApplication,
  useMyApplication,
} from "@/hooks/use-competitions";
import { useAuthStore } from "@/store/auth-store";
import { cn, formatDate } from "@/lib/utils";
import type { CompetitionApplication, CompetitionForm } from "@/lib/types";

// ── Auto-save debounce delay (ms) ───────────────────────
const AUTO_SAVE_DELAY = 15_000; // 15 seconds

export default function ApplyPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const { data: formData, isLoading, error } = useCompetitionForm(slug);
  const form = formData?.data;

  // Fetch user's existing application (draft or submitted)
  const { data: myAppData, isLoading: myAppLoading } = useMyApplication(
    form?.id
  );

  const submitMutation = useSubmitApplication();
  const updateMutation = useUpdateApplication();

  const [values, setValues] = React.useState<Record<string, unknown>>({});
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [previewMode, setPreviewMode] = React.useState(false);
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null);
  const [isDirty, setIsDirty] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [initialized, setInitialized] = React.useState(false);

  // Existing application (draft or submitted that can be edited)
  const existingApp: CompetitionApplication | null = React.useMemo(() => {
    if (!myAppData?.data?.length) return null;
    return myAppData.data[0];
  }, [myAppData]);

  const isEditingSubmitted =
    existingApp?.status === "submitted" && form?.allowEditAfterSubmit === true;
  const isDraft = existingApp?.status === "draft";
  const hasExistingActiveApp =
    existingApp &&
    existingApp.status !== "withdrawn" &&
    existingApp.status !== "draft";

  // Initialize values from existing application or user profile
  React.useEffect(() => {
    if (initialized) return;
    if (!form) return;
    // Wait for myAppData to finish loading
    if (myAppLoading) return;

    const prefill: Record<string, unknown> = {};

    // Pre-fill from existing application
    if (existingApp) {
      Object.assign(prefill, existingApp.data || {});
    } else if (user) {
      // Pre-fill from user profile
      for (const field of form.fields) {
        if (field.mappingKey === "applicant_name" && user.name) {
          prefill[field.id] = user.name;
        }
        if (field.mappingKey === "applicant_email" && user.email) {
          prefill[field.id] = user.email;
        }
      }
    }

    if (Object.keys(prefill).length > 0) {
      setValues(prefill);
    }
    if (existingApp) {
      setLastSavedAt(
        existingApp.updatedAt
          ? new Date(existingApp.updatedAt)
          : new Date(existingApp.createdAt)
      );
    }
    setInitialized(true);
  }, [form, user, existingApp, myAppLoading, initialized]);

  const handleChange = (fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    setIsDirty(true);
    if (formErrors[fieldId]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  // ── Auto-save (draft only) ────────────────────────────
  const autoSaveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveDraft = React.useCallback(
    async (silent = true) => {
      if (!form || !user || isSaving) return;

      const appValues = values;
      const nameField = form.fields.find((f) => f.mappingKey === "applicant_name");
      const emailField = form.fields.find((f) => f.mappingKey === "applicant_email");

      try {
        setIsSaving(true);

        if (existingApp && (isDraft || isEditingSubmitted)) {
          // Update existing application
          await updateMutation.mutateAsync({
            formId: form.id,
            applicationId: existingApp.id,
            data: appValues,
            ...(isDraft
              ? {
                  applicantName:
                    appValues[nameField?.id || ""] || user.name || "",
                  applicantEmail:
                    appValues[emailField?.id || ""] || user.email || "",
                }
              : {}),
          });
        } else if (!existingApp) {
          // Create new draft
          await submitMutation.mutateAsync({
            formId: form.id,
            data: appValues,
            status: "draft",
            applicantName:
              appValues[nameField?.id || ""] || user.name || "",
            applicantEmail:
              appValues[emailField?.id || ""] || user.email || "",
            applicantPhone:
              appValues[
                form.fields.find((f) => f.mappingKey === "applicant_phone")
                  ?.id || ""
              ] || "",
            startupName:
              appValues[
                form.fields.find((f) => f.mappingKey === "startup_name")
                  ?.id || ""
              ] || "",
            campus:
              appValues[
                form.fields.find((f) => f.mappingKey === "campus")?.id || ""
              ] || "",
            sector:
              appValues[
                form.fields.find((f) => f.mappingKey === "sector")?.id || ""
              ] || "",
          });
        }

        setLastSavedAt(new Date());
        setIsDirty(false);
        if (!silent) {
          toast.success("Draft saved");
        }
      } catch (err) {
        if (!silent) {
          toast.error(
            err instanceof Error ? err.message : "Failed to save draft"
          );
        }
      } finally {
        setIsSaving(false);
      }
    },
    [
      form,
      user,
      values,
      existingApp,
      isDraft,
      isEditingSubmitted,
      isSaving,
      submitMutation,
      updateMutation,
    ]
  );

  // Auto-save when dirty (drafts and editable submissions only)
  React.useEffect(() => {
    if (!isDirty || !initialized) return;
    if (!isDraft && !isEditingSubmitted && existingApp) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveDraft(true);
    }, AUTO_SAVE_DELAY);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [isDirty, initialized, isDraft, isEditingSubmitted, existingApp, saveDraft]);

  // ── Validation ────────────────────────────────────────
  const validate = (): boolean => {
    if (!form) return false;
    const errors: Record<string, string> = {};

    for (const field of form.fields) {
      if (field.type === "heading" || field.type === "paragraph") continue;

      const val = values[field.id];
      if (field.required) {
        if (
          val === undefined ||
          val === null ||
          val === "" ||
          (Array.isArray(val) && val.length === 0)
        ) {
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
          } catch {
            /* invalid regex, skip */
          }
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Submit ────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form) return;
    if (!validate()) {
      setPreviewMode(false);
      toast.error("Please fix the errors before submitting.");
      return;
    }

    if (!user) {
      router.push(`/login?redirect=/apply/${slug}`);
      return;
    }

    try {
      if (existingApp && isDraft) {
        // Submit existing draft
        await updateMutation.mutateAsync({
          formId: form.id,
          applicationId: existingApp.id,
          data: values,
          status: "submitted",
          applicantName:
            values[
              form.fields.find((f) => f.mappingKey === "applicant_name")
                ?.id || ""
            ] || user.name,
          applicantEmail:
            values[
              form.fields.find((f) => f.mappingKey === "applicant_email")
                ?.id || ""
            ] || user.email,
        });
      } else if (isEditingSubmitted && existingApp) {
        // Save edit to submitted application
        await updateMutation.mutateAsync({
          formId: form.id,
          applicationId: existingApp.id,
          data: values,
        });
        toast.success("Application updated successfully");
        setIsDirty(false);
        return;
      } else {
        // New submission
        await submitMutation.mutateAsync({
          formId: form.id,
          data: values,
          status: "submitted",
          applicantName:
            values[
              form.fields.find((f) => f.mappingKey === "applicant_name")
                ?.id || ""
            ] || user.name,
          applicantEmail:
            values[
              form.fields.find((f) => f.mappingKey === "applicant_email")
                ?.id || ""
            ] || user.email,
          applicantPhone:
            values[
              form.fields.find((f) => f.mappingKey === "applicant_phone")
                ?.id || ""
            ] || "",
          startupName:
            values[
              form.fields.find((f) => f.mappingKey === "startup_name")
                ?.id || ""
            ] || "",
          campus:
            values[
              form.fields.find((f) => f.mappingKey === "campus")?.id || ""
            ] || "",
          sector:
            values[
              form.fields.find((f) => f.mappingKey === "sector")?.id || ""
            ] || "",
        });
      }

      setSubmitted(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit application"
      );
    }
  };

  const handleSaveDraft = () => saveDraft(false);

  // ── Loading ───────────────────────────────────────────
  if (isLoading || myAppLoading) {
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

  if (!form || error) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background">
          <div className="mx-auto max-w-3xl px-4 pt-24 pb-16 text-center">
            <AlertTriangle className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h1 className="font-display text-3xl font-bold">
              Application Not Found
            </h1>
            <p className="mt-3 text-muted-foreground">
              This competition application does not exist or is no longer
              accepting submissions.
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
  const isOpen =
    form.status === "published" &&
    (!form.opensAt || new Date(form.opensAt) <= now) &&
    (!form.closesAt || new Date(form.closesAt) >= now);

  // Already submitted (non-editable) — show read-only view
  if (hasExistingActiveApp && !isEditingSubmitted) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background">
          <div className="mx-auto max-w-3xl px-4 pt-24 pb-16">
            <ApplicationStatusView app={existingApp} form={form} />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Success state (just submitted)
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
              <h1 className="font-display text-3xl font-bold mb-3">
                Application Submitted!
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Your application for{" "}
                <strong>{form.competitionName}</strong> has been received. You
                will receive updates via email.
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

  const isPending = submitMutation.isPending || updateMutation.isPending;

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

        <div
          className={cn(
            "mx-auto max-w-3xl px-4 sm:px-6 pb-16",
            form.coverImage ? "-mt-20 relative z-10" : "pt-24"
          )}
        >
          {/* Back link */}
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
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
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{form.competitionType}</Badge>
                  {isDraft && (
                    <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                      Draft
                    </Badge>
                  )}
                  {isEditingSubmitted && (
                    <Badge variant="outline" className="text-blue-500 border-blue-500/30">
                      Editing
                    </Badge>
                  )}
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1">
                  {form.title}
                </h1>
              </div>
            </div>
            {form.description && (
              <p className="text-muted-foreground leading-relaxed">
                {form.description}
              </p>
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

          {/* Auto-save indicator */}
          <SaveIndicator
            lastSavedAt={lastSavedAt}
            isDirty={isDirty}
            isSaving={isSaving}
          />

          {/* Form */}
          {!isOpen && !isDraft && !isEditingSubmitted ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="font-display text-xl font-bold mb-2">
                  Applications Closed
                </h2>
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
              {/* Preview / Edit toggle */}
              {previewMode && (
                <div className="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-blue-400">
                    <Eye className="h-4 w-4" />
                    <span className="font-medium">Preview Mode</span>
                    <span className="text-muted-foreground">
                      — Review your answers before submitting
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewMode(false)}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
              )}

              <Card>
                <CardContent className="p-6 sm:p-8">
                  <DynamicFormRenderer
                    fields={form.fields}
                    sections={form.sections}
                    values={values}
                    onChange={handleChange}
                    errors={formErrors}
                    readOnly={previewMode}
                  />

                  {/* Action buttons */}
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                    {previewMode ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setPreviewMode(false)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Back to Edit
                        </Button>
                        <Button
                          type="button"
                          onClick={handleSubmit}
                          disabled={isPending}
                        >
                          {isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          {isEditingSubmitted
                            ? "Save Changes"
                            : "Confirm & Submit"}
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          {!isEditingSubmitted && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleSaveDraft}
                              disabled={isPending || isSaving}
                            >
                              {isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="mr-2 h-4 w-4" />
                              )}
                              Save Draft
                            </Button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (validate()) {
                                setPreviewMode(true);
                              } else {
                                toast.error(
                                  "Please fill in all required fields before previewing."
                                );
                              }
                            }}
                            disabled={isPending}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                          </Button>
                          <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isPending}
                          >
                            {isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="mr-2 h-4 w-4" />
                            )}
                            {isEditingSubmitted
                              ? "Save Changes"
                              : "Submit Application"}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>

                  {(submitMutation.isError || updateMutation.isError) && (
                    <p className="mt-4 text-sm text-destructive text-center">
                      {submitMutation.error?.message ||
                        updateMutation.error?.message}
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

// ── Save Indicator ──────────────────────────────────────

function SaveIndicator({
  lastSavedAt,
  isDirty,
  isSaving,
}: {
  lastSavedAt: Date | null;
  isDirty: boolean;
  isSaving: boolean;
}) {
  if (!lastSavedAt && !isDirty && !isSaving) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex items-center gap-2 text-xs text-muted-foreground"
      >
        {isSaving ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Saving...</span>
          </>
        ) : isDirty ? (
          <>
            <CloudOff className="h-3 w-3 text-amber-500" />
            <span>Unsaved changes</span>
          </>
        ) : lastSavedAt ? (
          <>
            <Cloud className="h-3 w-3 text-green-500" />
            <span>Saved {formatTimeAgo(lastSavedAt)}</span>
          </>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}

// ── Application Status View (read-only) ─────────────────

function ApplicationStatusView({
  app,
  form,
}: {
  app: CompetitionApplication;
  form: CompetitionForm;
}) {
  const statusConfig: Record<
    string,
    { color: string; bg: string; label: string }
  > = {
    submitted: {
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      label: "Submitted",
    },
    under_review: {
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      label: "Under Review",
    },
    eligible: {
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      label: "Eligible",
    },
    ineligible: {
      color: "text-red-500",
      bg: "bg-red-500/10",
      label: "Ineligible",
    },
    accepted: {
      color: "text-green-500",
      bg: "bg-green-500/10",
      label: "Accepted",
    },
    rejected: {
      color: "text-red-500",
      bg: "bg-red-500/10",
      label: "Rejected",
    },
    waitlisted: {
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      label: "Waitlisted",
    },
    confirmed: {
      color: "text-green-500",
      bg: "bg-green-500/10",
      label: "Confirmed",
    },
    declined: {
      color: "text-zinc-500",
      bg: "bg-zinc-500/10",
      label: "Declined",
    },
    withdrawn: {
      color: "text-zinc-500",
      bg: "bg-zinc-500/10",
      label: "Withdrawn",
    },
  };

  const cfg = statusConfig[app.status] || statusConfig.submitted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Status banner */}
      <div
        className={cn(
          "rounded-xl p-6 text-center mb-6",
          cfg.bg
        )}
      >
        <Badge className={cn("text-sm", cfg.color, cfg.bg)}>
          {cfg.label}
        </Badge>
        <h1 className="font-display text-2xl font-bold mt-3">
          {form.competitionName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Submitted {app.submittedAt ? formatDate(app.submittedAt) : ""}
        </p>
      </div>

      {/* Read-only form data */}
      <Card>
        <CardContent className="p-6 sm:p-8">
          <h2 className="font-display text-lg font-semibold mb-4">
            Your Application
          </h2>
          <DynamicFormRenderer
            fields={form.fields}
            sections={form.sections}
            values={app.data}
            onChange={() => {}}
            readOnly
          />
        </CardContent>
      </Card>

      <div className="flex justify-center gap-4 mt-6">
        <Button variant="outline" asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/explore">Explore More</Link>
        </Button>
      </div>
    </motion.div>
  );
}

// ── Helper ──────────────────────────────────────────────

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
