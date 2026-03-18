"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Bell, Pencil, Trash2, Send, Clock,
  ChevronDown, ChevronUp, FileWarning, CalendarClock,
  CheckCircle2,
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
  useReminderRules, useCreateReminderRule, useUpdateReminderRule,
  useDeleteReminderRule, useTriggerReminder,
  type ReminderRule,
} from "@/hooks/use-reminders";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(
  () => import("@/components/forms/rich-text-editor").then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <div className="shimmer rounded-xl h-[200px]" /> }
);

const REMINDER_TYPES = [
  { value: "incomplete_application", label: "Incomplete Application", description: "Remind users who started but didn't submit" },
  { value: "deadline_approaching", label: "Deadline Approaching", description: "Notify registrants about upcoming deadline" },
  { value: "rsvp_confirmation", label: "RSVP Confirmation", description: "Remind accepted participants to confirm attendance" },
] as const;

const TYPE_COLORS: Record<string, "warning" | "default" | "success"> = {
  incomplete_application: "warning",
  deadline_approaching: "default",
  rsvp_confirmation: "success",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  incomplete_application: <FileWarning className="h-4 w-4" />,
  deadline_approaching: <CalendarClock className="h-4 w-4" />,
  rsvp_confirmation: <CheckCircle2 className="h-4 w-4" />,
};

const PLACEHOLDERS = [
  { key: "{{applicant_name}}", label: "Applicant Name" },
  { key: "{{applicant_email}}", label: "Email" },
  { key: "{{hackathon_name}}", label: "Hackathon" },
  { key: "{{hackathon_url}}", label: "Hackathon URL" },
  { key: "{{status}}", label: "Status" },
  { key: "{{hackathon_start_date}}", label: "Start Date" },
  { key: "{{hackathon_end_date}}", label: "End Date" },
  { key: "{{registration_deadline}}", label: "Reg. Deadline" },
  { key: "{{organizer_name}}", label: "Organizer" },
  { key: "{{dashboard_url}}", label: "Dashboard URL" },
];

const selectClasses =
  "flex h-10 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

function emptyForm() {
  return {
    name: "",
    reminder_type: "deadline_approaching" as string,
    enabled: true,
    trigger_mode: "days" as "days" | "hours",
    trigger_value: 3,
    email_subject: "",
    email_body: "",
  };
}

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

function formatTriggerTiming(rule: ReminderRule): string {
  if (rule.trigger_days_before !== null && rule.trigger_days_before !== undefined) {
    return `${rule.trigger_days_before} day${rule.trigger_days_before === 1 ? "" : "s"} before deadline`;
  }
  if (rule.trigger_hours_before !== null && rule.trigger_hours_before !== undefined) {
    return `${rule.trigger_hours_before} hour${rule.trigger_hours_before === 1 ? "" : "s"} before deadline`;
  }
  return "No trigger set";
}

interface RemindersSectionProps {
  hackathon: Hackathon;
  hackathonId: string;
}

