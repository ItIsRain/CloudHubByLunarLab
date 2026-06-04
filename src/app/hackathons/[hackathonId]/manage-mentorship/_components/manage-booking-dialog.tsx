"use client";

import * as React from "react";
import { Loader2, Link2, Phone, CheckCircle2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { MentorSession } from "@/lib/types";
import { useUpdateMentorBooking } from "@/hooks/use-mentorship";

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function ManageBookingDialog({
  open,
  onOpenChange,
  booking,
  hackathonId,
  defaultUrl,
  defaultPhone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: MentorSession | null;
  hackathonId: string;
  defaultUrl?: string;
  defaultPhone?: string;
}) {
  const update = useUpdateMentorBooking(hackathonId);
  const [meetingUrl, setMeetingUrl] = React.useState("");
  const [meetingPhone, setMeetingPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (booking) {
      setMeetingUrl(booking.meetingUrl ?? "");
      setMeetingPhone(booking.meetingPhone ?? "");
      setNotes(booking.notes ?? "");
    }
  }, [booking]);

  if (!booking) return null;

  const bookerLabel = booking.team?.name || booking.mentee?.name || "Participant";
  const isPending = booking.status === "pending";

  async function save(extra?: { status?: string }) {
    if (!booking) return;
    try {
      await update.mutateAsync({
        sessionId: booking.id,
        meetingUrl: meetingUrl.trim() || null,
        meetingPhone: meetingPhone.trim() || null,
        notes: notes.trim() || null,
        ...extra,
      });
      toast.success(
        extra?.status === "confirmed"
          ? "Booking approved."
          : extra?.status === "cancelled"
            ? "Booking declined."
            : "Saved."
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update booking.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            Booking with {bookerLabel}
            <Badge variant={isPending ? "warning" : "success"} className="capitalize text-xs">
              {booking.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {formatDateTime(booking.sessionDate)} · {booking.durationMinutes} min
            {booking.team ? ` · Team ${booking.team.name}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {booking.title && booking.title !== "Mentoring session" && (
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Topic: </span>
              {booking.title}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> Meeting link
            </label>
            <Input
              type="url"
              placeholder="https://meet.google.com/…"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Phone (optional)
            </label>
            <Input
              type="tel"
              placeholder="+971 …"
              value={meetingPhone}
              onChange={(e) => setMeetingPhone(e.target.value)}
            />
          </div>

          {(defaultUrl || defaultPhone) && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => {
                if (defaultUrl) setMeetingUrl(defaultUrl);
                if (defaultPhone) setMeetingPhone(defaultPhone);
              }}
            >
              Use my default link/phone
            </button>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Notes (private)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isPending ? (
            <>
              <Button
                variant="outline"
                className="text-red-600"
                onClick={() => save({ status: "cancelled" })}
                disabled={update.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Decline
              </Button>
              <Button onClick={() => save({ status: "confirmed" })} disabled={update.isPending}>
                {update.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                )}
                Approve
              </Button>
            </>
          ) : booking.status === "confirmed" ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => save({ status: "no_show" })}
                disabled={update.isPending}
              >
                No-show
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => save({ status: "completed" })}
                disabled={update.isPending}
              >
                Mark completed
              </Button>
              <Button onClick={() => save()} disabled={update.isPending}>
                {update.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Save
              </Button>
            </>
          ) : (
            <Button onClick={() => save()} disabled={update.isPending}>
              {update.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Save
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
