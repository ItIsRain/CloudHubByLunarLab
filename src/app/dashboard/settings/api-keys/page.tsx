"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Key, Plus, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { canUseApi } from "@/lib/plan-limits";
import { API_SCOPES } from "@/lib/api-keys";

interface ApiKeyResponse {
  id: string;
  name: string;
  maskedKey: string;
  scopes: string[];
  status: string;
  lastUsed: string | null;
  createdAt: string;
  revokedAt: string | null;
}

interface CreateKeyResponse {
  id: string;
  name: string;
  key: string;
  maskedKey: string;
  scopes: string[];
  status: string;
  createdAt: string;
}

const SCOPE_LABELS: Record<string, string> = {
  events: "Events",
  hackathons: "Hackathons",
  users: "Users",
  analytics: "Analytics",
};

export default function ApiKeysPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const tier = user?.subscriptionTier ?? "free";
  const hasApiAccess = canUseApi(tier);

  const [showCreate, setShowCreate] = React.useState(false);
  const [newKeyName, setNewKeyName] = React.useState("");
  const [newKeyScopes, setNewKeyScopes] = React.useState<Set<string>>(new Set());
  const [newlyCreatedKey, setNewlyCreatedKey] = React.useState<CreateKeyResponse | null>(null);

  // Fetch keys
  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async (): Promise<ApiKeyResponse[]> => {
      const res = await fetch("/api/keys");
      if (!res.ok) {
        throw new Error("Failed to fetch API keys");
      }
      const json = await res.json();
      return json.data as ApiKeyResponse[];
    },
    enabled: hasApiAccess,
  });

  // Create key mutation
  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; scopes: string[] }) => {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to create API key");
      }
      const json = await res.json();
      return json.data as CreateKeyResponse;
    },
    onSuccess: (data) => {
      setNewlyCreatedKey(data);
      setNewKeyName("");
      setNewKeyScopes(new Set());
      setShowCreate(false);
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key created! Copy it now — it won't be shown again.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Revoke key mutation
  const revokeMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const res = await fetch(`/api/keys/${keyId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to revoke API key");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key revoked");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleCreate = () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a key name");
      return;
    }
    if (newKeyScopes.size === 0) {
      toast.error("Please select at least one scope");
      return;
    }
    createMutation.mutate({
      name: newKeyName.trim(),
      scopes: Array.from(newKeyScopes),
    });
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("API key copied to clipboard");
  };

  const toggleScope = (scope: string) => {
    setNewKeyScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) {
        next.delete(scope);
      } else {
        next.add(scope);
      }
      return next;
    });
  };

  // Enterprise-only gate
  if (!hasApiAccess) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Settings
            </Link>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-12 text-center">
                  <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="font-display text-2xl font-bold mb-2">API Access — Enterprise Only</h2>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Programmatic access to CloudHub via API keys is available on the Enterprise plan.
                    Upgrade to create API keys and integrate with your tools.
                  </p>
                  <Button asChild>
                    <Link href="/pricing">View Plans</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Settings
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold mb-1">API Keys</h1>
                <p className="text-muted-foreground">
                  Manage API keys for programmatic access to CloudHub.
                </p>
              </div>
              <Button onClick={() => setShowCreate(!showCreate)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Create New Key
              </Button>
            </div>
          </motion.div>

          {/* Newly Created Key Banner */}
          {newlyCreatedKey && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Card className="ring-2 ring-primary">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Key className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold mb-1">
                        New Key Created: {newlyCreatedKey.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Copy this key now. It will never be shown again.
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-muted px-3 py-1.5 rounded break-all">
                          {newlyCreatedKey.key}
                        </code>
                        <button
                          type="button"
                          onClick={() => void handleCopy(newlyCreatedKey.key)}
                          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          aria-label="Copy API key"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewlyCreatedKey(null)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Create Form */}
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Create New API Key</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label htmlFor="key-name" className="block text-sm font-medium mb-1.5">
                      Key Name
                    </label>
                    <Input
                      id="key-name"
                      placeholder="e.g. Production API, CI/CD Pipeline"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Scopes</label>
                    <div className="flex flex-wrap gap-2">
                      {API_SCOPES.map((scope) => (
                        <button
                          key={scope}
                          type="button"
                          onClick={() => toggleScope(scope)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                            newKeyScopes.has(scope)
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={newKeyScopes.has(scope)}
                            readOnly
                            className="h-3.5 w-3.5 rounded accent-primary pointer-events-none"
                          />
                          {SCOPE_LABELS[scope] ?? scope}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleCreate}
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? "Creating..." : "Create Key"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowCreate(false);
                        setNewKeyName("");
                        setNewKeyScopes(new Set());
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Loading skeletons */}
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-muted shimmer" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-40 rounded bg-muted shimmer" />
                        <div className="h-3 w-64 rounded bg-muted shimmer" />
                        <div className="h-3 w-48 rounded bg-muted shimmer" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Keys List */}
          {!isLoading && (
            <div className="space-y-3">
              {keys.map((apiKey, i) => (
                <motion.div
                  key={apiKey.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        {/* Icon & Info */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="p-2 rounded-lg bg-muted shrink-0">
                            <Key className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">{apiKey.name}</h3>
                              <Badge
                                variant={apiKey.status === "active" ? "success" : "destructive"}
                                className="shrink-0"
                              >
                                {apiKey.status === "active" ? "Active" : "Revoked"}
                              </Badge>
                            </div>

                            {/* Key display (masked — full key is never returned for existing keys) */}
                            <div className="flex items-center gap-2 mb-2">
                              <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                                {apiKey.maskedKey}
                              </code>
                            </div>

                            {/* Meta */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span>Created {new Date(apiKey.createdAt).toLocaleDateString()}</span>
                              <span>
                                {apiKey.lastUsed
                                  ? `Last used ${new Date(apiKey.lastUsed).toLocaleDateString()}`
                                  : "Never used"}
                              </span>
                              <span>
                                Scopes: {apiKey.scopes.map((s) => SCOPE_LABELS[s] ?? s).join(", ")}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        {apiKey.status === "active" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="shrink-0"
                            disabled={revokeMutation.isPending}
                            onClick={() => revokeMutation.mutate(apiKey.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1.5" />
                            Revoke
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              {/* Empty State */}
              {keys.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="font-display text-lg font-semibold mb-1">No API Keys</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Create your first API key to get started with the CloudHub API.
                      </p>
                      <Button onClick={() => setShowCreate(true)}>
                        <Plus className="h-4 w-4 mr-1.5" />
                        Create New Key
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
