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
import { Key, Shield } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, scopes: string[]) => void;
}

const scopeOptions = [
  { id: "events-read", label: "Events", permission: "Read", group: "Events" },
  { id: "events-write", label: "Events", permission: "Write", group: "Events" },
  { id: "hackathons-read", label: "Hackathons", permission: "Read", group: "Hackathons" },
  { id: "hackathons-write", label: "Hackathons", permission: "Write", group: "Hackathons" },
  { id: "users-read", label: "Users", permission: "Read", group: "Users" },
  { id: "analytics-read", label: "Analytics", permission: "Read", group: "Analytics" },
];

const expiryOptions = [
  { label: "Never", value: "never" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
  { label: "1 year", value: "1y" },
];

export function ApiKeyDialog({
  open,
  onOpenChange,
  onSave,
}: ApiKeyDialogProps) {
  const [keyName, setKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expiry, setExpiry] = useState("never");

  const toggleScope = (scopeId: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scopeId)
        ? prev.filter((s) => s !== scopeId)
        : [...prev, scopeId]
    );
  };

  const handleCreate = () => {
    if (!keyName.trim()) {
      toast.error("Please enter a key name");
      return;
    }
    if (selectedScopes.length === 0) {
      toast.error("Please select at least one scope");
      return;
    }
    onSave(keyName.trim(), selectedScopes);
    toast.success(`API key "${keyName}" created successfully!`);
    setKeyName("");
    setSelectedScopes([]);
    setExpiry("never");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Create API Key
          </DialogTitle>
          <DialogDescription>
            Generate a new API key with specific permissions and expiry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Key name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Key Name</label>
            <Input
              placeholder="e.g. Production Backend"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
            />
          </div>

          {/* Scopes */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Scopes
            </label>
            <div className="grid grid-cols-1 gap-2 rounded-xl border bg-muted/20 p-3">
              {scopeOptions.map((scope) => (
                <label
                  key={scope.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                    "hover:bg-muted/50",
                    selectedScopes.includes(scope.id) && "bg-primary/5 ring-1 ring-primary/20"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope.id)}
                    onChange={() => toggleScope(scope.id)}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  <span className="text-sm font-medium">{scope.label}</span>
                  <span
                    className={cn(
                      "ml-auto rounded-md px-2 py-0.5 text-xs font-medium",
                      scope.permission === "Write"
                        ? "bg-warning/10 text-warning"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {scope.permission}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Expiry */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Expiry</label>
            <select
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className={cn(
                "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm",
                "ring-offset-background transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
            >
              {expiryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Create button */}
          <Button
            type="button"
            onClick={handleCreate}
            className="w-full"
          >
            <Key className="mr-2 h-4 w-4" />
            Create Key
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
