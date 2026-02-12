"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Settings,
  Shield,
  Wrench,
  AlertTriangle,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ToggleSwitchProps {
  label: string;
  description?: string;
  defaultChecked?: boolean;
}

function ToggleSwitch({ label, description, defaultChecked = false }: ToggleSwitchProps) {
  const [checked, setChecked] = React.useState(defaultChecked);

  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => {
          setChecked(!checked);
          toast.success(`${label} ${!checked ? "enabled" : "disabled"}`);
        }}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          checked ? "bg-primary" : "bg-muted-foreground/30"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [platformName, setPlatformName] = React.useState("CloudHub");
  const [description, setDescription] = React.useState(
    "Next-Gen Event & Hackathon Management Platform"
  );
  const [supportEmail, setSupportEmail] = React.useState("support@cloudhub.io");

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-1">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="gap-1 -ml-2">
                  <ChevronLeft className="h-4 w-4" />
                  Admin
                </Button>
              </Link>
            </div>
            <h1 className="font-display text-3xl font-bold">Platform Settings</h1>
            <p className="text-muted-foreground mt-1">Manage platform configuration and features</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* General Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">General</CardTitle>
                  </div>
                  <CardDescription>Basic platform configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Platform Name</label>
                    <Input
                      value={platformName}
                      onChange={(e) => setPlatformName(e.target.value)}
                      placeholder="Platform name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Platform description"
                      rows={3}
                      className="flex w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Support Email</label>
                    <Input
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      placeholder="support@example.com"
                    />
                  </div>
                  <Button
                    className="w-full mt-2"
                    onClick={() => toast.success("General settings saved")}
                  >
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Feature Toggles */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Features</CardTitle>
                  </div>
                  <CardDescription>Enable or disable platform features</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border">
                    <ToggleSwitch
                      label="User Registration"
                      description="Allow new users to create accounts"
                      defaultChecked={true}
                    />
                    <ToggleSwitch
                      label="Hackathons"
                      description="Enable hackathon creation and participation"
                      defaultChecked={true}
                    />
                    <ToggleSwitch
                      label="Blog"
                      description="Enable the community blog feature"
                      defaultChecked={true}
                    />
                    <ToggleSwitch
                      label="API Access"
                      description="Allow third-party API integrations"
                      defaultChecked={true}
                    />
                    <ToggleSwitch
                      label="Public Profiles"
                      description="Make user profiles publicly visible"
                      defaultChecked={true}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Maintenance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Maintenance</CardTitle>
                  </div>
                  <CardDescription>Platform maintenance tools and options</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ToggleSwitch
                    label="Maintenance Mode"
                    description="Display maintenance page to all visitors"
                    defaultChecked={false}
                  />

                  <div className="pt-2 space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => {
                        toast.promise(
                          new Promise((resolve) => setTimeout(resolve, 1500)),
                          {
                            loading: "Clearing cache...",
                            success: "Cache cleared successfully",
                            error: "Failed to clear cache",
                          }
                        );
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Clear Cache
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => {
                        toast.promise(
                          new Promise((resolve) => setTimeout(resolve, 2000)),
                          {
                            loading: "Rebuilding search index...",
                            success: "Search index rebuilt successfully",
                            error: "Failed to rebuild search index",
                          }
                        );
                      }}
                    >
                      <Search className="h-4 w-4" />
                      Rebuild Search Index
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Danger Zone */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-red-500/30">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <CardTitle className="text-lg text-red-500">Danger Zone</CardTitle>
                  </div>
                  <CardDescription>
                    Irreversible actions. Proceed with extreme caution.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
                    <h4 className="text-sm font-semibold mb-1">Reset Platform</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      This will delete all user data, events, hackathons, and submissions. This
                      action cannot be undone.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Are you absolutely sure you want to reset the entire platform? This action CANNOT be undone."
                          )
                        ) {
                          toast.error("Platform reset initiated (mock)");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Reset Platform
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </>
  );
}
