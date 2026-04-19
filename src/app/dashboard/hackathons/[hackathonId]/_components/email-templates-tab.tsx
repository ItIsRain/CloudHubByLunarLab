"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Mail, Pencil, Trash2, Send, Eye, FileText, Clock, X,
  CalendarClock, Ban, ChevronDown, ChevronUp, Users, Trophy, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { cn, formatDate } from "@/lib/utils";
import type { Hackathon } from "@/lib/types";
import {
  useEmailTemplates, useCreateEmailTemplate, useUpdateEmailTemplate,
  useDeleteEmailTemplate, useSendBulkEmail, useScheduledEmails,
  useCancelScheduledEmail, useUpdateScheduledEmail,
  type EmailTemplate, type ScheduledEmail,
} from "@/hooks/use-email-templates";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { SafeHtml } from "@/components/ui/safe-html";
import { RemindersSection } from "./reminders-section";

const RichTextEditor = dynamic(
  () => import("@/components/forms/rich-text-editor").then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <div className="shimmer rounded-xl h-[200px]" /> }
);

const CATEGORIES = ["acceptance", "rejection", "waitlist", "reminder", "announcement", "rsvp", "custom"] as const;

const CATEGORY_COLORS: Record<string, "success" | "destructive" | "warning" | "secondary" | "default" | "muted" | "outline"> = {
  acceptance: "success", rejection: "destructive", waitlist: "warning",
  reminder: "secondary", announcement: "default", rsvp: "muted", custom: "outline",
};

const RECIPIENT_STATUSES = ["accepted", "approved", "waitlisted", "pending", "rejected", "eligible", "ineligible", "under_review", "confirmed", "declined", "cancelled"] as const;

const PLACEHOLDERS = [
  { key: "{{applicant_name}}", label: "Applicant Name" },
  { key: "{{applicant_email}}", label: "Email" },
  { key: "{{hackathon_name}}", label: "Hackathon" },
  { key: "{{hackathon_url}}", label: "Competition URL" },
  { key: "{{status}}", label: "Status" },
  { key: "{{registration_date}}", label: "Reg. Date" },
  { key: "{{hackathon_start_date}}", label: "Start Date" },
  { key: "{{hackathon_end_date}}", label: "End Date" },
  { key: "{{organizer_name}}", label: "Organizer" },
  { key: "{{dashboard_url}}", label: "Dashboard URL" },
];

const selectClasses =
  "flex h-10 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

function emptyForm() {
  return { name: "", subject: "", body: "", category: "custom" as string };
}

/** Compact inline placeholder inserter — single row of small chips */
function PlaceholderChips({ onInsert }: { onInsert: (key: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {PLACEHOLDERS.map((p) => (
        <button key={p.key} type="button" onClick={() => onInsert(p.key)}
          title={p.key}
          className="text-[10px] font-mono bg-primary/10 text-primary hover:bg-primary/20 px-1.5 py-0.5 rounded transition-colors">
          {p.label}
        </button>
      ))}
    </div>
  );
}

function replacePlaceholders(text: string, hackathon: Hackathon) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return text
    .replace(/\{\{applicant_name\}\}/g, "John Doe")
    .replace(/\{\{applicant_email\}\}/g, "john@example.com")
    .replace(/\{\{hackathon_name\}\}/g, hackathon.name)
    .replace(/\{\{hackathon_url\}\}/g, `${origin}/hackathons/${hackathon.slug}`)
    .replace(/\{\{status\}\}/g, "accepted")
    .replace(/\{\{registration_date\}\}/g, new Date().toLocaleDateString())
    .replace(/\{\{hackathon_start_date\}\}/g, hackathon.hackingStart ? new Date(hackathon.hackingStart).toLocaleDateString() : "TBD")
    .replace(/\{\{hackathon_end_date\}\}/g, hackathon.hackingEnd ? new Date(hackathon.hackingEnd).toLocaleDateString() : "TBD")
    .replace(/\{\{organizer_name\}\}/g, "Organizer")
    .replace(/\{\{dashboard_url\}\}/g, `${origin}/dashboard`);
}

