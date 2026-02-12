"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Award, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CertificatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificate: {
    title: string;
    type: string;
    description: string;
    issuedAt: string;
    verificationCode: string;
  };
}

export function CertificatePreviewDialog({
  open,
  onOpenChange,
  certificate,
}: CertificatePreviewDialogProps) {
  const formattedDate = new Date(certificate.issuedAt).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  const handleDownload = () => {
    toast.success("Certificate PDF download started!");
  };

  const handleShare = () => {
    toast.success("Share link copied to clipboard!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Certificate Preview
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* Certificate card */}
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl border-2 border-primary/20",
              "bg-gradient-to-br from-background via-background to-muted/30",
              "p-8 shadow-lg"
            )}
          >
            {/* Decorative border pattern */}
            <div className="absolute inset-2 rounded-xl border border-dashed border-primary/10 pointer-events-none" />
            <div className="absolute inset-4 rounded-lg border border-primary/5 pointer-events-none" />

            {/* Corner ornaments */}
            <div className="absolute left-6 top-6 h-8 w-8 border-l-2 border-t-2 border-primary/30 rounded-tl-sm" />
            <div className="absolute right-6 top-6 h-8 w-8 border-r-2 border-t-2 border-primary/30 rounded-tr-sm" />
            <div className="absolute bottom-6 left-6 h-8 w-8 border-b-2 border-l-2 border-primary/30 rounded-bl-sm" />
            <div className="absolute bottom-6 right-6 h-8 w-8 border-b-2 border-r-2 border-primary/30 rounded-br-sm" />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center text-center space-y-5 py-4">
              {/* Logo */}
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-white font-bold text-sm">C</span>
                </div>
                <span className="font-display text-lg font-bold gradient-text">
                  CloudHub
                </span>
              </div>

              {/* Type badge */}
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Certificate of {certificate.type}
              </p>

              {/* Divider */}
              <div className="h-px w-24 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

              {/* Title */}
              <h2 className="font-display text-2xl font-bold leading-tight sm:text-3xl">
                {certificate.title}
              </h2>

              {/* Description */}
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                {certificate.description}
              </p>

              {/* Divider */}
              <div className="h-px w-24 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

              {/* Date */}
              <p className="text-sm text-muted-foreground">
                Issued on{" "}
                <span className="font-semibold text-foreground">
                  {formattedDate}
                </span>
              </p>

              {/* Verification code */}
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2">
                <ShieldCheck className="h-4 w-4 text-success" />
                <span className="font-mono text-xs text-muted-foreground">
                  Verification: {certificate.verificationCode}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleShare}
              className="flex-1"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button
              type="button"
              onClick={handleDownload}
              className="flex-1"
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
