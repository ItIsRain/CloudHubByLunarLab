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
import { Badge } from "@/components/ui/badge";
import { Camera, QrCode, Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QrCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckIn: (code: string) => void;
}

const recentScans = [
  { id: "scan-1", name: "Alex Chen", code: "CHK-8291", time: "2 min ago", status: "success" as const },
  { id: "scan-2", name: "Sarah Miller", code: "CHK-7403", time: "5 min ago", status: "success" as const },
  { id: "scan-3", name: "James Wilson", code: "CHK-6125", time: "8 min ago", status: "success" as const },
];

export function QrCheckInDialog({
  open,
  onOpenChange,
  onCheckIn,
}: QrCheckInDialogProps) {
  const [manualCode, setManualCode] = useState("");

  const handleCheckIn = () => {
    if (!manualCode.trim()) {
      toast.error("Please enter a check-in code");
      return;
    }
    onCheckIn(manualCode.trim());
    toast.success(`Checked in with code: ${manualCode.trim()}`);
    setManualCode("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            QR Check-In
          </DialogTitle>
          <DialogDescription>
            Scan a QR code or enter a check-in code manually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Camera placeholder */}
          <div
            className={cn(
              "relative flex flex-col items-center justify-center gap-3",
              "h-56 rounded-xl border-2 border-dashed border-muted-foreground/30",
              "bg-muted/30 transition-colors hover:border-primary/40"
            )}
          >
            <div className="rounded-full bg-muted p-4">
              <Camera className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              Camera access required
            </p>
            <p className="text-xs text-muted-foreground/70">
              Allow camera permissions to scan QR codes
            </p>
            <Button variant="outline" size="sm" className="mt-1">
              Enable Camera
            </Button>

            {/* Scan overlay corners */}
            <div className="pointer-events-none absolute inset-8">
              <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-primary rounded-tl" />
              <div className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-primary rounded-tr" />
              <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-primary rounded-bl" />
              <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-primary rounded-br" />
            </div>
          </div>

          {/* Manual code input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Manual Code Entry</label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter check-in code (e.g. CHK-1234)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCheckIn()}
                className="font-mono"
              />
              <Button onClick={handleCheckIn}>Check In</Button>
            </div>
          </div>

          {/* Recent scans */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Recent Scans
            </h4>
            <div className="space-y-2">
              {recentScans.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10">
                      <Check className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{scan.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {scan.code}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success" className="text-xs">
                      Checked In
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {scan.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
