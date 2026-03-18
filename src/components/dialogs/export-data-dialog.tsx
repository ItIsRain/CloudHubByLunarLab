"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Users,
  Shield,
  Star,
  ClipboardList,
  Trophy,
  CalendarCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadExport, downloadPdfReport } from "@/hooks/use-export";

// =====================================================
// Types
// =====================================================

type HackathonExportType = "applications" | "screening" | "scores" | "registrations" | "winners" | "attendance";

interface ExportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Legacy callback — called when no hackathonId is provided */
  onExport?: (format: string) => void;
  /** When provided, enables server-side CSV export for hackathon data */
  hackathonId?: string;
  /** Optional phase ID for score exports */
  phaseId?: string;
}

// =====================================================
// Export type options for hackathon exports
// =====================================================

const HACKATHON_EXPORT_TYPES: {
  value: HackathonExportType;
  label: string;
  description: string;
  icon: typeof Users;
}[] = [
  {
    value: "applications",
    label: "Applications",
    description: "All applications with form data",
    icon: ClipboardList,
  },
  {
    value: "screening",
    label: "Screening",
    description: "Screening results & eligibility",
    icon: Shield,
  },
  {
    value: "scores",
    label: "Scores",
    description: "Phase scores & reviewer data",
    icon: Star,
  },
  {
    value: "registrations",
    label: "Registrations",
    description: "Basic registration list",
    icon: Users,
  },
  {
    value: "winners",
    label: "Winners",
    description: "Competition winners & awards",
    icon: Trophy,
  },
  {
    value: "attendance",
    label: "Attendance",
    description: "Accepted/confirmed attendees",
    icon: CalendarCheck,
  },
];

// =====================================================
// Component
// =====================================================

export function ExportDataDialog({
  open,
  onOpenChange,
  title,
  onExport,
  hackathonId,
  phaseId,
}: ExportDataDialogProps) {
  const [exportType, setExportType] = useState<HackathonExportType>("applications");
  const [isExporting, setIsExporting] = useState(false);

  const isHackathonExport = !!hackathonId;

  const handleExport = async () => {
    if (isHackathonExport) {
      setIsExporting(true);
      try {
        downloadExport(
          hackathonId,
          exportType,
          exportType === "scores" ? phaseId : undefined
        );
        toast.success(`${title} exported as CSV`, {
          description: "Your download will begin shortly.",
        });
        onOpenChange(false);
      } catch {
        toast.error("Export failed. Please try again.");
      } finally {
        setIsExporting(false);
      }
    } else {
      // Legacy path for non-hackathon exports
      setIsExporting(true);
      onExport?.("csv");
      setIsExporting(false);
      toast.success(`${title} exported as CSV`, {
        description: "Your download will begin shortly.",
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </DialogTitle>
          <DialogDescription>
            Export {title} as a CSV file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {isHackathonExport ? (
            /* Hackathon export type selector */
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Type</label>
              <div className="grid grid-cols-3 gap-2">
                {HACKATHON_EXPORT_TYPES.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setExportType(opt.value)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all duration-200",
                        exportType === opt.value
                          ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{opt.label}</span>
                      <span className="text-[10px] text-muted-foreground text-center leading-tight">
                        {opt.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Legacy format display for non-hackathon exports */
            <div className="space-y-2">
              <label className="text-sm font-medium">Format</label>
              <div className="flex items-center gap-3 rounded-xl border border-primary ring-2 ring-primary/20 bg-primary/5 p-3">
                <FileSpreadsheet className="h-5 w-5" />
                <div>
                  <span className="text-sm font-medium">CSV</span>
                  <p className="text-[10px] text-muted-foreground">
                    Spreadsheet-compatible format
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Export buttons */}
          <div className="flex gap-3">
            <Button
              className="flex-1"
              disabled={isExporting}
              onClick={handleExport}
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export CSV
                </>
              )}
            </Button>
            {isHackathonExport && (
              <Button
                variant="outline"
                className="shrink-0"
                onClick={() => {
                  downloadPdfReport(hackathonId!);
                  toast.success("PDF report download started");
                  onOpenChange(false);
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                PDF Report
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
