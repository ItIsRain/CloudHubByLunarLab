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
    }: {
      registrationId: string;
      status: string;
    }) => {
      const res = await fetch(
        `/api/hackathons/${hackathonId}/participants`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registrationId, status }),
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

  const publishResults = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/hackathons/${hackathonId}/screen`, {
        method: "PATCH",
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
        if (d.underReview > 0) parts.push(`${d.underReview} under review`);
        toast.success(
          `Published results: ${d.published} emails sent (${parts.join(", ")})`
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
  const eligibleCount = statusCounts["eligible"] || 0;
  const acceptedCount = statusCounts["accepted"] || 0;
  const ineligibleCount =
    (statusCounts["ineligible"] || 0) + (statusCounts["rejected"] || 0);
  const screenedCount = React.useMemo(
    () => applications.filter((app) => !!app.screeningCompletedAt).length,
    [applications]
  );

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
    label: string
  ) => {
    try {
      await updateStatus.mutateAsync({ registrationId, status: newStatus });
      toast.success(`Application ${label.toLowerCase()} successfully!`);
    } catch {
      toast.error("Failed to update application status.");
    }
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
              totalApplications === 0 ||
              !allScreened
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
                                          handleStatusChange(
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
                                                  handleStatusChange(
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
        <DialogContent className="sm:max-w-md">
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

                <div className="grid grid-cols-5 gap-2">
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
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setPublishDialogOpen(false)}
              disabled={publishResults.isPending}
            >
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
              onClick={() => publishResults.mutate()}
              disabled={publishResults.isPending || unpublishedCount === 0}
            >
              {publishResults.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Megaphone className="mr-2 h-4 w-4" />
              )}
              {publishResults.isPending ? "Publishing..." : "Publish Results"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
