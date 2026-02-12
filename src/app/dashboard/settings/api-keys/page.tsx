"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Key, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  maskedKey: string;
  scopes: string[];
  createdAt: string;
  lastUsed: string | null;
  status: "active" | "revoked";
}

const generateKey = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "ch_key_";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const maskKey = (key: string): string => {
  return key.slice(0, 8) + "..." + key.slice(-4);
};

const initialKeys: ApiKey[] = [
  {
    id: "key-1",
    name: "Production API",
    key: "ch_key_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    maskedKey: "ch_key_...o5p6",
    scopes: ["Events", "Hackathons", "Users"],
    createdAt: "2025-12-01",
    lastUsed: "2026-02-10",
    status: "active",
  },
  {
    id: "key-2",
    name: "Analytics Dashboard",
    key: "ch_key_q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
    maskedKey: "ch_key_...e1f2",
    scopes: ["Analytics"],
    createdAt: "2026-01-15",
    lastUsed: "2026-02-08",
    status: "active",
  },
  {
    id: "key-3",
    name: "Staging Key",
    key: "ch_key_g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8",
    maskedKey: "ch_key_...u7v8",
    scopes: ["Events", "Hackathons"],
    createdAt: "2025-10-20",
    lastUsed: null,
    status: "revoked",
  },
  {
    id: "key-4",
    name: "Mobile App",
    key: "ch_key_w9x0y1z2a3b4c5d6e7f8g9h0i1j2k3l4",
    maskedKey: "ch_key_...k3l4",
    scopes: ["Events", "Users"],
    createdAt: "2026-02-01",
    lastUsed: "2026-02-12",
    status: "active",
  },
];

const allScopes = ["Events", "Hackathons", "Users", "Analytics"];

export default function ApiKeysPage() {
  const [keys, setKeys] = React.useState<ApiKey[]>(initialKeys);
  const [showCreate, setShowCreate] = React.useState(false);
  const [newKeyName, setNewKeyName] = React.useState("");
  const [newKeyScopes, setNewKeyScopes] = React.useState<Set<string>>(new Set());
  const [revealedKeys, setRevealedKeys] = React.useState<Set<string>>(new Set());
  const [newlyCreatedKeyId, setNewlyCreatedKeyId] = React.useState<string | null>(null);

  const handleCreate = () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a key name");
      return;
    }
    if (newKeyScopes.size === 0) {
      toast.error("Please select at least one scope");
      return;
    }

    const rawKey = generateKey();
    const newKey: ApiKey = {
      id: `key-${Date.now()}`,
      name: newKeyName.trim(),
      key: rawKey,
      maskedKey: maskKey(rawKey),
      scopes: Array.from(newKeyScopes),
      createdAt: new Date().toISOString().split("T")[0],
      lastUsed: null,
      status: "active",
    };

    setKeys((prev) => [newKey, ...prev]);
    setNewlyCreatedKeyId(newKey.id);
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      next.add(newKey.id);
      return next;
    });
    setNewKeyName("");
    setNewKeyScopes(new Set());
    setShowCreate(false);
    toast.success("API key created! Copy it now -- it won't be shown in full again.");
  };

  const handleRevoke = (key: ApiKey) => {
    setKeys((prev) =>
      prev.map((k) => (k.id === key.id ? { ...k, status: "revoked" as const } : k))
    );
    toast.success(`Key "${key.name}" revoked`);
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API key copied to clipboard");
  };

  const toggleReveal = (keyId: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) {
        next.delete(keyId);
      } else {
        next.add(keyId);
      }
      return next;
    });
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
                    <label className="block text-sm font-medium mb-1.5">Key Name</label>
                    <Input
                      placeholder="e.g. Production API, CI/CD Pipeline"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Scopes</label>
                    <div className="flex flex-wrap gap-2">
                      {allScopes.map((scope) => (
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
                          {scope}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleCreate}>Create Key</Button>
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

          {/* Keys List */}
          <div className="space-y-3">
            {keys.map((apiKey, i) => {
              const isRevealed = revealedKeys.has(apiKey.id);
              const isNewlyCreated = newlyCreatedKeyId === apiKey.id;

              return (
                <motion.div
                  key={apiKey.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className={cn(isNewlyCreated && "ring-2 ring-primary")}>
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

                            {/* Key display */}
                            <div className="flex items-center gap-2 mb-2">
                              <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                                {isRevealed ? apiKey.key : apiKey.maskedKey}
                              </code>
                              <button
                                type="button"
                                onClick={() => toggleReveal(apiKey.id)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                title={isRevealed ? "Hide key" : "Reveal key"}
                              >
                                {isRevealed ? (
                                  <EyeOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopy(apiKey.key)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                title="Copy key"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Meta */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span>Created {apiKey.createdAt}</span>
                              <span>
                                {apiKey.lastUsed
                                  ? `Last used ${apiKey.lastUsed}`
                                  : "Never used"}
                              </span>
                              <span>
                                Scopes: {apiKey.scopes.join(", ")}
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
                            onClick={() => handleRevoke(apiKey)}
                          >
                            <Trash2 className="h-4 w-4 mr-1.5" />
                            Revoke
                          </Button>
                        )}
                      </div>

                      {isNewlyCreated && (
                        <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                          <p className="font-medium text-primary">
                            Copy this key now. It will be masked after you leave this page.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}

            {/* Empty State */}
            {keys.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
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
        </div>
      </main>
    </div>
  );
}
