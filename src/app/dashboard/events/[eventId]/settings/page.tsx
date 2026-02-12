"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Globe,
  Lock,
  EyeOff,
  Link2,
  Copy,
  UserCog,
  CopyPlus,
  AlertTriangle,
  XCircle,
  Trash2,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { mockEvents } from "@/lib/mock-data";
import { toast } from "sonner";

export default function SettingsPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const event = mockEvents.find((e) => e.id === eventId);

  const [visibility, setVisibility] = React.useState("public");
  const [transferEmail, setTransferEmail] = React.useState("");

  if (!event) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <h2 className="font-display text-2xl font-bold mb-2">Event not found</h2>
              <p className="text-muted-foreground mb-6">
                The event you are looking for does not exist or has been removed.
              </p>
              <Button asChild>
                <Link href="/dashboard/events">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to My Events
                </Link>
              </Button>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  const eventUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/events/${event.slug}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(eventUrl);
    toast.success("Event URL copied to clipboard!");
  };

  const handleTransfer = () => {
    if (!transferEmail.trim()) {
      toast.error("Please enter an email address.");
      return;
    }
    toast.success(`Ownership transfer request sent to ${transferEmail}!`);
    setTransferEmail("");
  };

  const handleDuplicate = () => {
    toast.success("Event duplicated! You can find it in your events list.");
  };

  const handleCancel = () => {
    if (window.confirm("Are you sure you want to cancel this event? All attendees will be notified.")) {
      toast.success("Event has been cancelled. All attendees have been notified.");
    }
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to permanently delete this event? This action cannot be undone.")) {
      toast.success("Event has been deleted permanently.");
    }
  };

  const visibilityOptions = [
    {
      value: "public",
      label: "Public",
      description: "Anyone can find and view this event",
      icon: Globe,
    },
    {
      value: "private",
      label: "Private",
      description: "Only invited guests can view this event",
      icon: Lock,
    },
    {
      value: "unlisted",
      label: "Unlisted",
      description: "Only people with the link can view this event",
      icon: EyeOff,
    },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/events/${eventId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Overview
              </Link>
            </Button>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-1">{event.title}</p>
          </motion.div>

          <div className="max-w-3xl space-y-6">
            {/* Visibility */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Visibility</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {visibilityOptions.map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all",
                        visibility === option.value
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value={option.value}
                        checked={visibility === option.value}
                        onChange={(e) => setVisibility(e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <option.icon className="h-4 w-4" />
                          <span className="font-medium">{option.label}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {option.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Event URL */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Event URL</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={eventUrl}
                      className="font-mono text-sm"
                    />
                    <Button variant="outline" onClick={handleCopyUrl}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Transfer Ownership */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <UserCog className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Transfer Ownership</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Transfer this event to another user. They will receive full
                    management access.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Enter email address..."
                      value={transferEmail}
                      onChange={(e) => setTransferEmail(e.target.value)}
                    />
                    <Button variant="outline" onClick={handleTransfer}>
                      Transfer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Duplicate Event */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CopyPlus className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Duplicate Event</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a copy of this event with the same settings. The
                    duplicate will be created as a draft.
                  </p>
                  <Button variant="outline" onClick={handleDuplicate}>
                    <CopyPlus className="h-4 w-4 mr-2" />
                    Duplicate Event
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Danger Zone */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card className="border-destructive/50">
                <CardHeader>
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    <CardTitle className="text-lg text-destructive">
                      Danger Zone
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-destructive/20">
                    <div>
                      <h4 className="font-medium">Cancel Event</h4>
                      <p className="text-sm text-muted-foreground">
                        Cancel this event and notify all registered attendees.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive shrink-0"
                      onClick={handleCancel}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Event
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-destructive/20">
                    <div>
                      <h4 className="font-medium">Delete Event</h4>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete this event. This action cannot be
                        undone.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      className="shrink-0"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Event
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
