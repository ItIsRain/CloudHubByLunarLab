"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Download,
  FileText,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail,
  Eye,
  RotateCcw,
  Shield,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  UserCheck,
  Loader2,
  StickyNote,
  CheckSquare,
  Square,
  MinusSquare,
  Save,
  Megaphone,
  Users,
  CalendarClock,
  Trash2,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatDate, getInitials } from "@/lib/utils";
import type { Hackathon, FormField } from "@/lib/types";
import { fetchJson } from "@/lib/fetch-json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useHackathonRsvp } from "@/hooks/use-registrations";
import {
  useScreeningOverrides,
  type ScreeningOverride,
} from "@/hooks/use-screening-overrides";

// ── Types ──────────────────────────────────────────────

interface ApplicationsTabProps {
  hackathon: Hackathon;
  hackathonId: string;
}

interface ScreeningResult {
  ruleId: string;
  ruleName: string;
  ruleType: "hard" | "soft";
  passed: boolean;
  actualValue: unknown;
  reason: string;
}

interface ApplicationParticipant {
  id: string;
  userId: string;
  hackathonId: string;
  status: string;
  teamName?: string;
  trackName?: string;
  createdAt: string;
  formData?: Record<string, unknown>;
  completenessScore?: number;
  eligibilityPassed?: boolean | null;
  screeningResults?: ScreeningResult[];
  screeningFlags?: ScreeningResult[];
  screeningCompletedAt?: string | null;
  resultsPublishedAt?: string | null;
  internalNotes?: string | null;
  flags?: { type: string; message: string; resolved: boolean }[];
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    username?: string;
  };
}

// ── Status Helpers ─────────────────────────────────────

const statusBadgeConfig: Record<
  string,
  { variant: "success" | "warning" | "destructive" | "muted" | "default" | "outline" }
> = {
  pending: { variant: "warning" },
  confirmed: { variant: "success" },
  approved: { variant: "success" },
  under_review: { variant: "outline" },
  eligible: { variant: "success" },
  ineligible: { variant: "destructive" },
  accepted: { variant: "success" },
  waitlisted: { variant: "warning" },
  rejected: { variant: "destructive" },
  declined: { variant: "destructive" },
  cancelled: { variant: "muted" },
};

function getStatusActions(status: string) {
  const actions: {
    label: string;
    icon: React.ElementType;
    targetStatus: string;
    className?: string;
  }[] = [];

  switch (status) {
    case "pending":
      actions.push(
        { label: "Start Review", icon: Eye, targetStatus: "under_review" },
        { label: "Accept", icon: CheckCircle2, targetStatus: "accepted", className: "text-green-600" },
        { label: "Reject", icon: XCircle, targetStatus: "rejected", className: "text-red-600" },
        { label: "Waitlist", icon: Clock, targetStatus: "waitlisted", className: "text-orange-600" },
      );
      break;
    case "confirmed":
      actions.push(
        { label: "Accept", icon: CheckCircle2, targetStatus: "accepted", className: "text-green-600" },
        { label: "Reject", icon: XCircle, targetStatus: "rejected", className: "text-red-600" },
        { label: "Waitlist", icon: Clock, targetStatus: "waitlisted", className: "text-orange-600" },
      );
      break;
    case "under_review":
      actions.push(
        { label: "Accept", icon: CheckCircle2, targetStatus: "accepted", className: "text-green-600" },
        { label: "Reject", icon: XCircle, targetStatus: "rejected", className: "text-red-600" },
        { label: "Waitlist", icon: Clock, targetStatus: "waitlisted", className: "text-orange-600" },
      );
      break;
    case "eligible":
      actions.push(
        { label: "Accept", icon: CheckCircle2, targetStatus: "accepted", className: "text-green-600" },
        { label: "Reject", icon: XCircle, targetStatus: "rejected", className: "text-red-600" },
        { label: "Waitlist", icon: Clock, targetStatus: "waitlisted", className: "text-orange-600" },
      );
      break;
    case "ineligible":
      actions.push(
        { label: "Accept (Override)", icon: CheckCircle2, targetStatus: "accepted", className: "text-green-600" },
        { label: "Reject", icon: XCircle, targetStatus: "rejected", className: "text-red-600" },
      );
      break;
    case "accepted":
      actions.push(
        { label: "Cancel", icon: XCircle, targetStatus: "cancelled", className: "text-red-600" },
      );
      break;
    case "waitlisted":
      actions.push(
        { label: "Accept", icon: CheckCircle2, targetStatus: "accepted", className: "text-green-600" },
        { label: "Reject", icon: XCircle, targetStatus: "rejected", className: "text-red-600" },
      );
      break;
    case "rejected":
      actions.push(
        { label: "Re-accept", icon: RotateCcw, targetStatus: "accepted", className: "text-green-600" },
      );
      break;
    case "approved":
      actions.push(
        { label: "Decline", icon: XCircle, targetStatus: "declined", className: "text-orange-600" },
        { label: "Cancel", icon: XCircle, targetStatus: "cancelled", className: "text-red-600" },
      );
      break;
    case "declined":
      actions.push(
        { label: "Re-accept", icon: RotateCcw, targetStatus: "accepted", className: "text-green-600" },
        { label: "Re-approve", icon: RotateCcw, targetStatus: "approved", className: "text-green-600" },
      );
      break;
    case "cancelled":
      actions.push(
        { label: "Re-accept", icon: RotateCcw, targetStatus: "accepted", className: "text-green-600" },
      );
      break;
  }

  return actions;
}

// ── Select Styles ──────────────────────────────────────

const selectClasses =
  "flex h-11 rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary appearance-none";

// ── Form Data Renderer ─────────────────────────────────

function renderFormValue(field: FormField, value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground italic">Not provided</span>;
  }

  switch (field.type) {
    case "checkbox":
      return (
        <Badge variant={value ? "success" : "muted"} className="text-xs">
          {value ? "Yes" : "No"}
        </Badge>
      );
    case "multi_select":
      if (Array.isArray(value)) {
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((v, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {String(v)}
              </Badge>
            ))}
          </div>
        );
      }
      return <span className="text-sm">{String(value)}</span>;
    case "select":
    case "radio": {
      const option = field.options?.find((o) => o.value === String(value));
      return <span className="text-sm">{option?.label || String(value)}</span>;
    }
    case "url":
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary underline hover:text-primary/80"
        >
          {String(value)}
        </a>
      );
    case "file": {
      // File value can be an object { url, originalFilename, ... } or a plain string URL
      const fileUrl = typeof value === "object" && value !== null && "url" in value
        ? (value as { url: string }).url
        : String(value);
      const fileName = typeof value === "object" && value !== null && "originalFilename" in value
        ? (value as { originalFilename: string }).originalFilename
        : "View file";
      return (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary underline hover:text-primary/80"
        >
          {fileName}
        </a>
      );
    }
    case "date":
      return <span className="text-sm">{formatDate(String(value))}</span>;
    case "textarea":
      return (
        <p className="text-sm whitespace-pre-wrap leading-relaxed">
          {String(value)}
        </p>
      );
    default:
      return <span className="text-sm">{String(value)}</span>;
  }
}

