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
  Copy,
  ToggleLeft,
  ToggleRight,
  UserCog,
  Copy as CopyIcon,
  Trash2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { mockHackathons } from "@/lib/mock-data";
import { toast } from "sonner";

type Visibility = "public" | "private" | "unlisted";

export default function SettingsPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;
  const hackathon = mockHackathons.find((h) => h.id === hackathonId);

  const [visibility, setVisibility] = React.useState<Visibility>("public");
  const [registrationOpen, setRegistrationOpen] = React.useState(true);

  if (!hackathon) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h2 className="font-display text-2xl font-bold mb-2">Hackathon Not Found</h2>
            <Link href="/dashboard/hackathons">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        </main>
      </>
    );
  }

  const hackathonUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/hackathons/${hackathon.slug}`
      : `/hackathons/${hackathon.slug}`;

  const handleCopyUrl = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(hackathonUrl);
      toast.success("URL copied to clipboard!");
    }
  };

  const handleCancelHackathon = () => {
    if (window.confirm("Are you sure you want to cancel this hackathon? This action cannot be undone.")) {
      toast.success("Hackathon has been cancelled.");
    }
  };

  const handleDeleteHackathon = () => {
    if (window.confirm("Are you sure you want to permanently delete this hackathon? All data will be lost. This action cannot be undone.")) {
      toast.success("Hackathon has been deleted.");
    }
  };

  const visibilityOptions: { value: Visibility; label: string; description: string; icon: React.ElementType }[] = [
    {
      value: "public",
      label: "Public",
      description: "Visible to everyone. Appears in search results and explore page.",
      icon: Globe,
    },
    {
      value: "private",
      label: "Private",
      description: "Only visible to invited participants.",
      icon: Lock,
    },
    {
      value: "unlisted",
      label: "Unlisted",
      description: "Accessible via direct link only. Not shown in search or explore.",
      icon: EyeOff,
    },
  ];

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link
            href={`/dashboard/hackathons/${hackathonId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Overview
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure settings for {hackathon.name}
          </p>
        </motion.div>

        <div className="space-y-8">
          {/* Visibility */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Visibility</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {visibilityOptions.map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                        visibility === option.value
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-muted/30 hover:bg-muted/50"
                      )}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value={option.value}
                        checked={visibility === option.value}
                        onChange={() => {
                          setVisibility(option.value);
                          toast.success(`Visibility set to ${option.label}`);
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <option.icon className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">
                            {option.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {option.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* URL */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hackathon URL</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Input
                    value={hackathonUrl}
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button variant="outline" onClick={handleCopyUrl}>
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Registration Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Registration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      Registration Status
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {registrationOpen
                        ? "New participants can register for the hackathon."
                        : "Registration is closed. No new participants can join."}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setRegistrationOpen(!registrationOpen);
                      toast.success(
                        registrationOpen
                          ? "Registration closed."
                          : "Registration opened."
                      );
                    }}
                    className="flex items-center gap-2"
                  >
                    {registrationOpen ? (
                      <ToggleRight className="h-8 w-8 text-primary" />
                    ) : (
                      <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                    )}
                    <Badge variant={registrationOpen ? "success" : "muted"}>
                      {registrationOpen ? "Open" : "Closed"}
                    </Badge>
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Transfer & Duplicate */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                  <div>
                    <p className="font-medium text-sm">Transfer Ownership</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Transfer this hackathon to another organizer.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast.success("Ownership transfer feature coming soon!")
                    }
                  >
                    <UserCog className="h-4 w-4" />
                    Transfer
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                  <div>
                    <p className="font-medium text-sm">Duplicate Hackathon</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Create a copy of this hackathon with all settings.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast.success("Hackathon duplicated successfully!")
                    }
                  >
                    <CopyIcon className="h-4 w-4" />
                    Duplicate
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Danger Zone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-lg text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-destructive/20 bg-destructive/5">
                  <div>
                    <p className="font-medium text-sm">Cancel Hackathon</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cancel this hackathon. Participants will be notified.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-destructive/50 text-destructive hover:bg-destructive/10"
                    onClick={handleCancelHackathon}
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-destructive/20 bg-destructive/5">
                  <div>
                    <p className="font-medium text-sm">Delete Hackathon</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Permanently delete this hackathon and all associated data.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteHackathon}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </>
  );
}
