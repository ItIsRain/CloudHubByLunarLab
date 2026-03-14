"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  ClipboardList,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  ExternalLink,
  Play,
  Pause,
  Archive,
  Loader2,
  Filter,
  BarChart3,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import {
  useCompetitionForms,
  useApplications,
  useScreeningDashboard,
  useRunScreening,
  useUpdateApplication,
} from "@/hooks/use-competitions";
import type { CompetitionForm, CompetitionApplication } from "@/lib/types";

type SubView = "list" | "detail" | "applications" | "screening";

export function CompetitionsTab() {
  const [subView, setSubView] = React.useState<SubView>("list");
  const [selectedForm, setSelectedForm] = React.useState<CompetitionForm | null>(null);

  const openForm = (form: CompetitionForm) => {
    setSelectedForm(form);
    setSubView("applications");
  };

  if (subView === "applications" && selectedForm) {
    return (
      <ApplicationsView
        form={selectedForm}
        onBack={() => { setSubView("list"); setSelectedForm(null); }}
        onOpenScreening={() => setSubView("screening")}
      />
    );
  }

  if (subView === "screening" && selectedForm) {
    return (
      <ScreeningView
        form={selectedForm}
        onBack={() => setSubView("applications")}
      />
    );
  }

  return <FormsList onSelect={openForm} />;
}

// ── Forms List ──────────────────────────────────────────

