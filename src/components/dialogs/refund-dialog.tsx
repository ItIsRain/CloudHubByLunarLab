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
import { ReceiptText, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guestName: string;
  amount: number;
  onRefund: (amount: number, reason: string) => void;
}

const REFUND_REASONS = [
  "Changed plans",
  "Event cancelled",
  "Duplicate purchase",
  "Other",
];

export function RefundDialog({
  open,
  onOpenChange,
  guestName,
  amount,
  onRefund,
}: RefundDialogProps) {
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [refundAmount, setRefundAmount] = useState(amount.toString());
  const [reason, setReason] = useState(REFUND_REASONS[0]);
  const [isProcessing, setIsProcessing] = useState(false);

  const actualAmount =
    refundType === "full" ? amount : Math.min(Number(refundAmount) || 0, amount);

  const isValid = actualAmount > 0 && reason.length > 0;

  const handleRefund = async () => {
    if (!isValid) return;
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 1500));
    onRefund(actualAmount, reason);
    setIsProcessing(false);
    toast.success(`Refund of $${actualAmount.toFixed(2)} processed`, {
      description: `Refund issued to ${guestName}`,
    });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setRefundType("full");
    setRefundAmount(amount.toString());
    setReason(REFUND_REASONS[0]);
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
            <ReceiptText className="h-5 w-5" />
            Process Refund
          </DialogTitle>
          <DialogDescription>
            Issue a refund to {guestName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Refund type toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Refund Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRefundType("full");
                  setRefundAmount(amount.toString());
                }}
                className={cn(
                  "rounded-xl border p-3 text-sm font-medium transition-all duration-200",
                  refundType === "full"
                    ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                Full Refund
                <div className="text-xs text-muted-foreground mt-0.5">
                  ${amount.toFixed(2)}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRefundType("partial")}
                className={cn(
                  "rounded-xl border p-3 text-sm font-medium transition-all duration-200",
                  refundType === "partial"
                    ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                Partial Refund
                <div className="text-xs text-muted-foreground mt-0.5">
                  Custom amount
                </div>
              </button>
            </div>
          </div>

          {/* Amount input (partial only) */}
          {refundType === "partial" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Refund Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  $
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min={0.01}
                  max={amount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="pl-8"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Maximum: ${amount.toFixed(2)}
              </p>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary"
            >
              {REFUND_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Warning */}
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              This action cannot be undone. The refund of{" "}
              <strong className="text-foreground">
                ${actualAmount.toFixed(2)}
              </strong>{" "}
              will be processed to the original payment method.
            </p>
          </div>

          {/* Refund button */}
          <Button
            className="w-full"
            variant="destructive"
            disabled={!isValid || isProcessing}
            onClick={handleRefund}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Process Refund — $${actualAmount.toFixed(2)}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
