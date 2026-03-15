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
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
    case "file":
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary underline hover:text-primary/80"
        >
          View file
        </a>
      );
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

// ── Main Component ─────────────────────────────────────

export function ApplicationsTab({
  hackathon,
  hackathonId,
}: ApplicationsTabProps) {
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [expandedRow, setExpandedRow] = React.useState<string | null>(null);

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
        queryKey: ["hackathon-participants", hackathonId],
      });
    },
  });

  // Run screening mutation
  const runScreening = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/hackathons/${hackathonId}/screen`,
        { method: "POST" }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to run screening");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["hackathon-applications", hackathonId],
      });
      toast.success("Screening completed successfully!");
    },
    onError: () => {
      toast.error("Failed to run screening.");
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

  // Extract applicant name/email from form_data or user profile
  const getApplicantInfo = (app: ApplicationParticipant) => {
    let name = app.user.name;
    let email = app.user.email;

    if (app.formData) {
      const nameField = hackathon.registrationFields.find(
        (f) => f.mappingKey === "applicant_name"
      );
      const emailField = hackathon.registrationFields.find(
        (f) => f.mappingKey === "applicant_email"
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

  const handleRunScreening = async () => {
    await runScreening.mutateAsync();
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
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunScreening}
            disabled={runScreening.isPending}
          >
            {runScreening.isPending ? (
              <Play className="h-4 w-4 animate-spin" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            Run Screening
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

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard
          icon={ClipboardList}
          label="Total Applications"
          value={applications.length}
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
                                  </div>
                                </div>
                              </td>

                              {/* Status */}
                              <td className="p-4 hidden md:table-cell">
                                <Badge
                                  variant={badgeConf.variant}
                                  className="capitalize text-xs"
                                >
                                  {app.status.replace(/_/g, " ")}
                                </Badge>
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
                                  <td colSpan={7} className="p-0">
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
    </div>
  );
}
