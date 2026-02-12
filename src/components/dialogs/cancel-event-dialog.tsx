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
import { AlertTriangle, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface CancelEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventTitle: string;
  attendeeCount: number;
  onCancel: (refundAll: boolean, message: string) => void;
}

export function CancelEventDialog({
  open,
  onOpenChange,
  eventTitle,
  attendeeCount,
  onCancel,
}: CancelEventDialogProps) {
  const [refundAll, setRefundAll] = useState(true);
  const [message, setMessage] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const nameMatches =
    confirmText.trim().toLowerCase() === eventTitle.trim().toLowerCase();

  const handleCancel = async () => {
    if (!nameMatches) return;
    setIsCancelling(true);
    await new Promise((r) => setTimeout(r, 2000));
    onCancel(refundAll, message);
    setIsCancelling(false);
    toast.success("Event has been cancelled", {
      description: refundAll
        ? `All ${attendeeCount} attendees will be refunded.`
        : "Attendees have been notified.",
    });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setRefundAll(true);
    setMessage("");
    setConfirmText("");
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
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Cancel Event
          </DialogTitle>
          <DialogDescription>
            This action is permanent and cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning */}
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  You are about to cancel &ldquo;{eventTitle}&rdquo;
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  This will affect{" "}
                  <strong className="text-foreground">
                    {attendeeCount} attendee{attendeeCount !== 1 ? "s" : ""}
                  </strong>{" "}
                  who have registered for this event.
                </p>
              </div>
            </div>
          </div>

          {/* Refund checkbox */}
          <label className="flex items-center gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="checkbox"
              checked={refundAll}
              onChange={(e) => setRefundAll(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary accent-[hsl(12,100%,55%)]"
            />
            <div>
              <span className="text-sm font-medium">
                Refund all attendees
              </span>
              <p className="text-xs text-muted-foreground">
                Automatically process refunds for all ticket purchases
              </p>
            </div>
          </label>

          {/* Cancellation message */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Cancellation Message{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder="Let attendees know why the event is being cancelled..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {/* Confirm by typing event name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Type <span className="font-mono text-destructive">{eventTitle}</span> to confirm
            </label>
            <Input
              placeholder={eventTitle}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className={
                confirmText.length > 0 && !nameMatches
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }
            />
          </div>

          {/* Cancel button */}
          <Button
            className="w-full"
            variant="destructive"
            disabled={!nameMatches || isCancelling}
            onClick={handleCancel}
          >
            {isCancelling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              "Cancel Event"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