// ── Completeness Bar ───────────────────────────────────

function CompletenessBar({ score }: { score: number }) {
  const colorClass =
    score >= 80
      ? "bg-green-500"
      : score >= 50
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", colorClass)}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span
        className={cn(
          "font-mono text-xs",
          score >= 80
            ? "text-green-600"
            : score >= 50
              ? "text-yellow-600"
              : "text-red-600"
        )}
      >
        {score.toFixed(0)}%
      </span>
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color?: "green" | "red" | "orange" | "blue";
}) {
  const colorClasses = {
    green: "text-green-600 bg-green-100 dark:bg-green-900/30",
    red: "text-red-600 bg-red-100 dark:bg-red-900/30",
    orange: "text-orange-600 bg-orange-100 dark:bg-orange-900/30",
    blue: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  };

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center",
            color ? colorClasses[color] : "bg-primary/10 text-primary"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-display text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Internal Notes Editor ──────────────────────────────

function InternalNotesEditor({
  registrationId,
  initialNotes,
  onSave,
  isSaving,
}: {
  registrationId: string;
  initialNotes: string;
  onSave: (notes: string) => void;
  isSaving: boolean;
}) {
  const [notes, setNotes] = React.useState(initialNotes);
  const [isEditing, setIsEditing] = React.useState(false);
  const isDirty = notes !== initialNotes;

  // Sync with external changes
  React.useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <div className="flex items-center gap-2 mb-2">
        <StickyNote className="h-4 w-4 text-muted-foreground" />
        <h5 className="font-display font-bold text-sm">Internal Notes</h5>
        <span className="text-[10px] text-muted-foreground">(visible to organizers only)</span>
      </div>
      {isEditing ? (
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add internal notes about this application..."
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                onSave(notes);
                setIsEditing(false);
              }}
              disabled={isSaving || !isDirty}
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Save className="h-3 w-3 mr-1" />
              )}
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setNotes(initialNotes);
                setIsEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="cursor-pointer group"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          {notes ? (
            <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg px-3 py-2 group-hover:bg-muted transition-colors">
              {notes}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic bg-muted/30 rounded-lg px-3 py-2 group-hover:bg-muted/50 transition-colors">
              Click to add notes...
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Override History Section ─────────────────────────────

function OverrideHistorySection({
  hackathonId,
  registrationId,
}: {
  hackathonId: string;
  registrationId: string;
}) {
  const { data, isLoading } = useScreeningOverrides(hackathonId, registrationId);
  const overrides: ScreeningOverride[] = data?.data ?? [];

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <div className="flex items-center gap-2 mb-3">
        <RotateCcw className="h-4 w-4 text-muted-foreground" />
        <h5 className="font-display font-bold text-sm">Status History</h5>
        {overrides.length > 0 && (
          <Badge variant="outline" className="text-xs ml-auto">
            {overrides.length} {overrides.length === 1 ? "change" : "changes"}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="shimmer rounded-lg h-10 w-full" />
          ))}
        </div>
      ) : overrides.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-2">
          No manual status changes recorded.
        </p>
      ) : (
        <div className="relative space-y-0">
          {/* Timeline line */}
          <div className="absolute left-[7px] top-3 bottom-3 w-px bg-border" />

          {overrides.map((override) => {
            const prevConf = statusBadgeConfig[override.previous_status] || {
              variant: "muted" as const,
            };
            const newConf = statusBadgeConfig[override.new_status] || {
              variant: "muted" as const,
            };
            const overriderLabel =
              override.overrider?.full_name ||
              override.overrider?.email ||
              "Unknown";

            return (
              <div key={override.id} className="relative flex gap-3 pb-3 last:pb-0">
                {/* Timeline dot */}
                <div className="relative z-10 mt-1.5 h-[15px] w-[15px] shrink-0 rounded-full border-2 border-primary/40 bg-background flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant={prevConf.variant}
                      className="capitalize text-[10px] px-1.5 py-0 h-4"
                    >
                      {override.previous_status.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-muted-foreground text-xs">&rarr;</span>
                    <Badge
                      variant={newConf.variant}
                      className="capitalize text-[10px] px-1.5 py-0 h-4"
                    >
                      {override.new_status.replace(/_/g, " ")}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="text-[11px] text-muted-foreground">
                      by <span className="font-medium text-foreground/80">{overriderLabel}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {formatDate(override.created_at)}
                    </span>
                  </div>

                  {override.reason && (
                    <p className="text-xs text-muted-foreground mt-1 bg-muted/50 rounded px-2 py-1">
                      {override.reason}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Status Change Reason Dialog ─────────────────────────

function StatusChangeReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  targetStatus,
  actionLabel,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  targetStatus: string;
  actionLabel: string;
  isPending: boolean;
}) {
  const [reason, setReason] = React.useState("");

  // Reset reason when dialog opens
  React.useEffect(() => {
    if (open) setReason("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="font-display">
            Change Status to{" "}
            <Badge
              variant={
                (statusBadgeConfig[targetStatus] || { variant: "muted" as const })
                  .variant
              }
              className="capitalize text-xs ml-1"
            >
              {targetStatus.replace(/_/g, " ")}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Optionally provide a reason for this status change. This will be
            recorded in the audit trail.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
            Reason (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Overriding screening -- applicant provided additional documentation..."
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(reason)}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : null}
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────

export function ApplicationsTab({
  hackathon,
  hackathonId,
}: ApplicationsTabProps) {
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [expandedRow, setExpandedRow] = React.useState<string | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [reasonDialog, setReasonDialog] = React.useState<{
    open: boolean;
    registrationId: string;
    targetStatus: string;
    actionLabel: string;
  }>({ open: false, registrationId: "", targetStatus: "", actionLabel: "" });
  const [rsvpExpanded, setRsvpExpanded] = React.useState(true);
  const [sectorExpanded, setSectorExpanded] = React.useState(true);

  // Fetch RSVP stats
  const { data: rsvpData } = useHackathonRsvp(hackathonId);
  const rsvpStats = rsvpData?.data;
  const hasAcceptedApplicants = (rsvpStats?.total ?? 0) > 0;
  const confirmationRate =
    rsvpStats && rsvpStats.total > 0
      ? Math.round((rsvpStats.confirmed / rsvpStats.total) * 100)
      : 0;

  // Fetch applications (participants with form_data)
  const { data: applicationsData, isLoading } = useQuery<{
    data: ApplicationParticipant[];
  }>({
    queryKey: ["hackathon-applications", hackathonId, statusFilter, search],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("includeFormData", "true");
      if (statusFilter && statusFilter !== "all")
        params.set("status", statusFilter);
      if (search) params.set("search", search);
      return fetchJson(
        `/api/hackathons/${hackathonId}/participants?${params.toString()}`
      );
    },
    enabled: !!hackathonId,
  });

  // Fetch total application counts (unfiltered) for Publish button logic
  const { data: totalCountsData } = useQuery<{ data: ApplicationParticipant[] }>({
    queryKey: ["hackathon-applications-counts", hackathonId],
    queryFn: () => fetchJson(`/api/hackathons/${hackathonId}/participants`),
    enabled: !!hackathonId,
  });
  const totalApplications = totalCountsData?.data?.length ?? 0;
  const totalScreened = totalCountsData?.data?.filter((app: ApplicationParticipant) => !!app.screeningCompletedAt).length ?? 0;
  const allScreened = totalApplications > 0 && totalScreened >= totalApplications;

  // Update participant status mutation
  const updateStatus = useMutation({
    mutationFn: async ({
      registrationId,
      status,
      reason,
    }: {
      registrationId: string;
      status: string;
      reason?: string;
    }) => {
      const payload: Record<string, unknown> = { registrationId, status };
      if (reason) payload.reason = reason;
      const res = await fetch(
        `/api/hackathons/${hackathonId}/participants`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["hackathon-applications", hackathonId],
      });
      queryClient.invalidateQueries({
        queryKey: ["hackathon-applications-counts", hackathonId],
      });
      queryClient.invalidateQueries({
        queryKey: ["hackathon-participants", hackathonId],
      });
      queryClient.invalidateQueries({
        queryKey: ["screening-overrides", hackathonId],
      });
    },
  });

  // Delete applicant mutation (cancelled only)
  const deleteApplicant = useMutation({
    mutationFn: async (registrationId: string) => {
      const res = await fetch(
        `/api/hackathons/${hackathonId}/participants?registrationId=${registrationId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to delete applicant");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["hackathon-applications", hackathonId],
      });
      queryClient.invalidateQueries({
        queryKey: ["hackathon-applications-counts", hackathonId],
      });
      queryClient.invalidateQueries({
        queryKey: ["hackathon-participants", hackathonId],
      });
      toast.success("Applicant deleted successfully.");
    },
  });

  // Run screening mutation (new/unscreened only)
  const runScreening = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/hackathons/${hackathonId}/screen`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to run screening");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["hackathon-applications", hackathonId],
      });
      queryClient.invalidateQueries({
        queryKey: ["hackathon-applications-counts", hackathonId],
      });
      const d = data?.data;
      if (d?.screened === 0) {
        toast.info(d.message || "All applications have already been screened.");
      } else {
        const parts: string[] = [];
        if (d?.accepted) parts.push(`${d.accepted} accepted`);
        if (d?.waitlisted) parts.push(`${d.waitlisted} waitlisted`);
        if (d?.eligible) parts.push(`${d.eligible} eligible`);
        if (d?.ineligible) parts.push(`${d.ineligible} ineligible`);
        if (d?.underReview) parts.push(`${d.underReview} under review`);
        toast.success(`Screened ${d?.screened ?? 0} applications: ${parts.join(", ")}`);
      }
    },
    onError: () => {
      toast.error("Failed to run screening.");
    },
  });

  // Publish Results mutation & dialog state
  const [publishDialogOpen, setPublishDialogOpen] = React.useState(false);

  // Fetch unpublished count for the publish dialog
  const { data: unpublishedData, refetch: refetchUnpublished } = useQuery({
    queryKey: ["screening-unpublished", hackathonId],
    queryFn: async () => {
      const res = await fetch(`/api/hackathons/${hackathonId}/screen`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch unpublished count");
      }
      return res.json() as Promise<{
        data: {
          unpublished: number;
          accepted: number;
          waitlisted: number;
          eligible: number;
          ineligible: number;
          underReview: number;
          rejected: number;
        };
      }>;
    },
    enabled: !!hackathonId,
  });
  const unpublishedCount = unpublishedData?.data?.unpublished ?? 0;
  const unpublishedAccepted = unpublishedData?.data?.accepted ?? 0;
  const unpublishedWaitlisted = unpublishedData?.data?.waitlisted ?? 0;
  const unpublishedEligible = unpublishedData?.data?.eligible ?? 0;
  const unpublishedIneligible = unpublishedData?.data?.ineligible ?? 0;
  const unpublishedUnderReview = unpublishedData?.data?.underReview ?? 0;
  const unpublishedRejected = unpublishedData?.data?.rejected ?? 0;

  const publishResults = useMutation({
    mutationFn: async (opts?: { force?: boolean }) => {
      const res = await fetch(`/api/hackathons/${hackathonId}/screen`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: opts?.force ?? false }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to publish results");
      }
      return res.json() as Promise<{
        data: {
          published: number;
          accepted: number;
          waitlisted: number;
          eligible: number;
          ineligible: number;
          underReview: number;
          rejected: number;
          forced?: boolean;
          message?: string;
        };
      }>;
    },
    onSuccess: (data) => {
      setPublishDialogOpen(false);
      const d = data.data;
      if (d.published === 0) {
        toast.info(d.message || "No unpublished results to send.");
      } else {
        const parts: string[] = [];
        if (d.accepted > 0) parts.push(`${d.accepted} accepted`);
        if (d.waitlisted > 0) parts.push(`${d.waitlisted} waitlisted`);
        if (d.eligible > 0) parts.push(`${d.eligible} eligible`);
        if (d.ineligible > 0) parts.push(`${d.ineligible} ineligible`);
        if (d.rejected > 0) parts.push(`${d.rejected} rejected`);
        if (d.underReview > 0) parts.push(`${d.underReview} under review`);
        toast.success(
          `${d.forced ? "Resent" : "Published"} results: ${d.published} emails sent (${parts.join(", ")})`
        );
      }
      queryClient.invalidateQueries({
        queryKey: ["hackathon-applications"],
      });
      queryClient.invalidateQueries({
        queryKey: ["hackathon-applications-counts", hackathonId],
      });
      queryClient.invalidateQueries({
        queryKey: ["screening-unpublished", hackathonId],
      });
    },
    onError: (err: Error) => {
      setPublishDialogOpen(false);
      toast.error(err.message);
    },
  });

  // Bulk status update mutation
  const bulkUpdateStatus = useMutation({
    mutationFn: async ({
      registrationIds,
      status,
    }: {
      registrationIds: string[];
      status: string;
    }) => {
      const res = await fetch(
        `/api/hackathons/${hackathonId}/participants`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registrationIds, status }),
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update statuses");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["hackathon-applications", hackathonId],
      });
      queryClient.invalidateQueries({
        queryKey: ["hackathon-applications-counts", hackathonId],
      });
      queryClient.invalidateQueries({
        queryKey: ["hackathon-participants", hackathonId],
      });
      setSelectedIds(new Set());
      const count = data?.data?.updated ?? selectedIds.size;
      toast.success(`Updated ${count} applications successfully!`);
    },
    onError: () => {
      toast.error("Failed to update application statuses.");
    },
  });

  // Update internal notes mutation
  const updateNotes = useMutation({
    mutationFn: async ({
      registrationId,
      internalNotes,
    }: {
      registrationId: string;
      internalNotes: string;
    }) => {
      const res = await fetch(
        `/api/hackathons/${hackathonId}/participants`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registrationId, internalNotes }),
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update notes");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["hackathon-applications", hackathonId],
      });
      toast.success("Notes saved!");
    },
    onError: () => {
      toast.error("Failed to save notes.");
    },
  });

  const applications = applicationsData?.data ?? [];

  // Compute completeness score for each application based on required fields
  const computeCompleteness = React.useCallback(
    (formData: Record<string, unknown> | undefined): number => {
      if (!formData) return 0;
      const fields = hackathon.registrationFields.filter(
        (f) => f.type !== "heading" && f.type !== "paragraph"
      );
      if (fields.length === 0) return 100;
      const requiredFields = fields.filter((f) => f.required);
      if (requiredFields.length === 0) {
        // If no required fields, count how many of all fields are filled
        const filled = fields.filter((f) => {
          const val = formData[f.id];
          return val !== null && val !== undefined && val !== "";
        }).length;
        return Math.round((filled / fields.length) * 100);
      }
      const filled = requiredFields.filter((f) => {
        const val = formData[f.id];
        return val !== null && val !== undefined && val !== "";
      }).length;
      return Math.round((filled / requiredFields.length) * 100);
    },
    [hackathon.registrationFields]
  );

  // Enrich applications with computed completeness
  const enrichedApplications = React.useMemo(
    () =>
      applications.map((app) => ({
        ...app,
        completenessScore:
          app.completenessScore ?? computeCompleteness(app.formData),
      })),
    [applications, computeCompleteness]
  );

  // Status counts
  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    applications.forEach((app) => {
      counts[app.status] = (counts[app.status] || 0) + 1;
    });
    return counts;
  }, [applications]);

  const pendingCount = statusCounts["pending"] || 0;
  const eligibleCount =
    (statusCounts["eligible"] || 0) + (statusCounts["accepted"] || 0) + (statusCounts["approved"] || 0);
  const acceptedCount = statusCounts["accepted"] || 0;
  const ineligibleCount =
    (statusCounts["ineligible"] || 0) + (statusCounts["rejected"] || 0);
  const screenedCount = React.useMemo(
    () => applications.filter((app) => !!app.screeningCompletedAt).length,
    [applications]
  );

  // Sector distribution data
  const sectorDistribution = React.useMemo(() => {
    // Step 1: Find the sector field from the form schema
    // Check mappingKey first (deprecated but may still exist), then match by label
    const sectorField = hackathon.registrationFields.find(
      (f) => f.mappingKey === "sector"
    ) ?? hackathon.registrationFields.find(
      (f) =>
        (f.type === "select" || f.type === "radio") &&
        /sector|industry/i.test(f.label)
    );

    // Step 2: Fall back to scanning form_data for common field names
    const SECTOR_KEYS = ["sector", "industry", "business_sector", "startup_sector"];

    const counts: Record<string, number> = {};
    let total = 0;

    for (const app of applications) {
      if (!app.formData) continue;

      let sectorValue: unknown = undefined;

      if (sectorField) {
        sectorValue = app.formData[sectorField.id];
      } else {
        // Try common field names in form_data keys
        for (const key of SECTOR_KEYS) {
          if (app.formData[key] !== undefined && app.formData[key] !== null && app.formData[key] !== "") {
            sectorValue = app.formData[key];
            break;
          }
        }
        // Also try matching form field IDs that contain sector/industry
        if (sectorValue === undefined) {
          for (const field of hackathon.registrationFields) {
            if (
              (field.type === "select" || field.type === "radio" || field.type === "text") &&
              SECTOR_KEYS.some((k) => field.id.toLowerCase().includes(k) || field.label.toLowerCase().includes(k))
            ) {
              sectorValue = app.formData[field.id];
              if (sectorValue !== undefined && sectorValue !== null && sectorValue !== "") break;
            }
          }
        }
      }

      if (sectorValue !== null && sectorValue !== undefined && sectorValue !== "") {
        const label = String(sectorValue);
        counts[label] = (counts[label] || 0) + 1;
        total++;
      }
    }

    // Resolve display labels from field options if available
    const optionsMap = new Map<string, string>();
    if (sectorField?.options) {
      for (const opt of sectorField.options) {
        optionsMap.set(opt.value, opt.label);
      }
    }

    const entries = Object.entries(counts)
      .map(([value, count]) => ({
        label: optionsMap.get(value) || value,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return { entries, total, fieldLabel: sectorField?.label ?? "Sector" };
  }, [applications, hackathon.registrationFields]);

  // Extract applicant name/email from form_data or user profile
  const getApplicantInfo = (app: ApplicationParticipant) => {
    let name = app.user.name;
    let email = app.user.email;

    if (app.formData) {
      // Find name/email fields by type or label (no longer relies on mappingKey)
      const nameField = hackathon.registrationFields.find(
        (f) => f.type === "text" && /name/i.test(f.label)
      );
      const emailField = hackathon.registrationFields.find(
        (f) => f.type === "email"
      );
      if (nameField && app.formData[nameField.id]) {
        name = String(app.formData[nameField.id]);
      }
      if (emailField && app.formData[emailField.id]) {
        email = String(app.formData[emailField.id]);
      }
    }

    return { name, email };
  };

  // Handlers
  const handleStatusChange = async (
    registrationId: string,
    newStatus: string,
    label: string,
    reason?: string
  ) => {
    try {
      await updateStatus.mutateAsync({
        registrationId,
        status: newStatus,
        reason: reason || undefined,
      });
      toast.success(`Application ${label.toLowerCase()} successfully!`);
    } catch {
      toast.error("Failed to update application status.");
    }
  };

  const openReasonDialog = (
    registrationId: string,
    targetStatus: string,
    actionLabel: string
  ) => {
    setReasonDialog({ open: true, registrationId, targetStatus, actionLabel });
  };

  const handleRunScreening = () => {
    runScreening.mutate();
  };

  const handleExport = () => {
    const formFields = hackathon.registrationFields.filter(
      (f) => f.type !== "heading" && f.type !== "paragraph"
    );

    const headers = [
      "Name",
      "Email",
      "Status",
      "Completeness",
      "Flags",
      "Submitted",
      ...formFields.map((f) => f.label),
    ];

    const rows = enrichedApplications.map((app) => {
      const { name, email } = getApplicantInfo(app);
      const unresolvedFlags =
        app.flags?.filter((f) => !f.resolved).length || 0;

      return [
        `"${name}"`,
        email,
        app.status,
        `${app.completenessScore}%`,
        String(unresolvedFlags),
        app.createdAt,
        ...formFields.map((f) => {
          const val = app.formData?.[f.id];
          if (val === null || val === undefined) return "";
          if (Array.isArray(val)) return `"${val.join(", ")}"`;
          return `"${String(val).replace(/"/g, '""')}"`;
        }),
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${hackathon.slug || hackathonId}-applications.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Applications exported!");
  };

  const toggleExpand = (id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  };

  // Bulk selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === enrichedApplications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(enrichedApplications.map((a) => a.id)));
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    await bulkUpdateStatus.mutateAsync({
      registrationIds: Array.from(selectedIds),
      status: newStatus,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="font-display text-2xl font-bold">Applications</h2>
          <Badge variant="muted">{applications.length} Total</Badge>
          {pendingCount > 0 && (
            <Badge variant="warning" dot pulse>
              {pendingCount} Pending
            </Badge>
          )}
          {eligibleCount > 0 && (
            <Badge variant="success">{eligibleCount} Eligible</Badge>
          )}
          {acceptedCount > 0 && (
            <Badge variant="success" dot>
              {acceptedCount} Accepted
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunScreening}
            disabled={runScreening.isPending}
          >
            {runScreening.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            Run Screening
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-orange-500/50 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30"
            onClick={() => {
              refetchUnpublished();
              setPublishDialogOpen(true);
            }}
            disabled={
              publishResults.isPending ||
              totalApplications === 0
            }
            title={
              totalApplications > 0 && !allScreened
                ? `${totalApplications - totalScreened} applicant(s) have not been screened yet`
                : undefined
            }
          >
            {publishResults.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Megaphone className="h-4 w-4" />
            )}
            Publish Results
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="flex-1">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={selectClasses}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="eligible">Eligible</option>
          <option value="ineligible">Ineligible</option>
          <option value="accepted">Accepted</option>
          <option value="waitlisted">Waitlisted</option>
          <option value="rejected">Rejected</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </motion.div>

      {/* RSVP Tracking */}
      {hasAcceptedApplicants && rsvpStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-0">
              {/* Collapsible Header */}
              <button
                type="button"
                onClick={() => setRsvpExpanded((prev) => !prev)}
                className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/30 rounded-xl"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <UserCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-semibold">
                      RSVP Tracking
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {rsvpStats.confirmed} of {rsvpStats.total} accepted
                      applicants confirmed
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={confirmationRate >= 75 ? "success" : confirmationRate >= 40 ? "warning" : "destructive"}
                    className="text-xs"
                  >
                    {confirmationRate}% confirmed
                  </Badge>
                  {rsvpExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Collapsible Content */}
              <AnimatePresence initial={false}>
                {rsvpExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-4 px-5 pb-5">
                      {/* Stat Boxes */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="rounded-lg border border-blue-500/30 bg-blue-50 dark:bg-blue-950/20 p-3 text-center">
                          <Users className="mx-auto mb-1 h-4 w-4 text-blue-500" />
                          <p className="font-mono text-xl font-bold text-blue-600 dark:text-blue-400">
                            {rsvpStats.total}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Total Accepted
                          </p>
                        </div>
                        <div className="rounded-lg border border-green-500/30 bg-green-50 dark:bg-green-950/20 p-3 text-center">
                          <CheckCircle2 className="mx-auto mb-1 h-4 w-4 text-green-500" />
                          <p className="font-mono text-xl font-bold text-green-600 dark:text-green-400">
                            {rsvpStats.confirmed}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Confirmed
                          </p>
                        </div>
                        <div className="rounded-lg border border-yellow-500/30 bg-yellow-50 dark:bg-yellow-950/20 p-3 text-center">
                          <Clock className="mx-auto mb-1 h-4 w-4 text-yellow-500" />
                          <p className="font-mono text-xl font-bold text-yellow-600 dark:text-yellow-400">
                            {rsvpStats.pending}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Pending
                          </p>
                        </div>
                        <div className="rounded-lg border border-red-500/30 bg-red-50 dark:bg-red-950/20 p-3 text-center">
                          <XCircle className="mx-auto mb-1 h-4 w-4 text-red-500" />
                          <p className="font-mono text-xl font-bold text-red-600 dark:text-red-400">
                            {rsvpStats.declined}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Declined
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Confirmation Progress
                          </span>
                          <span className="font-mono font-medium text-foreground">
                            {rsvpStats.confirmed}/{rsvpStats.total}
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/50">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${confirmationRate}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                        {/* Segmented indicator */}
                        {rsvpStats.total > 0 && (
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                              Confirmed {Math.round((rsvpStats.confirmed / rsvpStats.total) * 100)}%
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
                              Pending {Math.round((rsvpStats.pending / rsvpStats.total) * 100)}%
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                              Declined {Math.round((rsvpStats.declined / rsvpStats.total) * 100)}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Deadline */}
                      {rsvpStats.deadline && (
                        <div className="flex items-center gap-2 rounded-lg border border-orange-500/20 bg-orange-50 dark:bg-orange-950/20 px-3 py-2">
                          <CalendarClock className="h-4 w-4 text-orange-500 shrink-0" />
                          <div className="text-sm text-orange-700 dark:text-orange-400">
                            <span className="font-medium">RSVP Deadline:</span>{" "}
                            {formatDate(rsvpStats.deadline)}
                            {(() => {
                              const deadlineDate = new Date(rsvpStats.deadline!);
                              const now = new Date();
                              const diffMs = deadlineDate.getTime() - now.getTime();
                              if (diffMs <= 0) {
                                return (
                                  <Badge variant="destructive" className="ml-2 text-xs">
                                    Expired
                                  </Badge>
                                );
                              }
                              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                              if (diffDays <= 3) {
                                return (
                                  <Badge variant="warning" className="ml-2 text-xs">
                                    {diffDays} day{diffDays !== 1 ? "s" : ""} left
                                  </Badge>
                                );
                              }
                              return (
                                <span className="ml-1 text-muted-foreground">
                                  ({diffDays} days left)
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3"
          >
            <span className="text-sm font-medium">
              {selectedIds.size} selected
            </span>
            <div className="h-4 w-px bg-border" />
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs text-green-600"
              onClick={() => handleBulkStatusChange("accepted")}
              disabled={bulkUpdateStatus.isPending}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Accept
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs text-red-600"
              onClick={() => handleBulkStatusChange("rejected")}
              disabled={bulkUpdateStatus.isPending}
            >
              <XCircle className="h-3 w-3 mr-1" />
              Reject
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs text-orange-600"
              onClick={() => handleBulkStatusChange("waitlisted")}
              disabled={bulkUpdateStatus.isPending}
            >
              <Clock className="h-3 w-3 mr-1" />
              Waitlist
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  More
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => handleBulkStatusChange("under_review")}>
                  <Eye className="h-4 w-4 mr-2" />
                  Under Review
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkStatusChange("pending")}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Pending
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleBulkStatusChange("cancelled")}
                  className="text-red-600"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear selection
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-5 gap-4"
      >
        <StatCard
          icon={ClipboardList}
          label="Total Applications"
          value={applications.length}
        />
        <StatCard
          icon={Shield}
          label={`Screened (${applications.length > 0 ? Math.round((screenedCount / applications.length) * 100) : 0}%)`}
          value={screenedCount}
          color="blue"
        />
        <StatCard
          icon={CheckCircle2}
          label="Eligible"
          value={eligibleCount}
          color="green"
        />
        <StatCard
          icon={XCircle}
          label="Ineligible / Rejected"
          value={ineligibleCount}
          color="red"
        />
        <StatCard
          icon={UserCheck}
          label="Accepted"
          value={acceptedCount}
          color="blue"
        />
      </motion.div>

      {/* Sector Distribution */}
      {sectorDistribution.entries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-0">
              {/* Collapsible Header */}
              <button
                type="button"
                onClick={() => setSectorExpanded((prev) => !prev)}
                className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/30 rounded-xl"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-semibold">
                      {sectorDistribution.fieldLabel} Distribution
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {sectorDistribution.entries.length} {sectorDistribution.entries.length === 1 ? "sector" : "sectors"} across {sectorDistribution.total} {sectorDistribution.total === 1 ? "application" : "applications"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs">
                    {sectorDistribution.entries.length} {sectorDistribution.entries.length === 1 ? "sector" : "sectors"}
                  </Badge>
                  {sectorExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Collapsible Content */}
              <AnimatePresence initial={false}>
                {sectorExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 px-5 pb-5">
                      {sectorDistribution.entries.map((sector, idx) => {
                        // Cycle through gradient color pairs for visual variety
                        const colorPairs = [
                          { bar: "from-primary to-primary/70", text: "text-primary", bg: "bg-primary/10" },
                          { bar: "from-accent to-accent/70", text: "text-accent", bg: "bg-accent/10" },
                          { bar: "from-blue-500 to-blue-400", text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
                          { bar: "from-emerald-500 to-emerald-400", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
                          { bar: "from-orange-500 to-orange-400", text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10" },
                          { bar: "from-purple-500 to-purple-400", text: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" },
                          { bar: "from-rose-500 to-rose-400", text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10" },
                          { bar: "from-cyan-500 to-cyan-400", text: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/10" },
                        ];
                        const colors = colorPairs[idx % colorPairs.length];

                        return (
                          <motion.div
                            key={sector.label}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.04, duration: 0.3 }}
                            className="group"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={cn(
                                  "inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold",
                                  colors.bg, colors.text
                                )}>
                                  {idx + 1}
                                </span>
                                <span className="text-sm font-medium truncate">
                                  {sector.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-3">
                                <span className="font-mono text-xs text-muted-foreground">
                                  {sector.count} {sector.count === 1 ? "app" : "apps"}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn("text-[10px] px-1.5 py-0 h-4 font-mono", colors.text)}
                                >
                                  {sector.percentage}%
                                </Badge>
                              </div>
                            </div>
                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/50">
                              <motion.div
                                className={cn("h-full rounded-full bg-gradient-to-r", colors.bar)}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(sector.percentage, 2)}%` }}
                                transition={{ duration: 0.6, delay: idx * 0.04, ease: "easeOut" }}
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Applications Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="shimmer rounded-lg h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-4 w-8" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={toggleSelectAll}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {selectedIds.size === enrichedApplications.length && enrichedApplications.length > 0 ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : selectedIds.size > 0 ? (
                              <MinusSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground w-8" />
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                          Applicant
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden md:table-cell">
                          Status
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">
                          Completeness
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">
                          Flags
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden md:table-cell">
                          Submitted
                        </th>
                        <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrichedApplications.map((app, i) => {
                        const { name, email } = getApplicantInfo(app);
                        const badgeConf = statusBadgeConfig[app.status] || {
                          variant: "muted" as const,
                        };
                        const statusActions = getStatusActions(app.status);
                        const unresolvedFlags =
                          app.flags?.filter((f) => !f.resolved).length || 0;
                        const isExpanded = expandedRow === app.id;

                        return (
                          <React.Fragment key={app.id}>
                            <motion.tr
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 + i * 0.03 }}
                              className={cn(
                                "border-b last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer",
                                isExpanded && "bg-muted/20"
                              )}
                              onClick={() => toggleExpand(app.id)}
                            >
                              {/* Checkbox */}
                              <td
                                className="p-4 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelect(app.id);
                                }}
                              >
                                {selectedIds.has(app.id) ? (
                                  <CheckSquare className="h-4 w-4 text-primary" />
                                ) : (
                                  <Square className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                                )}
                              </td>

                              {/* Expand indicator */}
                              <td className="p-4 w-8">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </td>

                              {/* Applicant */}
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <Avatar size="sm">
                                    <AvatarImage
                                      src={app.user.avatar}
                                      alt={name}
                                    />
                                    <AvatarFallback>
                                      {getInitials(name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">
                                      {name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {email}
                                    </p>
                                    {/* Screening failure indicators */}
                                    {app.screeningResults && app.screeningResults.length > 0 && (() => {
                                      const hardFails = app.screeningResults.filter(r => r.ruleType === "hard" && !r.passed);
                                      const softFails = app.screeningResults.filter(r => r.ruleType === "soft" && !r.passed);
                                      if (hardFails.length === 0 && softFails.length === 0) return null;
                                      return (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {hardFails.length > 0 && (
                                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                                              <XCircle className="h-2.5 w-2.5" />
                                              {hardFails.length} hard {hardFails.length === 1 ? "fail" : "fails"}
                                            </Badge>
                                          )}
                                          {softFails.length > 0 && (
                                            <Badge variant="warning" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                                              <AlertTriangle className="h-2.5 w-2.5" />
                                              {softFails.length} {softFails.length === 1 ? "flag" : "flags"}
                                            </Badge>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </td>

                              {/* Status */}
                              <td className="p-4 hidden md:table-cell">
                                <div className="flex items-center gap-1.5">
                                  <Badge
                                    variant={badgeConf.variant}
                                    className="capitalize text-xs"
                                  >
                                    {app.status.replace(/_/g, " ")}
                                  </Badge>
                                  {app.screeningCompletedAt && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5 text-muted-foreground">
                                      <Shield className="h-2.5 w-2.5" />
                                      Screened
                                    </Badge>
                                  )}
                                  {app.resultsPublishedAt && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5 text-green-600 border-green-300 dark:text-green-400 dark:border-green-700">
                                      <Mail className="h-2.5 w-2.5" />
                                      Email Sent
                                    </Badge>
                                  )}
                                </div>
                              </td>

                              {/* Completeness */}
                              <td className="p-4 hidden lg:table-cell">
                                <CompletenessBar
                                  score={app.completenessScore}
                                />
                              </td>

                              {/* Flags */}
                              <td className="p-4 hidden lg:table-cell">
                                {unresolvedFlags > 0 ? (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    {unresolvedFlags}{" "}
                                    {unresolvedFlags === 1 ? "flag" : "flags"}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    None
                                  </span>
                                )}
                              </td>

                              {/* Submitted */}
                              <td className="p-4 text-sm text-muted-foreground hidden md:table-cell">
                                {formatDate(app.createdAt)}
                              </td>

                              {/* Actions */}
                              <td
                                className="p-4 text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {/* Status pipeline actions */}
                                    {statusActions.map((action) => (
                                      <DropdownMenuItem
                                        key={action.targetStatus}
                                        onClick={() =>
                                          openReasonDialog(
                                            app.id,
                                            action.targetStatus,
                                            action.label
                                          )
                                        }
                                        disabled={updateStatus.isPending}
                                        className={action.className}
                                      >
                                        <action.icon className="h-4 w-4 mr-2" />
                                        {action.label}
                                      </DropdownMenuItem>
                                    ))}

                                    {statusActions.length > 0 && (
                                      <DropdownMenuSeparator />
                                    )}

                                    {/* Common actions */}
                                    <DropdownMenuItem
                                      onClick={() => {
                                        if (app.user.username) {
                                          window.open(
                                            `/profile/${app.user.username}`,
                                            "_blank"
                                          );
                                        } else {
                                          toast.info(
                                            "This user has no public profile."
                                          );
                                        }
                                      }}
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        window.location.href = `mailto:${email}`;
                                      }}
                                    >
                                      <Mail className="h-4 w-4 mr-2" />
                                      Send Email
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        navigator.clipboard.writeText(email);
                                        toast.success(
                                          "Email copied to clipboard!"
                                        );
                                      }}
                                    >
                                      <Mail className="h-4 w-4 mr-2" />
                                      Copy Email
                                    </DropdownMenuItem>
                                    {app.status === "cancelled" && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => {
                                            if (confirm("Are you sure you want to permanently delete this applicant? This cannot be undone.")) {
                                              deleteApplicant.mutate(app.id);
                                            }
                                          }}
                                          disabled={deleteApplicant.isPending}
                                          className="text-red-600"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete Applicant
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </motion.tr>

                            {/* Expanded Detail Row */}
                            <AnimatePresence>
                              {isExpanded && (
                                <tr>
                                  <td colSpan={8} className="p-0">
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="px-6 py-5 bg-muted/10 border-b">
                                        <div className="flex items-center gap-2 mb-4">
                                          <FileText className="h-4 w-4 text-muted-foreground" />
                                          <h4 className="font-display font-bold text-sm">
                                            Application Details
                                          </h4>
                                          <Badge
                                            variant={badgeConf.variant}
                                            className="capitalize text-xs ml-auto"
                                          >
                                            {app.status.replace(/_/g, " ")}
                                          </Badge>
                                        </div>

                                        {app.formData &&
                                        hackathon.registrationFields.length >
                                          0 ? (
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {hackathon.registrationFields
                                              .filter(
                                                (f) =>
                                                  f.type !== "heading" &&
                                                  f.type !== "paragraph"
                                              )
                                              .sort(
                                                (a, b) => a.order - b.order
                                              )
                                              .map((field) => (
                                                <div
                                                  key={field.id}
                                                  className={cn(
                                                    "space-y-1",
                                                    field.type === "textarea" &&
                                                      "md:col-span-2"
                                                  )}
                                                >
                                                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                    {field.label}
                                                    {field.required && (
                                                      <span className="text-destructive ml-0.5">
                                                        *
                                                      </span>
                                                    )}
                                                  </label>
                                                  <div className="bg-background rounded-lg border border-border/50 px-3 py-2">
                                                    {renderFormValue(
                                                      field,
                                                      app.formData?.[field.id]
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                          </div>
                                        ) : (
                                          <div className="text-center py-6">
                                            <p className="text-sm text-muted-foreground">
                                              No form data available for this
                                              application.
                                            </p>
                                          </div>
                                        )}

                                        {/* Screening Results Breakdown */}
                                        {app.screeningResults && app.screeningResults.length > 0 && (() => {
                                          const hardFails = app.screeningResults.filter(r => r.ruleType === "hard" && !r.passed);
                                          const softFails = app.screeningResults.filter(r => r.ruleType === "soft" && !r.passed);
                                          const allPassed = hardFails.length === 0 && softFails.length === 0;
                                          return (
                                            <div className="mt-4 pt-4 border-t border-border/50">
                                              <div className="flex items-center gap-2 mb-3">
                                                <Shield className="h-4 w-4 text-muted-foreground" />
                                                <h5 className="font-display font-bold text-sm">Screening Results</h5>
                                                {allPassed ? (
                                                  <Badge variant="success" className="text-xs ml-auto">All Passed</Badge>
                                                ) : (
                                                  <Badge variant="destructive" className="text-xs ml-auto">
                                                    {hardFails.length + softFails.length} {hardFails.length + softFails.length === 1 ? "issue" : "issues"}
                                                  </Badge>
                                                )}
                                              </div>
                                              {!allPassed && (
                                                <div className="space-y-2">
                                                  {hardFails.map((r) => (
                                                    <div key={r.ruleId} className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-3 py-2">
                                                      <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                                                      <div className="min-w-0">
                                                        <p className="text-xs font-medium text-red-700 dark:text-red-400">
                                                          Hard Rule Failed: {r.ruleName}
                                                        </p>
                                                        <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5">
                                                          {r.reason}
                                                        </p>
                                                      </div>
                                                    </div>
                                                  ))}
                                                  {softFails.map((r) => (
                                                    <div key={r.ruleId} className="flex items-start gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/50 px-3 py-2">
                                                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                                                      <div className="min-w-0">
                                                        <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
                                                          Soft Flag: {r.ruleName}
                                                        </p>
                                                        <p className="text-xs text-yellow-600/80 dark:text-yellow-400/70 mt-0.5">
                                                          {r.reason}
                                                        </p>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })()}

                                        {/* Internal Notes */}
                                        <InternalNotesEditor
                                          registrationId={app.id}
                                          initialNotes={app.internalNotes || ""}
                                          onSave={(notes) =>
                                            updateNotes.mutate({
                                              registrationId: app.id,
                                              internalNotes: notes,
                                            })
                                          }
                                          isSaving={updateNotes.isPending}
                                        />

                                        {/* Override / Status History */}
                                        <OverrideHistorySection
                                          hackathonId={hackathonId}
                                          registrationId={app.id}
                                        />

                                        {/* Quick actions in expanded view */}
                                        {statusActions.length > 0 && (
                                          <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border/50">
                                            <span className="text-xs text-muted-foreground mr-2">
                                              Quick actions:
                                            </span>
                                            {statusActions.map((action) => (
                                              <Button
                                                key={action.targetStatus}
                                                variant="outline"
                                                size="sm"
                                                className={cn(
                                                  "h-7 text-xs",
                                                  action.className
                                                )}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  openReasonDialog(
                                                    app.id,
                                                    action.targetStatus,
                                                    action.label
                                                  );
                                                }}
                                                disabled={
                                                  updateStatus.isPending
                                                }
                                              >
                                                <action.icon className="h-3 w-3 mr-1" />
                                                {action.label}
                                              </Button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  </td>
                                </tr>
                              )}
                            </AnimatePresence>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Empty State */}
                {enrichedApplications.length === 0 && !isLoading && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
                      <ClipboardList className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-display text-lg font-bold mb-1">
                      No applications found
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {search || statusFilter !== "all"
                        ? "No applications match your current filters. Try adjusting your search."
                        : "Applications will appear here once participants register with form data."}
                    </p>
                    {(search || statusFilter !== "all") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearch("");
                          setStatusFilter("all");
                        }}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Publish Screening Results Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Publish Screening Results
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">
                  This will send email notifications to{" "}
                  <strong className="text-foreground">
                    {unpublishedCount} applicant{unpublishedCount !== 1 ? "s" : ""}
                  </strong>{" "}
                  with their screening results:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="rounded-lg border border-green-500/30 bg-green-50 dark:bg-green-950/20 p-2.5 text-center">
                    <p className="font-mono text-lg font-bold text-green-600 dark:text-green-400">
                      {unpublishedAccepted}
                    </p>
                    <p className="text-xs text-muted-foreground">Accepted</p>
                  </div>
                  <div className="rounded-lg border border-orange-500/30 bg-orange-50 dark:bg-orange-950/20 p-2.5 text-center">
                    <p className="font-mono text-lg font-bold text-orange-600 dark:text-orange-400">
                      {unpublishedWaitlisted}
                    </p>
                    <p className="text-xs text-muted-foreground">Waitlisted</p>
                  </div>
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-2.5 text-center">
                    <p className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {unpublishedEligible}
                    </p>
                    <p className="text-xs text-muted-foreground">Eligible</p>
                  </div>
                  <div className="rounded-lg border border-red-500/30 bg-red-50 dark:bg-red-950/20 p-2.5 text-center">
                    <p className="font-mono text-lg font-bold text-red-600 dark:text-red-400">
                      {unpublishedRejected}
                    </p>
                    <p className="text-xs text-muted-foreground">Rejected</p>
                  </div>
                  <div className="rounded-lg border border-red-500/30 bg-red-50 dark:bg-red-950/20 p-2.5 text-center">
                    <p className="font-mono text-lg font-bold text-red-600 dark:text-red-400">
                      {unpublishedIneligible}
                    </p>
                    <p className="text-xs text-muted-foreground">Ineligible</p>
                  </div>
                  <div className="rounded-lg border border-yellow-500/30 bg-yellow-50 dark:bg-yellow-950/20 p-2.5 text-center">
                    <p className="font-mono text-lg font-bold text-yellow-600 dark:text-yellow-400">
                      {unpublishedUnderReview}
                    </p>
                    <p className="text-xs text-muted-foreground">Under Review</p>
                  </div>
                </div>

                <div className="rounded-lg border border-orange-500/20 bg-orange-50 dark:bg-orange-950/20 p-3">
                  <p className="text-sm text-orange-700 dark:text-orange-400">
                    <strong>Warning:</strong> This action cannot be undone. Once
                    published, applicants will receive an email and in-app
                    notification.
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button
              variant="ghost"
              onClick={() => setPublishDialogOpen(false)}
              disabled={publishResults.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              className="border-orange-400/50 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30"
              onClick={() => publishResults.mutate({ force: true })}
              disabled={publishResults.isPending || totalScreened === 0}
              title="Resend emails to all screened applicants, including those already notified"
            >
              {publishResults.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Force Resend All
            </Button>
            <Button
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
              onClick={() => publishResults.mutate({})}
              disabled={publishResults.isPending || unpublishedCount === 0}
            >
              {publishResults.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Megaphone className="mr-2 h-4 w-4" />
              )}
              {publishResults.isPending ? "Publishing..." : `Publish Results (${unpublishedCount})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Reason Dialog */}
      <StatusChangeReasonDialog
        open={reasonDialog.open}
        onOpenChange={(open) =>
          setReasonDialog((prev) => ({ ...prev, open }))
        }
        targetStatus={reasonDialog.targetStatus}
        actionLabel={reasonDialog.actionLabel}
        isPending={updateStatus.isPending}
        onConfirm={async (reason) => {
          await handleStatusChange(
            reasonDialog.registrationId,
            reasonDialog.targetStatus,
            reasonDialog.actionLabel,
            reason
          );
          setReasonDialog((prev) => ({ ...prev, open: false }));
        }}
      />
    </div>
  );
}
