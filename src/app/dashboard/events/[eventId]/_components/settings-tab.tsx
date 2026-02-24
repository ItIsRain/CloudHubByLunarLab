"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Globe,
  Lock,
  EyeOff,
  Copy,
  UserCog,
  Trash2,
  XCircle,
  AlertTriangle,
  Mail,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Event, EntityInvitation } from "@/lib/types";
import { useUpdateEvent, useDeleteEvent } from "@/hooks/use-events";
import {
  useEntityInvitations,
  useSendEntityInvitation,
  useRevokeEntityInvitation,
} from "@/hooks/use-invitations";
import { toast } from "sonner";

interface SettingsTabProps {
  event: Event;
  eventId: string;
}

type Visibility = "public" | "private" | "unlisted";

const visibilityOptions: {
  value: Visibility;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: "public",
    label: "Public",
    description: "Visible to everyone and listed in search results",
    icon: Globe,
  },
  {
    value: "private",
    label: "Private",
    description: "Only visible to invited attendees",
    icon: Lock,
  },
  {
    value: "unlisted",
    label: "Unlisted",
    description: "Accessible via link but not listed in search",
    icon: EyeOff,
  },
];

export function SettingsTab({ event, eventId }: SettingsTabProps) {
  const router = useRouter();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const [visibility, setVisibility] = React.useState<Visibility>(
    (event.visibility as Visibility) || "public"
  );

  // Invitation hooks
  const { data: invitations = [] } = useEntityInvitations("event", event.id, visibility === "private");
  const sendInvitation = useSendEntityInvitation();
  const revokeInvitation = useRevokeEntityInvitation();
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteName, setInviteName] = React.useState("");

  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteName) {
      toast.error("Both name and email are required.");
      return;
    }
    try {
      await sendInvitation.mutateAsync({
        entityType: "event",
        entityId: event.id,
        email: inviteEmail,
        name: inviteName,
      });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteName("");
    } catch {
      toast.error("Failed to send invitation.");
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    try {
      await revokeInvitation.mutateAsync(invitationId);
      toast.success("Invitation revoked.");
    } catch {
      toast.error("Failed to revoke invitation.");
    }
  };

  const eventUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/events/${event.slug}`
      : `/events/${event.slug}`;

  const handleVisibilityChange = async (newVisibility: Visibility) => {
    const previousVisibility = visibility;
    setVisibility(newVisibility);
    try {
      await updateEvent.mutateAsync({
        id: eventId,
        visibility: newVisibility,
      });
      toast.success(`Event visibility set to ${newVisibility}.`);
    } catch {
      setVisibility(previousVisibility);
      toast.error("Failed to update visibility.");
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      toast.success("URL copied to clipboard!");
    } catch {
      toast.error("Failed to copy URL.");
    }
  };

  const handleCancelEvent = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this event? This will notify all attendees."
    );
    if (!confirmed) return;

    try {
      await updateEvent.mutateAsync({
        id: eventId,
        status: "cancelled",
      });
      toast.success("Event has been cancelled.");
    } catch {
      toast.error("Failed to cancel event.");
    }
  };

  const handleDeleteEvent = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this event? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      await deleteEvent.mutateAsync(eventId);
      router.push("/dashboard/events");
      toast.success("Event deleted successfully.");
    } catch {
      toast.error("Failed to delete event.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="font-display text-2xl font-bold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage event visibility, URL, and danger zone options
        </p>
      </motion.div>

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
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {visibilityOptions.map((option) => {
                const isActive = visibility === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleVisibilityChange(option.value)}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all duration-200 hover:shadow-sm",
                      isActive
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <option.icon
                        className={cn(
                          "h-4 w-4",
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground"
                        )}
                      />
                      <span className="font-medium text-sm">
                        {option.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Invite Participants (only for private events) */}
      {visibility === "private" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.075 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Invite Participants
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendInvite}
                  disabled={sendInvitation.isPending}
                  className="gap-2 shrink-0"
                >
                  {sendInvitation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Send Invite
                </Button>
              </div>

              {invitations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Sent Invitations ({invitations.length})
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {invitations.map((inv: EntityInvitation) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {inv.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {inv.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={inv.status === "accepted" ? "success" : "muted"}
                          >
                            {inv.status}
                          </Badge>
                          {inv.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeInvite(inv.id)}
                              disabled={revokeInvitation.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Event URL */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Event URL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                value={eventUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                onClick={handleCopyUrl}
                className="gap-2 shrink-0"
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <p className="text-sm font-medium">Transfer Ownership</p>
                <p className="text-xs text-muted-foreground">
                  Transfer this event to another organizer
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() =>
                  toast.info("Transfer ownership feature coming soon.")
                }
              >
                <UserCog className="h-4 w-4" />
                Transfer
              </Button>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">Duplicate Event</p>
                <p className="text-xs text-muted-foreground">
                  Create a copy of this event with the same settings
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() =>
                  toast.info("Duplicate event feature coming soon.")
                }
              >
                <Copy className="h-4 w-4" />
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
        transition={{ delay: 0.2 }}
      >
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-destructive/20">
              <div>
                <p className="text-sm font-medium">Cancel Event</p>
                <p className="text-xs text-muted-foreground">
                  Cancel this event and notify all attendees
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={handleCancelEvent}
                disabled={
                  updateEvent.isPending || event.status === "cancelled"
                }
              >
                <XCircle className="h-4 w-4" />
                Cancel Event
              </Button>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">Delete Event</p>
                <p className="text-xs text-muted-foreground">
                  Permanently delete this event and all associated data
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={handleDeleteEvent}
                disabled={deleteEvent.isPending}
              >
                <Trash2 className="h-4 w-4" />
                {deleteEvent.isPending ? "Deleting..." : "Delete Event"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
