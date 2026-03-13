"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  XCircle,
  Search as SearchIcon,
  FileWarning,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import {
  useAdminReports,
  useUpdateReport,
  useDeleteReport,
} from "@/hooks/use-admin-reports";
import type { Report, ReportType, ReportStatus } from "@/lib/types";

// ---------------------------------------------------------------------------
// Badge color maps
// ---------------------------------------------------------------------------

const typeColors: Record<ReportType, "default" | "destructive" | "warning" | "secondary"> = {
  event: "default",
  hackathon: "warning",
  user: "destructive",
  comment: "secondary",
};

const statusColors: Record<ReportStatus, "warning" | "default" | "success" | "secondary"> = {
  pending: "warning",
  reviewing: "default",
  resolved: "success",
  dismissed: "secondary",
};

// ---------------------------------------------------------------------------
// Filter options
// ---------------------------------------------------------------------------

const TYPE_OPTIONS: readonly ("all" | ReportType)[] = [
  "all",
  "event",
  "hackathon",
  "user",
  "comment",
] as const;

const STATUS_OPTIONS: readonly ("all" | ReportStatus)[] = [
  "all",
  "pending",
  "reviewing",
  "resolved",
  "dismissed",
] as const;

const TYPE_LABELS: Record<string, string> = {
  all: "All",
  event: "Event",
  hackathon: "Hackathon",
  user: "User",
  comment: "Comment",
};

