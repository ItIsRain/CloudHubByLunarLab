"use client";

import * as React from "react";
import { Loader2, Users, User as UserIcon, CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import type { HackathonMentor, MentorBookableSlot } from "@/lib/types";
import { useHackathonTeams } from "@/hooks/use-teams";
import { useMentorBookableSlots, useRequestMentorBooking } from "@/hooks/use-mentorship";

export function MentorSessionBookingDialog({
  open,
  onOpenChange,
  hackathonId,
  mentor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hackathonId: string;
  mentor: HackathonMentor | null;
}) {
  const user = useAuthStore((s) => s.user);
  const { data: slotsData, isLoading } = useMentorBookableSlots(
    hackathonId,
    mentor?.id,
    open
  );
  const { data: teamsData } = useHackathonTeams(open ? hackathonId : undefined);
  const request = useRequestMentorBooking(hackathonId);

  const [selected, setSelected] = React.useState<MentorBookableSlot | null>(null);
  const [topic, setTopic] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setSelected(null);
      setTopic("");
    }
  }, [open]);

  // Detect the participant's team in this hackathon (for display only — the
  // server re-derives and is the source of truth).
  const myTeam = React.useMemo(() => {
    if (!user) return null;
    return (
      teamsData?.data?.find((t) => t.members?.some((m) => m.user.id === user.id)) ?? null
    );
  }, [teamsData, user]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, MentorBookableSlot[]>();
    for (const s of slotsData?.data ?? []) {
      const arr = map.get(s.date) ?? [];
      arr.push(s);
      map.set(s.date, arr);
    }
    return [...map.entries()];
  }, [slotsData]);

  if (!mentor) return null;
  const mentorName = mentor.user?.name || mentor.name;

  async function submit() {
    if (!mentor || !selected) return;
    try {
      await request.mutateAsync({
        mentorId: mentor.id,
        blockId: selected.blockId,
        start: selected.start,
        topic: topic.trim() || undefined,
      });
      toast.success("Request sent — waiting for the mentor to approve.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to request booking.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Book {mentorName}</DialogTitle>
          <DialogDescription>
            Choose an open slot. The mentor will confirm your request.
          </DialogDescription>
        </DialogHeader>

        {/* Booking-as banner */}
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          {myTeam ? (
            <>
              <Users className="h-4 w-4 text-primary" />
              Booking as <strong>{myTeam.name}</strong>
            </>
          ) : (
            <>
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              Booking as <strong>{user?.name ?? "you"}</strong>
            </>
          )}
        </div>

        {/* Slots */}
        <div className="max-h-[320px] overflow-y-auto pr-1 space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="shimmer rounded-lg h-10 w-full" />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No open slots right now.</p>
            </div>
          ) : (
            grouped.map(([date, daySlots]) => (
              <div key={date}>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  {formatDate(date)}{" "}
                  <span className="text-muted-foreground/60">({daySlots[0].timezone})</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {daySlots.map((slot) => {
                    const isSel = selected?.start === slot.start;
                    return (
                      <button
                        key={slot.start}
                        type="button"
                        onClick={() => setSelected(slot)}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-sm font-mono transition-all",
                          isSel
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input hover:bg-muted/50"
                        )}
                      >
                        {slot.startTime}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Topic */}
        {grouped.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              What do you want help with? (optional)
            </label>
            <textarea
              rows={2}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Feedback on our architecture…"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </div>
        )}

        <DialogFooter>
          {selected && (
            <Badge variant="outline" className="mr-auto self-center text-xs">
              {formatDate(selected.date)} · {selected.startTime} ({selected.durationMinutes}m)
            </Badge>
          )}
          <Button onClick={submit} disabled={!selected || request.isPending}>
            {request.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Request Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