function FormsList({ onSelect }: { onSelect: (form: CompetitionForm) => void }) {
  const { data, isLoading } = useCompetitionForms(true);
  const forms = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">Competition Forms</h2>
          <p className="text-sm text-muted-foreground">Manage application forms and review submissions</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/competitions/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Form
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : forms.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="font-display text-lg font-bold mb-1">No competition forms yet</h3>
            <p className="text-muted-foreground mb-4">Create your first application form to start collecting submissions.</p>
            <Button asChild>
              <Link href="/dashboard/competitions/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Form
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {forms.map((form, i) => (
            <motion.div
              key={form.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card hover className="cursor-pointer" onClick={() => onSelect(form)}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-bold truncate">{form.title}</h3>
                        <StatusBadge status={form.status} />
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{form.competitionName}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {form.opensAt && <span>Opens: {formatDate(form.opensAt)}</span>}
                        {form.closesAt && <span>Closes: {formatDate(form.closesAt)}</span>}
                        <span>Type: {form.competitionType}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="ghost" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                        <Link href={`/apply/${form.slug}`} target="_blank">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Applications View ───────────────────────────────────

function ApplicationsView({
  form,
  onBack,
  onOpenScreening,
}: {
  form: CompetitionForm;
  onBack: () => void;
  onOpenScreening: () => void;
}) {
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [campusFilter, setCampusFilter] = React.useState<string>("");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const { data, isLoading } = useApplications(form.id, {
    status: statusFilter || undefined,
    campus: campusFilter || undefined,
    search: search || undefined,
    page,
    pageSize: 25,
  });

  const applications = data?.data || [];
  const pagination = data?.pagination;

  const updateApp = useUpdateApplication();

  const handleStatusChange = async (app: CompetitionApplication, newStatus: string) => {
    try {
      await updateApp.mutateAsync({
        formId: form.id,
        applicationId: app.id,
        status: newStatus,
      });
    } catch { /* handled by mutation */ }
  };

  const statuses = [
    "", "submitted", "under_review", "eligible", "ineligible",
    "accepted", "waitlisted", "rejected", "confirmed", "declined",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground mb-1 flex items-center gap-1">
            ← Back to Forms
          </button>
          <h2 className="font-display text-xl font-bold">{form.title}</h2>
          <p className="text-sm text-muted-foreground">{form.competitionName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onOpenScreening}>
            <Shield className="mr-2 h-4 w-4" />
            Screening
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/apply/${form.slug}`} target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Form
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, or startup..."
            className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>{s || "All Statuses"}</option>
          ))}
        </select>

        <select
          value={campusFilter}
          onChange={(e) => { setCampusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">All Campuses</option>
          <option value="Abu Dhabi">Abu Dhabi</option>
          <option value="Al Ain">Al Ain</option>
          <option value="Al Dhafra">Al Dhafra</option>
        </select>
      </div>

      {/* Applications Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : applications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="font-display text-lg font-bold mb-1">No applications found</h3>
            <p className="text-muted-foreground">
              {search || statusFilter || campusFilter
                ? "Try adjusting your filters."
                : "Applications will appear here once submitted."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-medium px-4 py-3">Applicant</th>
                    <th className="text-left font-medium px-4 py-3">Startup</th>
                    <th className="text-left font-medium px-4 py-3">Campus</th>
                    <th className="text-left font-medium px-4 py-3">Status</th>
                    <th className="text-left font-medium px-4 py-3">Score</th>
                    <th className="text-left font-medium px-4 py-3">Flags</th>
                    <th className="text-left font-medium px-4 py-3">Submitted</th>
                    <th className="text-left font-medium px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{app.applicantName}</p>
                          <p className="text-xs text-muted-foreground">{app.applicantEmail}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{app.startupName || "—"}</td>
                      <td className="px-4 py-3">
                        {app.campus ? <Badge variant="outline">{app.campus}</Badge> : "—"}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "font-mono text-xs",
                          app.completenessScore >= 80 ? "text-green-600" :
                          app.completenessScore >= 50 ? "text-yellow-600" : "text-muted-foreground"
                        )}>
                          {app.completenessScore.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {(app.flags?.filter((f) => !f.resolved).length || 0) > 0 ? (
                          <Badge variant="destructive" className="text-xs">
                            {app.flags?.filter((f) => !f.resolved).length} flags
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {app.submittedAt ? formatDate(app.submittedAt) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {app.status === "eligible" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-green-600"
                                onClick={() => handleStatusChange(app, "accepted")}
                                disabled={updateApp.isPending}
                              >
                                Accept
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-orange-600"
                                onClick={() => handleStatusChange(app, "waitlisted")}
                                disabled={updateApp.isPending}
                              >
                                Waitlist
                              </Button>
                            </>
                          )}
                          {app.status === "submitted" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleStatusChange(app, "under_review")}
                              disabled={updateApp.isPending}
                            >
                              Review
                            </Button>
                          )}
                          {(app.status === "submitted" || app.status === "under_review" || app.status === "eligible" || app.status === "ineligible") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive"
                              onClick={() => handleStatusChange(app, "rejected")}
                              disabled={updateApp.isPending}
                            >
                              Reject
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Showing {((page - 1) * 25) + 1}–{Math.min(page * 25, pagination.total)} of {pagination.total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Screening View ──────────────────────────────────────

function ScreeningView({
  form,
  onBack,
}: {
  form: CompetitionForm;
  onBack: () => void;
}) {
  const { data: screeningData, isLoading } = useScreeningDashboard(form.id);
  const runScreening = useRunScreening();
  const dashboard = screeningData?.data;

  const handleRunScreening = async () => {
    try {
      await runScreening.mutateAsync(form.id);
    } catch { /* handled */ }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground mb-1 flex items-center gap-1">
            ← Back to Applications
          </button>
          <h2 className="font-display text-xl font-bold">Screening Dashboard</h2>
          <p className="text-sm text-muted-foreground">{form.competitionName}</p>
        </div>
        <Button onClick={handleRunScreening} disabled={runScreening.isPending}>
          {runScreening.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Run Screening
        </Button>
      </div>

      {runScreening.data && (
        <Card className="border-green-500/30 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              Screening complete: {runScreening.data.data.screened} screened,{" "}
              {runScreening.data.data.eligible} eligible,{" "}
              {runScreening.data.data.ineligible} ineligible,{" "}
              {runScreening.data.data.flagged} flagged
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : dashboard ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={ClipboardList}
              label="Total Applications"
              value={dashboard.totalApplications as number}
            />
            <StatCard
              icon={CheckCircle2}
              label="Eligible"
              value={(dashboard.statusCounts as Record<string, number>)?.eligible || 0}
              color="green"
            />
            <StatCard
              icon={XCircle}
              label="Ineligible"
              value={(dashboard.statusCounts as Record<string, number>)?.ineligible || 0}
              color="red"
            />
            <StatCard
              icon={AlertTriangle}
              label="Unresolved Flags"
              value={dashboard.unresolvedFlags as number}
              color="orange"
            />
          </div>

          {/* Status Breakdown */}
          <Card>
            <CardContent className="p-5">
              <h3 className="font-display font-bold mb-4">Status Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries((dashboard.statusCounts as Record<string, number>) || {}).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <span className="text-xs capitalize">{status.replace(/_/g, " ")}</span>
                    <span className="font-mono font-bold text-sm">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Campus Distribution */}
          {Array.isArray(dashboard.campusSummary) && (dashboard.campusSummary as Array<Record<string, unknown>>).length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h3 className="font-display font-bold mb-4">Campus Distribution</h3>
                <div className="space-y-4">
                  {(dashboard.campusSummary as Array<Record<string, unknown>>).map((campus) => {
                    const quota = (dashboard.quotas as Array<Record<string, unknown>>)?.find(
                      (q) => q.campus === campus.campus
                    );
                    const accepted = Number(campus.accepted || 0) + Number(campus.confirmed || 0);
                    const total = Number(campus.total_submitted || 0);
                    const quotaNum = Number(quota?.quota || 0);
                    const progress = quotaNum > 0 ? (accepted / quotaNum) * 100 : 0;

                    return (
                      <div key={campus.campus as string}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{campus.campus as string}</span>
                          <span className="text-xs text-muted-foreground">
                            {accepted} accepted / {total} total
                            {quotaNum > 0 && ` (quota: ${quotaNum})`}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              progress >= 100 ? "bg-green-500" :
                              progress >= 70 ? "bg-yellow-500" : "bg-primary"
                            )}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Flag Summary */}
          {dashboard.flagCounts && Object.keys(dashboard.flagCounts as Record<string, unknown>).length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h3 className="font-display font-bold mb-4">Screening Flags</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(dashboard.flagCounts as Record<string, { total: number; unresolved: number }>).map(([type, counts]) => (
                    <div key={type} className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground capitalize mb-1">
                        {type.replace(/_/g, " ")}
                      </p>
                      <p className="font-mono font-bold">{counts.total}</p>
                      {counts.unresolved > 0 && (
                        <p className="text-xs text-destructive">{counts.unresolved} unresolved</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "outline" | "destructive" | "muted"; label: string }> = {
    draft: { variant: "muted", label: "Draft" },
    published: { variant: "default", label: "Published" },
    closed: { variant: "secondary", label: "Closed" },
    archived: { variant: "muted", label: "Archived" },
    submitted: { variant: "outline", label: "Submitted" },
    under_review: { variant: "secondary", label: "Under Review" },
    eligible: { variant: "default", label: "Eligible" },
    ineligible: { variant: "destructive", label: "Ineligible" },
    accepted: { variant: "default", label: "Accepted" },
    waitlisted: { variant: "secondary", label: "Waitlisted" },
    rejected: { variant: "destructive", label: "Rejected" },
    confirmed: { variant: "default", label: "Confirmed" },
    declined: { variant: "muted", label: "Declined" },
    withdrawn: { variant: "muted", label: "Withdrawn" },
  };

  const config = variants[status] || { variant: "muted" as const, label: status };
  return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color?: "green" | "red" | "orange";
}) {
  const colorClasses = {
    green: "text-green-600 bg-green-100 dark:bg-green-900/30",
    red: "text-red-600 bg-red-100 dark:bg-red-900/30",
    orange: "text-orange-600 bg-orange-100 dark:bg-orange-900/30",
  };

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", color ? colorClasses[color] : "bg-primary/10 text-primary")}>
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
