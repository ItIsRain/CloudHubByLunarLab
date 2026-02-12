"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Shield, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appName: string;
  appIcon?: string;
  onConnect: () => void;
}

const permissions = [
  { label: "Access your events", description: "View and manage event data" },
  { label: "Read your profile", description: "Access basic profile information" },
  { label: "Send notifications", description: "Push notifications on your behalf" },
];

export function ConnectIntegrationDialog({
  open,
  onOpenChange,
  appName,
  appIcon,
  onConnect,
}: ConnectIntegrationDialogProps) {
  const handleConnect = () => {
    onConnect();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect to {appName}</DialogTitle>
          <DialogDescription>
            Authorize {appName} to access your CloudHub account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* App identity */}
          <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/20 py-6">
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold shadow-md",
                "bg-gradient-to-br from-primary/80 to-accent/80 text-white"
              )}
            >
              {appIcon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={appIcon}
                  alt={appName}
                  className="h-10 w-10 rounded-lg"
                />
              ) : (
                appName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="text-center">
              <p className="font-display text-lg font-bold">{appName}</p>
              <p className="text-xs text-muted-foreground">
                wants to connect to your account
              </p>
            </div>
          </div>

          {/* Permissions list */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4 text-muted-foreground" />
              This app will be able to:
            </div>
            <div className="space-y-1 rounded-xl border bg-muted/10 p-3">
              {permissions.map((perm) => (
                <div
                  key={perm.label}
                  className="flex items-start gap-3 rounded-lg px-2 py-2"
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10">
                    <Check className="h-3 w-3 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{perm.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {perm.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legal notice */}
          <p className="text-center text-xs text-muted-foreground">
            By connecting, you agree to {appName}&apos;s{" "}
            <span className="inline-flex items-center gap-0.5 text-primary underline-offset-4 hover:underline cursor-pointer">
              Terms of Service
              <ExternalLink className="h-2.5 w-2.5" />
            </span>
            . You can revoke access at any time from Settings.
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConnect}
              className="flex-1"
            >
              Connect {appName}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
