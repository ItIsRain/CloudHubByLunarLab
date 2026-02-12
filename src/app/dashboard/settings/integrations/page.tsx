"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Integration {
  id: string;
  name: string;
  description: string;
  color: string;
  letter: string;
}

const integrations: Integration[] = [
  {
    id: "zoom",
    name: "Zoom",
    description: "Host virtual events and meetings with Zoom integration.",
    color: "bg-blue-600",
    letter: "Z",
  },
  {
    id: "google-meet",
    name: "Google Meet",
    description: "Use Google Meet for video conferencing and webinars.",
    color: "bg-green-600",
    letter: "G",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Send notifications and updates to your Slack workspace.",
    color: "bg-purple-700",
    letter: "S",
  },
  {
    id: "discord",
    name: "Discord",
    description: "Connect your Discord server for community engagement.",
    color: "bg-indigo-600",
    letter: "D",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Link repositories and track hackathon project submissions.",
    color: "bg-gray-800",
    letter: "G",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Sync event docs, notes, and project wikis to Notion.",
    color: "bg-neutral-900",
    letter: "N",
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Automate workflows and connect to 5,000+ apps via Zapier.",
    color: "bg-orange-500",
    letter: "Z",
  },
];

const defaultConnected = new Set(["github", "slack"]);

export default function IntegrationsPage() {
  const [connected, setConnected] = React.useState<Set<string>>(defaultConnected);
  const [confirming, setConfirming] = React.useState<string | null>(null);

  const handleConnect = (integration: Integration) => {
    setConnected((prev) => {
      const next = new Set(prev);
      next.add(integration.id);
      return next;
    });
    toast.success(`${integration.name} connected successfully`);
  };

  const handleDisconnect = (integration: Integration) => {
    if (confirming === integration.id) {
      setConnected((prev) => {
        const next = new Set(prev);
        next.delete(integration.id);
        return next;
      });
      setConfirming(null);
      toast.success(`${integration.name} disconnected`);
    } else {
      setConfirming(integration.id);
    }
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
            <h1 className="font-display text-3xl font-bold mb-1">Integrations</h1>
            <p className="text-muted-foreground">
              Connect your favorite tools and services to supercharge your workflow.
            </p>
          </motion.div>

          {/* Integration Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration, i) => {
              const isConnected = connected.has(integration.id);
              const isConfirming = confirming === integration.id;

              return (
                <motion.div
                  key={integration.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="h-full">
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={cn(
                            "h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg",
                            integration.color
                          )}
                        >
                          {integration.letter}
                        </div>
                        <Badge
                          variant={isConnected ? "success" : "muted"}
                          dot
                          pulse={isConnected}
                        >
                          {isConnected ? "Connected" : "Not Connected"}
                        </Badge>
                      </div>

                      <h3 className="font-display font-semibold text-lg mb-1">
                        {integration.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-6 flex-1">
                        {integration.description}
                      </p>

                      {isConnected ? (
                        <Button
                          variant={isConfirming ? "destructive" : "outline"}
                          size="sm"
                          className="w-full"
                          onClick={() => handleDisconnect(integration)}
                          onBlur={() => setConfirming(null)}
                        >
                          <Unplug className="h-4 w-4 mr-1.5" />
                          {isConfirming ? "Confirm Disconnect" : "Disconnect"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => handleConnect(integration)}
                        >
                          <Check className="h-4 w-4 mr-1.5" />
                          Connect
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
