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
import { Flag, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ReportContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentTitle: string;
  onReport: (reason: string, details: string) => void;
}

const REPORT_REASONS = [
  {
    value: "spam",
    label: "Spam",
    description: "Unsolicited or repetitive content",
  },
  {
    value: "inappropriate",
    label: "Inappropriate",
    description: "Offensive or unsuitable content",
  },
  {
    value: "misleading",
    label: "Misleading",
    description: "False or deceptive information",
  },
  {
    value: "harassment",
    label: "Harassment",
    description: "Targeting or bullying individuals",
  },
  {
    value: "other",
    label: "Other",
    description: "Something else not listed above",
  },
];

export function ReportContentDialog({
  open,
  onOpenChange,
  contentTitle,
  onReport,
}: ReportContentDialogProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = reason.length > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    onReport(reason, details);
    setIsSubmitting(false);
    toast.success("Report submitted", {
      description: "Thank you. Our team will review this content.",
    });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setReason("");
    setDetails("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetForm();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Report Content
          </DialogTitle>
          <DialogDescription>
            Report &ldquo;{contentTitle}&rdquo; for violating our guidelines
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Reason selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Reason <span className="text-destructive">*</span>
            </label>
            <div className="space-y-2">
              {REPORT_REASONS.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all duration-200",
                    reason === opt.value
                      ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={opt.value}
                    checked={reason === opt.value}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-0.5 h-4 w-4 border-input text-primary focus:ring-primary accent-[hsl(12,100%,55%)]"
                  />
                  <div>
                    <span className="text-sm font-medium">{opt.label}</span>
                    <p className="text-xs text-muted-foreground">
                      {opt.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Details textarea */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Additional Details{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder="Provide any additional context that may help our review..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
            />
          </div>

          {/* Info notice */}
          <div className="rounded-xl border border-border bg-muted/30 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Reports are reviewed by our moderation team within 24 hours.
              False reports may result in account restrictions.
            </p>
          </div>

          {/* Submit button */}
          <Button
            className="w-full"
            variant="destructive"
            disabled={!isValid || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Flag className="h-4 w-4 mr-2" />
                Submit Report
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
