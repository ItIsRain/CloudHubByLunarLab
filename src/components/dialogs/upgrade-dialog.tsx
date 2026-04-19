"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, Crown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: "events" | "hackathons";
  currentLimit: number;
}

const enterpriseHighlights = [
  "Unlimited events & competitions",
  "Unlimited attendees per event",
  "Custom branding & analytics",
  "Dedicated account manager",
];

export function UpgradeDialog({
  open,
  onOpenChange,
  limitType,
  currentLimit,
}: UpgradeDialogProps) {
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
            Contact us for a custom plan with unlimited {limitType}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          {enterpriseHighlights.map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Button asChild>
            <Link href="/contact">
              Contact Us
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