const STATUS_LABELS: Record<string, string> = {
  all: "All",
  pending: "Pending",
  reviewing: "Reviewing",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

const PAGE_SIZE = 12;

// ---------------------------------------------------------------------------
// Shimmer skeleton for loading state
// ---------------------------------------------------------------------------

function ShimmerCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="shimmer h-5 w-20 rounded-full" />
              <div className="shimmer h-5 w-16 rounded-full" />
            </div>
            <div className="shimmer h-4 w-3/4 rounded" />
            <div className="space-y-1">
              <div className="shimmer h-3 w-full rounded" />
              <div className="shimmer h-3 w-2/3 rounded" />
            </div>
            <div className="flex justify-between">
              <div className="shimmer h-3 w-24 rounded" />
              <div className="shimmer h-3 w-20 rounded" />
            </div>
            <div className="flex gap-2 pt-1">
              <div className="shimmer h-8 flex-1 rounded" />
              <div className="shimmer h-8 w-8 rounded" />
              <div className="shimmer h-8 w-8 rounded" />
              <div className="shimmer h-8 w-8 rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReportsTab() {
  // Filters & pagination
  const [typeFilter, setTypeFilter] = React.useState<"all" | ReportType>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | ReportStatus>("all");
  const [page, setPage] = React.useState(1);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    variant: "default" | "destructive";
    confirmLabel: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    variant: "default",
    confirmLabel: "Confirm",
    onConfirm: () => {},
  });

  // Expanded card state for showing details
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [typeFilter, statusFilter]);

  // Data hooks
  const { data: reportsData, isLoading } = useAdminReports({
    type: typeFilter === "all" ? undefined : typeFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    page,
    pageSize: PAGE_SIZE,
  });

  const updateReport = useUpdateReport();
  const deleteReport = useDeleteReport();

  const reports = reportsData?.data ?? [];
  const total = reportsData?.total ?? 0;
  const totalPages = reportsData?.totalPages ?? 0;

  // Actions
  const handleReview = (report: Report) => {
    updateReport.mutateAsync({ reportId: report.id, status: "reviewing" });
  };

  const handleDismiss = (report: Report) => {
    setConfirmDialog({
      open: true,
      title: "Dismiss Report",
      description: `Are you sure you want to dismiss the report for "${report.entityTitle}"? This marks the report as not requiring action.`,
      variant: "default",
      confirmLabel: "Dismiss",
      onConfirm: () => {
        updateReport.mutateAsync({ reportId: report.id, status: "dismissed" });
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  };

  const handleResolve = (report: Report) => {
    setConfirmDialog({
      open: true,
      title: "Take Action",
      description: `Are you sure you want to resolve the report for "${report.entityTitle}"? This will mark the report as resolved with action taken.`,
      variant: "destructive",
      confirmLabel: "Take Action",
      onConfirm: () => {
        updateReport.mutateAsync({
          reportId: report.id,
          status: "resolved",
          resolutionNote: "Action taken by admin",
        });
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  };

  const handleDelete = (report: Report) => {
    setConfirmDialog({
      open: true,
      title: "Delete Report",
      description: `Are you sure you want to permanently delete the report for "${report.entityTitle}"? This action cannot be undone.`,
      variant: "destructive",
      confirmLabel: "Delete",
      onConfirm: () => {
        deleteReport.mutateAsync(report.id);
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* Filters */}
      <div className="space-y-3 mb-6">
        {/* Type filter */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-muted-foreground self-center mr-1">
            Type:
          </span>
          {TYPE_OPTIONS.map((type) => (
            <Button
              key={type}
              variant={typeFilter === type ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(type)}
              className="capitalize"
            >
              {TYPE_LABELS[type]}
            </Button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-muted-foreground self-center mr-1">
            Status:
          </span>
          {STATUS_OPTIONS.map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="capitalize"
            >
              {STATUS_LABELS[status]}
            </Button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <ShimmerCards />
      ) : reports.length === 0 ? (
        /* Empty state */
        <Card>
          <CardContent className="py-16 text-center">
            <FileWarning className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold mb-2">No Reports Found</h3>
            <p className="text-muted-foreground text-sm">
              No reports match the selected filters. Try selecting a different category or
              status.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Results summary */}
          <p className="text-xs text-muted-foreground mb-4">
            Showing {reports.length} of {total} report{total !== 1 ? "s" : ""}
          </p>

          {/* Report Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((report, i) => {
              const isExpanded = expandedId === report.id;
              const isTerminal =
                report.status === "resolved" || report.status === "dismissed";

              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  <Card className="h-full">
                    <CardContent className="p-5">
                      {/* Header badges */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <Badge variant={typeColors[report.type]} className="text-xs capitalize">
                          {report.type}
                        </Badge>
                        <Badge
                          variant={statusColors[report.status]}
                          dot
                          className="text-xs capitalize"
                        >
                          {report.status}
                        </Badge>
                      </div>

                      {/* Title & reason */}
                      <h3 className="font-semibold text-sm mb-2">{report.entityTitle}</h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {report.reason}
                      </p>

                      {/* Expanded details */}
                      {isExpanded && report.details && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-3"
                        >
                          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 whitespace-pre-wrap">
                            {report.details}
                          </p>
                        </motion.div>
                      )}

                      {/* Resolution note if present */}
                      {report.resolutionNote && (
                        <div className="mb-3 border-l-2 border-primary/40 pl-3">
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Resolution:</span>{" "}
                            {report.resolutionNote}
                          </p>
                        </div>
                      )}

                      {/* Reporter & date */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                        <span>
                          Reported by {report.reporter?.name || "Anonymous"}
                        </span>
                        <span>{formatDate(report.createdAt)}</span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        {/* Expand/details button */}
                        {report.details && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            title={isExpanded ? "Collapse details" : "Show details"}
                            onClick={() =>
                              setExpandedId(isExpanded ? null : report.id)
                            }
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}

                        {!isTerminal && (
                          <>
                            {/* Review */}
                            {report.status === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 h-8 text-xs"
                                disabled={updateReport.isPending}
                                onClick={() => handleReview(report)}
                              >
                                <SearchIcon className="h-3 w-3 mr-1" />
                                Review
                              </Button>
                            )}

                            {/* Dismiss */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-muted-foreground"
                              title="Dismiss"
                              disabled={updateReport.isPending}
                              onClick={() => handleDismiss(report)}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>

                            {/* Take action (resolve) */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-red-500 hover:text-red-600"
                              title="Take action"
                              disabled={updateReport.isPending}
                              onClick={() => handleResolve(report)}
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}

                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-red-500 hover:text-red-600 ml-auto"
                          title="Delete report"
                          disabled={deleteReport.isPending}
                          onClick={() => handleDelete(report)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-3">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Confirm dialog for actions */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmLabel={confirmDialog.confirmLabel}
        onConfirm={confirmDialog.onConfirm}
        isLoading={updateReport.isPending || deleteReport.isPending}
      />
    </motion.div>
  );
}