function statusBadgeVariant(status: string): "warning" | "success" | "muted" | "destructive" | "default" {
  switch (status) {
    case "pending": return "warning";
    case "sent": case "sending": return "success";
    case "cancelled": return "muted";
    case "failed": return "destructive";
    default: return "default";
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function EmailTemplatesTab({ hackathon, hackathonId }: { hackathon: Hackathon; hackathonId: string }) {
  const { data: templatesData, isLoading } = useEmailTemplates(hackathonId);
  const createTemplate = useCreateEmailTemplate(hackathonId);
  const updateTemplate = useUpdateEmailTemplate(hackathonId);
  const deleteTemplate = useDeleteEmailTemplate(hackathonId);
  const sendBulkEmail = useSendBulkEmail(hackathonId);
  const { data: scheduledData } = useScheduledEmails(hackathonId);
  const cancelScheduled = useCancelScheduledEmail(hackathonId);
  const updateScheduled = useUpdateScheduledEmail(hackathonId);
  const templates = templatesData?.data ?? [];
  const scheduledEmails = scheduledData?.data ?? [];

  // ── Template Dialog State ──
  const [templateDialogOpen, setTemplateDialogOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<EmailTemplate | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deletingTemplate, setDeletingTemplate] = React.useState<EmailTemplate | null>(null);

  // ── Send Email State ──
  const [sendSubject, setSendSubject] = React.useState("");
  const [sendBody, setSendBody] = React.useState("");
  const [selectedTemplateId, setSelectedTemplateId] = React.useState("");
  const [recipientStatuses, setRecipientStatuses] = React.useState<string[]>([]);
  const [sendToWinners, setSendToWinners] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [scheduleMode, setScheduleMode] = React.useState(false);
  const [scheduledAt, setScheduledAt] = React.useState("");

  // ── Scheduled Email Edit State ──
  const [editScheduledOpen, setEditScheduledOpen] = React.useState(false);
  const [editingScheduled, setEditingScheduled] = React.useState<ScheduledEmail | null>(null);
  const [editScheduledForm, setEditScheduledForm] = React.useState({
    subject: "", body: "", scheduledAt: "", recipientStatuses: [] as string[],
  });

  // ── Scheduled Emails Section Collapse ──
  const [scheduledExpanded, setScheduledExpanded] = React.useState(true);

  // ── Template Handlers ──
  function openCreateDialog() {
    setEditingTemplate(null);
    setForm(emptyForm());
    setTemplateDialogOpen(true);
  }

  function openEditDialog(t: EmailTemplate) {
    setEditingTemplate(t);
    setForm({ name: t.name, subject: t.subject, body: t.body, category: t.category });
    setTemplateDialogOpen(true);
  }

  function closeTemplateDialog() {
    setTemplateDialogOpen(false);
    setEditingTemplate(null);
    setForm(emptyForm());
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) {
      toast.error("Name, subject, and body are required.");
      return;
    }
    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({
          templateId: editingTemplate.id, name: form.name.trim(),
          subject: form.subject.trim(), body: form.body.trim(), category: form.category,
        });
        toast.success("Template updated.");
      } else {
        await createTemplate.mutateAsync({
          name: form.name.trim(), subject: form.subject.trim(),
          body: form.body.trim(), category: form.category,
        });
        toast.success("Template created.");
      }
      closeTemplateDialog();
    } catch {
      toast.error(editingTemplate ? "Failed to update template." : "Failed to create template.");
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingTemplate) return;
    try {
      await deleteTemplate.mutateAsync(deletingTemplate.id);
      toast.success("Template deleted.");
      setDeleteDialogOpen(false);
      setDeletingTemplate(null);
    } catch {
      toast.error("Failed to delete template.");
    }
  }

  // ── Send Email Handlers ──
  function handleTemplateSelect(id: string) {
    setSelectedTemplateId(id);
    if (id) {
      const t = templates.find((tpl) => tpl.id === id);
      if (t) { setSendSubject(t.subject); setSendBody(t.body); }
    }
  }

  function toggleStatus(status: string) {
    setRecipientStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!sendSubject.trim() || !sendBody.trim()) { toast.error("Subject and body are required."); return; }
    if (!sendToWinners && recipientStatuses.length === 0) { toast.error("Select at least one recipient group."); return; }
    if (scheduleMode && !scheduledAt) { toast.error("Select a date and time to schedule."); return; }
    if (scheduleMode && new Date(scheduledAt) <= new Date()) { toast.error("Scheduled time must be in the future."); return; }

    setIsSending(true);
    try {
      // If sending to winners, use the winners email endpoint
      if (sendToWinners) {
        try {
          const res = await fetch(`/api/hackathons/${hackathonId}/winners/email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subject: sendSubject.trim(), body: sendBody.trim() }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Failed to send");
          const { sent, failed } = json.data;
          if (failed > 0) {
            toast.warning(`Sent to ${sent} winner(s), ${failed} failed.`);
          } else {
            toast.success(`Email sent to ${sent} winner(s)!`);
          }
          setSendSubject(""); setSendBody(""); setSelectedTemplateId("");
          setRecipientStatuses([]); setSendToWinners(false);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to send emails to winners.");
        }
        // Also send to registrations if statuses selected
        if (recipientStatuses.length === 0) return;
      }

      await sendBulkEmail.mutateAsync({
        subject: sendSubject.trim(), body: sendBody.trim(),
        recipientFilter: { status: recipientStatuses },
        templateId: selectedTemplateId || undefined,
        scheduledAt: scheduleMode ? scheduledAt : undefined,
      });
      toast.success(scheduleMode ? "Email scheduled!" : "Emails sent!");
      setSendSubject(""); setSendBody(""); setSelectedTemplateId(""); setRecipientStatuses([]);
      setSendToWinners(false); setScheduleMode(false); setScheduledAt("");
    } catch {
      toast.error(scheduleMode ? "Failed to schedule email." : "Failed to send emails.");
    } finally {
      setIsSending(false);
    }
  }

  // ── Scheduled Email Edit Handlers ──
  function openEditScheduled(email: ScheduledEmail) {
    setEditingScheduled(email);
    setEditScheduledForm({
      subject: email.subject,
      body: email.body,
      scheduledAt: new Date(email.scheduled_at).toISOString().slice(0, 16),
      recipientStatuses: email.recipient_filter?.status ?? [],
    });
    setEditScheduledOpen(true);
  }

  function closeEditScheduled() {
    setEditScheduledOpen(false);
    setEditingScheduled(null);
  }

  async function handleSaveScheduledEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingScheduled) return;
    if (!editScheduledForm.subject.trim() || !editScheduledForm.body.trim()) {
      toast.error("Subject and body are required.");
      return;
    }
    if (!editScheduledForm.scheduledAt) {
      toast.error("Scheduled date is required.");
      return;
    }
    if (new Date(editScheduledForm.scheduledAt) <= new Date()) {
      toast.error("Scheduled time must be in the future.");
      return;
    }
    try {
      await updateScheduled.mutateAsync({
        scheduledEmailId: editingScheduled.id,
        subject: editScheduledForm.subject.trim(),
        body: editScheduledForm.body,
        scheduledAt: editScheduledForm.scheduledAt,
        recipientFilter: editScheduledForm.recipientStatuses.length > 0
          ? { status: editScheduledForm.recipientStatuses }
          : undefined,
      });
      toast.success("Scheduled email updated.");
      closeEditScheduled();
    } catch {
      toast.error("Failed to update scheduled email.");
    }
  }

  const isSaving = createTemplate.isPending || updateTemplate.isPending;
  const pendingScheduled = scheduledEmails.filter((e) => e.status === "pending");
  const pastScheduled = scheduledEmails.filter((e) => e.status !== "pending");

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Email Communications</h2>
          <p className="text-sm text-muted-foreground">
            Manage templates, send bulk emails, and track scheduled deliveries
          </p>
        </div>
        <Button variant="gradient" onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </motion.div>

      {/* ── Scheduled Emails (always visible) ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary" />
                Scheduled Emails
                {pendingScheduled.length > 0 && (
                  <Badge variant="warning" className="ml-1">{pendingScheduled.length} pending</Badge>
                )}
              </CardTitle>
              {scheduledEmails.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setScheduledExpanded(!scheduledExpanded)} className="h-8 w-8 p-0">
                  {scheduledExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </CardHeader>
          <AnimatePresence>
            {(scheduledExpanded || scheduledEmails.length === 0) && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <CardContent className="pt-0">
                  {scheduledEmails.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                        <CalendarClock className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        No scheduled emails yet. Use the &quot;Schedule for later&quot; option when composing bulk emails.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Pending (editable) */}
                      {pendingScheduled.map((email) => (
                        <div key={email.id} className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="warning" className="text-[10px]">Pending</Badge>
                                <span className="text-xs text-muted-foreground">
                                  Scheduled for {new Date(email.scheduled_at).toLocaleString()}
                                </span>
                              </div>
                              <p className="font-medium text-sm">{email.subject}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {email.body.replace(/<[^>]+>/g, "").slice(0, 120)}
                              </p>
                              {email.recipient_filter?.status && email.recipient_filter.status.length > 0 && (
                                <div className="flex items-center gap-1.5 mt-2">
                                  <Users className="h-3 w-3 text-muted-foreground" />
                                  <div className="flex flex-wrap gap-1">
                                    {email.recipient_filter.status.map((s) => (
                                      <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">
                                        {capitalize(s)}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button variant="outline" size="sm" onClick={() => openEditScheduled(email)} className="h-8 gap-1.5 text-xs">
                                <Pencil className="h-3 w-3" />Edit
                              </Button>
                              <Button
                                variant="ghost" size="sm"
                                onClick={async () => {
                                  try {
                                    await cancelScheduled.mutateAsync(email.id);
                                    toast.success("Scheduled email cancelled.");
                                  } catch {
                                    toast.error("Failed to cancel.");
                                  }
                                }}
                                disabled={cancelScheduled.isPending}
                                className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
                              >
                                <Ban className="h-3 w-3" />Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Past (read-only) */}
                      {pastScheduled.length > 0 && pendingScheduled.length > 0 && (
                        <div className="border-t my-3" />
                      )}
                      {pastScheduled.map((email) => (
                        <div key={email.id} className="rounded-xl border border-border p-3 flex items-center justify-between gap-3 opacity-70">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <Badge variant={statusBadgeVariant(email.status)} className="text-[10px]">
                                {capitalize(email.status)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(email.scheduled_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm truncate">{email.subject}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* ── Templates Grid ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }} className="space-y-4">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Templates
          {templates.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">({templates.length})</span>
          )}
        </h3>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="shimmer rounded-xl h-36 w-full" />
            ))}
          </div>
        ) : templates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template, i) => (
              <motion.div key={template.id} initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.04 }}>
                <Card className="hover:shadow-md transition-all duration-200 h-full group">
                  <CardContent className="p-4 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h4 className="font-medium text-sm truncate">{template.name}</h4>
                        <Badge variant={CATEGORY_COLORS[template.category] ?? "outline"} className="mt-1 text-[10px]">
                          {capitalize(template.category)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(template)} className="h-7 w-7 p-0">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setDeletingTemplate(template); setDeleteDialogOpen(true); }}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1 truncate">
                      <span className="font-medium text-foreground/70">Subj:</span> {template.subject}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
                      {template.body.replace(/<[^>]+>/g, "")}
                    </p>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(template.created_at)}
                      {template.is_default && (
                        <Badge variant="secondary" className="ml-auto text-[9px] px-1">Default</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <h4 className="font-display font-semibold mb-1">No Templates Yet</h4>
              <p className="text-sm text-muted-foreground max-w-sm">
                Create reusable templates for acceptance, rejection, reminders and more.
              </p>
              <Button variant="outline" onClick={openCreateDialog} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />Create Template
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* ── Send / Schedule Bulk Email ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />Compose Bulk Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendEmail} className="space-y-5">
              {/* Template selector */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Load from Template</label>
                <select value={selectedTemplateId} onChange={(e) => handleTemplateSelect(e.target.value)} className={selectClasses}>
                  <option value="">-- Custom email --</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({capitalize(t.category)})</option>
                  ))}
                </select>
              </div>

              {/* Subject with inline placeholders */}
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-4">
                  <label className="text-sm font-medium shrink-0 pt-0.5">Subject</label>
                  <PlaceholderChips onInsert={(key) => setSendSubject((prev) => prev + key)} />
                </div>
                <Input value={sendSubject} onChange={(e) => setSendSubject(e.target.value)} placeholder="Email subject..." />
              </div>

              {/* Body with inline placeholders */}
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-4">
                  <label className="text-sm font-medium shrink-0 pt-0.5">Body</label>
                  <PlaceholderChips onInsert={(key) => setSendBody((prev) => prev + key)} />
                </div>
                <RichTextEditor
                  value={sendBody}
                  onChange={setSendBody}
                  placeholder="Write your email body... Use placeholders to personalize."
                  minHeight="200px"
                />
              </div>

              {/* Recipients */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Recipients</label>
                <div className="flex flex-wrap gap-2">
                  {/* Winners option */}
                  <label className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs cursor-pointer transition-all duration-200",
                    sendToWinners ? "border-amber-500 bg-amber-500/5 text-amber-600 font-medium" : "border-input hover:bg-muted/50"
                  )}>
                    <input type="checkbox" checked={sendToWinners} onChange={() => setSendToWinners((v) => !v)} className="sr-only" />
                    <div className={cn(
                      "h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                      sendToWinners ? "bg-amber-500 border-amber-500" : "border-input"
                    )}>
                      {sendToWinners && (
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24"
                          stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <Trophy className="h-3 w-3" />
                    Winners
                  </label>
                  {/* Divider */}
                  <div className="w-px h-6 bg-border self-center" />
                  {RECIPIENT_STATUSES.map((status) => {
                    const checked = recipientStatuses.includes(status);
                    return (
                      <label key={status} className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs cursor-pointer transition-all duration-200",
                        checked ? "border-primary bg-primary/5 text-primary font-medium" : "border-input hover:bg-muted/50"
                      )}>
                        <input type="checkbox" checked={checked} onChange={() => toggleStatus(status)} className="sr-only" />
                        <div className={cn(
                          "h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                          checked ? "bg-primary border-primary" : "border-input"
                        )}>
                          {checked && (
                            <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24"
                              stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        {capitalize(status)}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Schedule toggle */}
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-3">
                <label className={cn(
                  "flex items-center gap-2 text-sm cursor-pointer transition-colors",
                  scheduleMode ? "text-primary font-medium" : "text-muted-foreground"
                )}>
                  <input type="checkbox" checked={scheduleMode}
                    onChange={(e) => { setScheduleMode(e.target.checked); if (!e.target.checked) setScheduledAt(""); }}
                    className="sr-only" />
                  <div className={cn(
                    "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                    scheduleMode ? "bg-primary border-primary" : "border-input"
                  )}>
                    {scheduleMode && (
                      <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <Clock className="h-4 w-4" />
                  Schedule for later
                </label>
                {scheduleMode && (
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="max-w-[220px] h-9 text-sm"
                  />
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}
                  disabled={!sendSubject.trim() || !sendBody.trim()} className="gap-2">
                  <Eye className="h-4 w-4" />Preview
                </Button>
                <Button type="submit" variant="gradient" disabled={isSending || sendBulkEmail.isPending} className="gap-2">
                  {isSending || sendBulkEmail.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : scheduleMode ? <Clock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                  {isSending || sendBulkEmail.isPending
                    ? (scheduleMode ? "Scheduling..." : "Sending...")
                    : (scheduleMode ? "Schedule Email" : "Send Email")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Reminder Automation ── */}
      <RemindersSection hackathon={hackathon} hackathonId={hackathonId} />

      {/* ═══════════════════════ Dialogs ═══════════════════════ */}

      {/* Create / Edit Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Update the email template below."
                : "Create a reusable email template."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTemplate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Name</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Acceptance Email" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={selectClasses}>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{capitalize(cat)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-4">
                <label className="text-sm font-medium shrink-0 pt-0.5">Subject</label>
                <PlaceholderChips onInsert={(key) => setForm((prev) => ({ ...prev, subject: prev.subject + key }))} />
              </div>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Email subject line..." />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-4">
                <label className="text-sm font-medium shrink-0 pt-0.5">Body</label>
                <PlaceholderChips onInsert={(key) => setForm((prev) => ({ ...prev, body: prev.body + key }))} />
              </div>
              <RichTextEditor
                value={form.body}
                onChange={(val) => setForm((prev) => ({ ...prev, body: val }))}
                placeholder="Write the email body..."
                minHeight="250px"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeTemplateDialog}>Cancel</Button>
              <Button type="submit" variant="gradient" disabled={isSaving} className="gap-2">
                {isSaving ? "Saving..." : editingTemplate ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Delete &ldquo;{deletingTemplate?.name}&rdquo;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeletingTemplate(null); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}
              disabled={deleteTemplate.isPending} className="gap-2">
              <Trash2 className="h-4 w-4" />{deleteTemplate.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>Placeholders replaced with sample values.</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border p-4 bg-muted/30 space-y-3">
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Subject</span>
              <p className="font-medium mt-0.5">{replacePlaceholders(sendSubject, hackathon) || "(empty)"}</p>
            </div>
            <div className="border-t pt-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Body</span>
              {sendBody ? (
                <SafeHtml
                  content={replacePlaceholders(sendBody, hackathon)}
                  className="mt-2 prose prose-sm dark:prose-invert max-w-none"
                />
              ) : (
                <p className="mt-2 text-muted-foreground italic text-sm">(empty)</p>
              )}
            </div>
            {recipientStatuses.length > 0 && (
              <div className="border-t pt-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recipients</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {recipientStatuses.map((s) => (
                    <Badge key={s} variant="secondary">{capitalize(s)}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Scheduled Email Dialog */}
      <Dialog open={editScheduledOpen} onOpenChange={setEditScheduledOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Scheduled Email</DialogTitle>
            <DialogDescription>
              Update this email before it&apos;s sent. Changes only apply to pending emails.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveScheduledEdit} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-4">
                <label className="text-sm font-medium shrink-0 pt-0.5">Subject</label>
                <PlaceholderChips onInsert={(key) =>
                  setEditScheduledForm((prev) => ({ ...prev, subject: prev.subject + key }))
                } />
              </div>
              <Input
                value={editScheduledForm.subject}
                onChange={(e) => setEditScheduledForm((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="Email subject..."
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-4">
                <label className="text-sm font-medium shrink-0 pt-0.5">Body</label>
                <PlaceholderChips onInsert={(key) =>
                  setEditScheduledForm((prev) => ({ ...prev, body: prev.body + key }))
                } />
              </div>
              <RichTextEditor
                value={editScheduledForm.body}
                onChange={(val) => setEditScheduledForm((prev) => ({ ...prev, body: val }))}
                placeholder="Write the email body..."
                minHeight="200px"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Scheduled Date & Time</label>
              <Input
                type="datetime-local"
                value={editScheduledForm.scheduledAt}
                onChange={(e) => setEditScheduledForm((prev) => ({ ...prev, scheduledAt: e.target.value }))}
                min={new Date().toISOString().slice(0, 16)}
                className="max-w-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Recipient Statuses</label>
              <div className="flex flex-wrap gap-2">
                {RECIPIENT_STATUSES.map((status) => {
                  const checked = editScheduledForm.recipientStatuses.includes(status);
                  return (
                    <label key={status} className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs cursor-pointer transition-all duration-200",
                      checked ? "border-primary bg-primary/5 text-primary font-medium" : "border-input hover:bg-muted/50"
                    )}>
                      <input type="checkbox" checked={checked}
                        onChange={() => {
                          setEditScheduledForm((prev) => ({
                            ...prev,
                            recipientStatuses: checked
                              ? prev.recipientStatuses.filter((s) => s !== status)
                              : [...prev.recipientStatuses, status],
                          }));
                        }}
                        className="sr-only" />
                      <div className={cn(
                        "h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                        checked ? "bg-primary border-primary" : "border-input"
                      )}>
                        {checked && (
                          <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {capitalize(status)}
                    </label>
                  );
                })}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEditScheduled}>Cancel</Button>
              <Button type="submit" variant="gradient" disabled={updateScheduled.isPending} className="gap-2">
                {updateScheduled.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
