"use client";

import * as React from "react";
import { Zap, ArrowRight, Check, Crown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCheckout } from "@/hooks/use-subscription";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: "events" | "hackathons";
  currentLimit: number;
}

const proHighlights = [
  "Unlimited events & hackathons",
  "Up to 2,000 attendees per event",
  "Custom branding & analytics",
  "Priority support (24h SLA)",
];

export function UpgradeDialog({
  open,
  onOpenChange,
  limitType,
  currentLimit,
}: UpgradeDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const checkout = useCheckout();

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      await checkout("monthly");
    } catch {
      // Error handled by checkout
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">
            You&apos;ve reached your limit
          </DialogTitle>
          <DialogDescription className="text-center">
            Your free plan allows {currentLimit} {limitType} per month.
            Upgrade to Pro for unlimited {limitType}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          <Badge variant="outline" className="w-full justify-center py-1.5">
            <Zap className="h-3.5 w-3.5 mr-1.5 text-primary" />
            Pro Plan — $49/month
          </Badge>
          {proHighlights.map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleUpgrade} disabled={isLoading}>
            {isLoading ? "Redirecting..." : "Upgrade to Pro"}
            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
