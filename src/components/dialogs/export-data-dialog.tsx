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
import { Input } from "@/components/ui/input";
import {
  Download,
  FileText,
  FileJson,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ExportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onExport: (format: string) => void;
}

const FORMAT_OPTIONS = [
  {
    value: "csv",
    label: "CSV",
    description: "Spreadsheet-compatible format",
    icon: FileSpreadsheet,
  },
  {
    value: "json",
    label: "JSON",
    description: "Structured data format",
    icon: FileJson,
  },
  {
    value: "pdf",
    label: "PDF",
    description: "Printable document format",
    icon: FileText,
  },
];

const INCLUDE_OPTIONS = [
  { key: "attendees", label: "Attendee details" },
  { key: "tickets", label: "Ticket information" },
  { key: "payments", label: "Payment records" },
  { key: "analytics", label: "Analytics data" },
];

export function ExportDataDialog({
  open,
  onOpenChange,
  title,
  onExport,
}: ExportDataDialogProps) {
  const [format, setFormat] = useState("csv");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [includes, setIncludes] = useState<Record<string, boolean>>({
    attendees: true,
    tickets: true,
    payments: false,
    analytics: false,
  });
  const [isExporting, setIsExporting] = useState(false);

  const toggleInclude = (key: string) => {
    setIncludes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    await new Promise((r) => setTimeout(r, 1500));
    onExport(format);
    setIsExporting(false);
    toast.success(`${title} exported as ${format.toUpperCase()}`, {
      description: "Your download will begin shortly.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </DialogTitle>
          <DialogDescription>
            Export {title} in your preferred format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Format selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Format</label>
            <div className="grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormat(opt.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all duration-200",
                      format === opt.value
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

          {/* Date range filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">From</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">To</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Include options */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Include</label>
            <div className="space-y-2">
              {INCLUDE_OPTIONS.map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={includes[opt.key] || false}
                    onChange={() => toggleInclude(opt.key)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary accent-[hsl(12,100%,55%)]"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Export button */}
          <Button
            className="w-full"
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
                <Download className="h-4 w-4 mr-2" />
                Export as {format.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