export function RemindersSection({ hackathon, hackathonId }: RemindersSectionProps) {
  const { data: rulesData, isLoading } = useReminderRules(hackathonId);
  const createRule = useCreateReminderRule(hackathonId);
  const updateRule = useUpdateReminderRule(hackathonId);
  const deleteRule = useDeleteReminderRule(hackathonId);
  const triggerReminder = useTriggerReminder(hackathonId);

  const rules = rulesData?.data ?? [];

  // Section collapse
  const [expanded, setExpanded] = React.useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<ReminderRule | null>(null);
  const [form, setForm] = React.useState(emptyForm);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deletingRule, setDeletingRule] = React.useState<ReminderRule | null>(null);

  // Trigger confirmation dialog
  const [triggerDialogOpen, setTriggerDialogOpen] = React.useState(false);
  const [triggeringRule, setTriggeringRule] = React.useState<ReminderRule | null>(null);

  function openCreateDialog() {
    setEditingRule(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEditDialog(rule: ReminderRule) {
    setEditingRule(rule);
    const useDays = rule.trigger_days_before !== null && rule.trigger_days_before !== undefined;
    setForm({
      name: rule.name,
      reminder_type: rule.reminder_type,
      enabled: rule.enabled,
      trigger_mode: useDays ? "days" : "hours",
      trigger_value: useDays
        ? (rule.trigger_days_before ?? 3)
        : (rule.trigger_hours_before ?? 24),
      email_subject: rule.email_subject,
      email_body: rule.email_body,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingRule(null);
    setForm(emptyForm());
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email_subject.trim() || !form.email_body.trim()) {
      toast.error("Name, subject, and body are required.");
      return;
    }
    if (form.trigger_value <= 0) {
      toast.error("Trigger timing must be a positive number.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      reminder_type: form.reminder_type,
      enabled: form.enabled,
      trigger_days_before: form.trigger_mode === "days" ? form.trigger_value : null,
      trigger_hours_before: form.trigger_mode === "hours" ? form.trigger_value : null,
      email_subject: form.email_subject.trim(),
      email_body: form.email_body.trim(),
    };

    try {
      if (editingRule) {
        await updateRule.mutateAsync({ ruleId: editingRule.id, ...payload });
        toast.success("Reminder rule updated.");
      } else {
        await createRule.mutateAsync(payload);
        toast.success("Reminder rule created.");
      }
      closeDialog();
    } catch {
      toast.error(editingRule ? "Failed to update reminder rule." : "Failed to create reminder rule.");
    }
  }

  async function handleDelete() {
    if (!deletingRule) return;
    try {
      await deleteRule.mutateAsync(deletingRule.id);
      toast.success("Reminder rule deleted.");
      setDeleteDialogOpen(false);
      setDeletingRule(null);
    } catch {
      toast.error("Failed to delete reminder rule.");
    }
  }

  async function handleToggleEnabled(rule: ReminderRule) {
    try {
      await updateRule.mutateAsync({
        ruleId: rule.id,
        enabled: !rule.enabled,
      });
      toast.success(rule.enabled ? "Reminder disabled." : "Reminder enabled.");
    } catch {
      toast.error("Failed to toggle reminder.");
    }
  }

  async function handleTrigger() {
    if (!triggeringRule) return;
    try {
      const result = await triggerReminder.mutateAsync(triggeringRule.id);
      const data = result.data;
      if (data.message) {
        toast.info(data.message);
      } else {
        toast.success(`Sent ${data.sent} email${data.sent === 1 ? "" : "s"}${data.failed > 0 ? `, ${data.failed} failed` : ""}.`);
      }
      setTriggerDialogOpen(false);
      setTriggeringRule(null);
    } catch {
      toast.error("Failed to send reminder.");
    }
  }

  const isSaving = createRule.isPending || updateRule.isPending;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Reminder Automation
              {rules.filter((r) => r.enabled).length > 0 && (
                <Badge variant="success" className="ml-1">
                  {rules.filter((r) => r.enabled).length} active
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={openCreateDialog} className="gap-1.5 h-8 text-xs">
                <Plus className="h-3.5 w-3.5" />Add Reminder
              </Button>
              {rules.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="h-8 w-8 p-0">
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <AnimatePresence>
          {(expanded || rules.length === 0) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <CardContent className="pt-0">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="shimmer rounded-xl h-20 w-full" />
                    ))}
                  </div>
                ) : rules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                      <Bell className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h4 className="font-display font-semibold mb-1">No Reminders Configured</h4>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Set up automatic reminders for incomplete applications, approaching deadlines, and RSVP confirmations.
                    </p>
                    <Button variant="outline" onClick={openCreateDialog} className="mt-4 gap-2">
                      <Plus className="h-4 w-4" />Add Reminder Rule
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rules.map((rule, i) => (
                      <motion.div
                        key={rule.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={cn(
                          "rounded-xl border p-4 space-y-2 transition-all duration-200",
                          rule.enabled
                            ? "border-border bg-card hover:shadow-md"
                            : "border-border/50 bg-muted/30 opacity-60"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-medium text-sm">{rule.name}</h4>
                              <Badge
                                variant={TYPE_COLORS[rule.reminder_type] ?? "default"}
                                className="text-[10px] gap-1"
                              >
                                {TYPE_ICONS[rule.reminder_type]}
                                {capitalize(rule.reminder_type)}
                              </Badge>
                              <Badge
                                variant={rule.enabled ? "success" : "muted"}
                                className="text-[10px]"
                              >
                                {rule.enabled ? "Enabled" : "Disabled"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTriggerTiming(rule)}
                              </span>
                              {rule.last_sent_at && (
                                <span>
                                  Last sent: {formatDate(rule.last_sent_at)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              <span className="font-medium text-foreground/70">Subj:</span>{" "}
                              {rule.email_subject}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Toggle enabled */}
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => handleToggleEnabled(rule)}
                              disabled={updateRule.isPending}
                              title={rule.enabled ? "Disable" : "Enable"}
                              className={cn(
                                "h-8 w-8 p-0 transition-colors",
                                rule.enabled ? "text-green-500 hover:text-green-600" : "text-muted-foreground"
                              )}
                            >
                              <Bell className="h-3.5 w-3.5" />
                            </Button>
                            {/* Send Now */}
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => { setTriggeringRule(rule); setTriggerDialogOpen(true); }}
                              title="Send Now"
                              className="h-8 w-8 p-0 text-primary hover:text-primary"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                            {/* Edit */}
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => openEditDialog(rule)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {/* Delete */}
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => { setDeletingRule(rule); setDeleteDialogOpen(true); }}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* ═══════════════════════ Dialogs ═══════════════════════ */}

      {/* Create / Edit Rule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Reminder Rule" : "Create Reminder Rule"}</DialogTitle>
            <DialogDescription>
              {editingRule
                ? "Update the reminder configuration below."
                : "Set up an automated reminder for your hackathon participants."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Name + Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Rule Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., 3-day deadline reminder"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reminder Type</label>
                <select
                  value={form.reminder_type}
                  onChange={(e) => setForm({ ...form, reminder_type: e.target.value })}
                  className={selectClasses}
                >
                  {REMINDER_TYPES.map((rt) => (
                    <option key={rt.value} value={rt.value}>{rt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Type description */}
            <p className="text-xs text-muted-foreground -mt-2">
              {REMINDER_TYPES.find((rt) => rt.value === form.reminder_type)?.description}
            </p>

            {/* Trigger Timing */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Trigger Timing</label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={form.trigger_mode === "days" ? 365 : 8760}
                  value={form.trigger_value}
                  onChange={(e) =>
                    setForm({ ...form, trigger_value: parseInt(e.target.value, 10) || 0 })
                  }
                  className="max-w-[100px]"
                />
                <select
                  value={form.trigger_mode}
                  onChange={(e) =>
                    setForm({ ...form, trigger_mode: e.target.value as "days" | "hours" })
                  }
                  className={cn(selectClasses, "max-w-[160px]")}
                >
                  <option value="days">days before deadline</option>
                  <option value="hours">hours before deadline</option>
                </select>
              </div>
            </div>

            {/* Enabled toggle */}
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-3">
              <label className={cn(
                "flex items-center gap-2 text-sm cursor-pointer transition-colors",
                form.enabled ? "text-primary font-medium" : "text-muted-foreground"
              )}>
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  className="sr-only"
                />
                <div className={cn(
                  "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                  form.enabled ? "bg-primary border-primary" : "border-input"
                )}>
                  {form.enabled && (
                    <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <Bell className="h-4 w-4" />
                Enable this reminder
              </label>
            </div>

            {/* Subject with placeholders */}
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-4">
                <label className="text-sm font-medium shrink-0 pt-0.5">Email Subject</label>
                <PlaceholderChips onInsert={(key) =>
                  setForm((prev) => ({ ...prev, email_subject: prev.email_subject + key }))
                } />
              </div>
              <Input
                value={form.email_subject}
                onChange={(e) => setForm({ ...form, email_subject: e.target.value })}
                placeholder="e.g., Don't miss out — registration closes soon!"
              />
            </div>

            {/* Body with placeholders */}
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-4">
                <label className="text-sm font-medium shrink-0 pt-0.5">Email Body</label>
                <PlaceholderChips onInsert={(key) =>
                  setForm((prev) => ({ ...prev, email_body: prev.email_body + key }))
                } />
              </div>
              <RichTextEditor
                value={form.email_body}
                onChange={(val) => setForm((prev) => ({ ...prev, email_body: val }))}
                placeholder="Write the reminder email body... Use placeholders to personalize."
                minHeight="200px"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" variant="gradient" disabled={isSaving} className="gap-2">
                {isSaving ? "Saving..." : editingRule ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Reminder Rule</DialogTitle>
            <DialogDescription>
              Delete &ldquo;{deletingRule?.name}&rdquo;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeletingRule(null); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}
              disabled={deleteRule.isPending} className="gap-2">
              <Trash2 className="h-4 w-4" />{deleteRule.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trigger Confirmation Dialog */}
      <Dialog open={triggerDialogOpen} onOpenChange={setTriggerDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Send Reminder Now</DialogTitle>
            <DialogDescription>
              This will immediately send the &ldquo;{triggeringRule?.name}&rdquo; reminder
              to all matching recipients. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTriggerDialogOpen(false); setTriggeringRule(null); }}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleTrigger}
              disabled={triggerReminder.isPending} className="gap-2">
              <Send className="h-4 w-4" />
              {triggerReminder.isPending ? "Sending..." : "Send Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
