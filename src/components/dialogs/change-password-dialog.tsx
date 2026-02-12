"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One number", test: (p) => /\d/.test(p) },
  { label: "One special character", test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const requirementsMet = useMemo(
    () => PASSWORD_REQUIREMENTS.map((req) => req.test(newPassword)),
    [newPassword]
  );

  const allRequirementsMet = requirementsMet.every(Boolean);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isValid =
    currentPassword.length > 0 && allRequirementsMet && passwordsMatch;

  const handleChange = async () => {
    if (!isValid) return;
    setIsChanging(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsChanging(false);
    toast.success("Password changed successfully!", {
      description: "Your new password is now active.",
    });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
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
            <Lock className="h-5 w-5" />
            Change Password
          </DialogTitle>
          <DialogDescription>
            Update your account password
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current password */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Password</label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showCurrent ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="space-y-2">
            <label className="text-sm font-medium">New Password</label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNew ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Password requirements */}
          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5">
            {PASSWORD_REQUIREMENTS.map((req, index) => (
              <div
                key={req.label}
                className="flex items-center gap-2 text-sm"
              >
                {requirementsMet[index] ? (
                  <Check className="h-3.5 w-3.5 text-success shrink-0" />
                ) : (
                  <X className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <span
                  className={cn(
                    requirementsMet[index]
                      ? "text-success"
                      : "text-muted-foreground"
                  )}
                >
                  {req.label}
                </span>
              </div>
            ))}
          </div>

          {/* Confirm password */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm New Password</label>
            <Input
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={
                confirmPassword.length > 0 && !passwordsMatch
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-destructive">
                Passwords do not match
              </p>
            )}
          </div>

          {/* Change button */}
          <Button
            className="w-full"
            disabled={!isValid || isChanging}
            onClick={handleChange}
          >
            {isChanging ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Changing Password...
              </>
            ) : (
              "Change Password"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
