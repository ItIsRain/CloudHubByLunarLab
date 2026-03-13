"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Unplug, Webhook, ExternalLink } from "lucide-react";
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
  logo?: string;
  webhookCompatible?: boolean;
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
    webhookCompatible: true,
  },
  {
    id: "discord",
    name: "Discord",
    description: "Connect your Discord server for community engagement.",
    color: "bg-indigo-600",
    letter: "D",
    webhookCompatible: true,
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
    webhookCompatible: true,
  },
  {
    id: "zoho",
    name: "Zoho",
    description:
      "Sync registrations and attendee data to Zoho CRM, Zoho Flow, or Zoho Projects via webhooks.",
    color: "bg-red-600",
    letter: "Z",
    logo: "zoho",
    webhookCompatible: true,
  },
  {
    id: "airtable",
    name: "Airtable",
    description:
      "Automatically push registrations, submissions, and event data to Airtable bases via webhooks.",
    color: "bg-blue-500",
    letter: "A",
    logo: "airtable",
    webhookCompatible: true,
  },
  {
    id: "make",
    name: "Make (Integromat)",
    description:
      "Build powerful automations by connecting CloudHub events to 1,500+ apps via Make webhooks.",
    color: "bg-violet-600",
    letter: "M",
    webhookCompatible: true,
  },
  {
    id: "n8n",
    name: "n8n",
    description:
      "Self-hosted workflow automation — receive CloudHub events via webhook triggers.",
    color: "bg-rose-600",
    letter: "n",
    webhookCompatible: true,
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description:
      "Push attendee registrations into HubSpot CRM contacts and deals via webhooks.",
    color: "bg-orange-600",
    letter: "H",
    webhookCompatible: true,
  },
];

const webhookEvents = [
  { event: "event.registration.created", description: "New event registration" },
  { event: "event.registration.cancelled", description: "Event registration cancelled" },
  { event: "event.guest.status_changed", description: "Guest status updated by organizer" },
  { event: "hackathon.registration.created", description: "New hackathon registration" },
  { event: "hackathon.registration.cancelled", description: "Hackathon registration cancelled" },
  { event: "hackathon.participant.status_changed", description: "Participant status changed" },
  { event: "submission.created", description: "New submission created" },
  { event: "submission.updated", description: "Submission updated" },
  { event: "submission.submitted", description: "Submission finalized" },
  { event: "submission.scored", description: "Submission scored by a judge" },
];

const defaultConnected = new Set(["github", "slack"]);

// SVG logos for specific integrations
function IntegrationLogo({ integration }: { integration: Integration }) {
  if (integration.logo === "zoho") {
    return (
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-label="Zoho logo">
        <rect width="40" height="40" rx="8" fill="#E42527" />
        <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontWeight="bold" fontSize="18" fontFamily="system-ui">Z</text>
      </svg>
    );
  }
  if (integration.logo === "airtable") {
    return (
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-label="Airtable logo">
        <rect width="40" height="40" rx="8" fill="#18BFFF" />
        <path d="M8 14l12-6 12 6v4L20 24 8 18v-4z" fill="#FCB400" opacity="0.9" />
        <path d="M20 24v10l12-6V18L20 24z" fill="#18BFFF" />
        <path d="M20 24v10L8 28V18l12 6z" fill="#F82B60" opacity="0.85" />
      </svg>
    );
  }
  return (
    <div
      className={cn(
        "h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg",
        integration.color
      )}
    >
      {integration.letter}
    </div>
  );
}

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

          {/* Webhook-powered Integrations Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Webhook className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-display font-semibold text-lg mb-1">
                      Webhooks — Connect to Any Platform
                    </h2>
                    <p className="text-sm text-muted-foreground mb-3">
                      CloudHub sends real-time HTTP notifications to your endpoints when
                      registrations, submissions, and status changes happen. Connect to
                      Zoho, Airtable, Zapier, Make, HubSpot, or any custom backend.
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {integrations
                        .filter((i) => i.webhookCompatible)
                        .map((i) => (
                          <Badge key={i.id} variant="secondary" className="text-xs">
                            {i.name}
                          </Badge>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href="/dashboard/settings/api-keys">
                        <Button size="sm" variant="default">
                          <Webhook className="h-4 w-4 mr-1.5" />
                          Manage Webhooks
                        </Button>
                      </Link>
                      <Link href="/docs/api">
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-4 w-4 mr-1.5" />
                          API Docs
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Webhook Event Types */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8"
          >
            <h2 className="font-display font-semibold text-xl mb-3">Webhook Events</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Subscribe to any combination of these events when creating a webhook endpoint.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {webhookEvents.map((we) => (
                <div
                  key={we.event}
                  className="flex items-center gap-3 rounded-lg border px-4 py-3 bg-card"
                >
                  <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded whitespace-nowrap">
                    {we.event}
                  </code>
                  <span className="text-sm text-muted-foreground truncate">
                    {we.description}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Integration Grid */}
          <h2 className="font-display font-semibold text-xl mb-4">All Integrations</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration, i) => {
              const isConnected = connected.has(integration.id);
              const isConfirming = confirming === integration.id;

              return (
                <motion.div
                  key={integration.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.04 }}
                >
                  <Card className="h-full">
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-4">
                        {integration.logo ? (
                          <IntegrationLogo integration={integration} />
                        ) : (
                          <div
                            className={cn(
                              "h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg",
                              integration.color
                            )}
                          >
                            {integration.letter}
                          </div>
                        )}
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            variant={isConnected ? "success" : "muted"}
                            dot
                            pulse={isConnected}
                          >
                            {isConnected ? "Connected" : "Not Connected"}
                          </Badge>
                          {integration.webhookCompatible && (
                            <Badge variant="secondary" className="text-[10px]">
                              Webhook
                            </Badge>
                          )}
                        </div>
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
