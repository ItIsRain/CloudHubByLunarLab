"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Inbox, Users, Clock, CheckCircle2, XCircle, Settings2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";
import type { MentorSession } from "@/lib/types";
import { useMentorBookings, useMyMentorships, useUpdateMentorBooking } from "@/hooks/use-mentorship";
import { ManageBookingDialog } from "./manage-booking-dialog";

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function BookingRow({
  booking,
  hackathonId,
  onManage,
}: {
  booking: MentorSession;
  hackathonId: string;
  onManage: (b: MentorSession) => void;
}) {
  const update = useUpdateMentorBooking(hackathonId);
  const label = booking.team?.name || booking.mentee?.name || "Participant";

  function act(status: "confirmed" | "cancelled") {
    update.mutate(
      { sessionId: booking.id, status },
      {
        onSuccess: () =>
          toast.success(status === "confirmed" ? "Approved." : "Declined."),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Failed to update."),
      }
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar size="sm">
              <AvatarImage src={booking.mentee?.avatar} alt={label} />
              <AvatarFallback>{getInitials(label)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate flex items-center gap-1.5">
                {label}
                {booking.team && (
                  <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0 h-4">
                    <Users className="h-2.5 w-2.5" />
                    Team
                  </Badge>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(booking.sessionDate)} · {booking.durationMinutes}m
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {booking.status === "pending" ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs text-green-600"
                  onClick={() => act("confirmed")}
                  disabled={update.isPending}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs text-red-600"
                  onClick={() => act("cancelled")}
                  disabled={update.isPending}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Decline
                </Button>
              </>
            ) : booking.status === "confirmed" ? (
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onManage(booking)}>
                <Settings2 className="h-3.5 w-3.5 mr-1" />
                Manage booking
              </Button>
            ) : (
              <Badge variant="muted" className="capitalize text-xs">
                {booking.status}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
        <Inbox className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function BookingsList({ hackathonId }: { hackathonId: string }) {
  const { data, isLoading } = useMentorBookings(hackathonId);
  const { data: mentorshipsData } = useMyMentorships();
  const mentorship = mentorshipsData?.data?.find((m) => m.hackathonId === hackathonId);

  const [managing, setManaging] = React.useState<MentorSession | null>(null);

  const bookings = data?.data ?? [];
  const pending = bookings.filter((b) => b.status === "pending");
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const past = bookings.filter(
    (b) => !["pending", "confirmed"].includes(b.status)
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="shimmer rounded-xl h-16 w-full" />
        ))}
      </div>
    );
  }

  const rows = (list: MentorSession[], empty: string) =>
    list.length === 0 ? (
      <EmptyState label={empty} />
    ) : (
      <div className="space-y-3">
        {list.map((b) => (
          <BookingRow key={b.id} booking={b} hackathonId={hackathonId} onManage={setManaging} />
        ))}
      </div>
    );

  return (
    <>
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Pending
            {pending.length > 0 && (
              <Badge variant="warning" className="ml-1 h-4 px-1.5 text-[10px]">
                {pending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed ({confirmed.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">{rows(pending, "No pending requests.")}</TabsContent>
        <TabsContent value="confirmed">{rows(confirmed, "No confirmed sessions yet.")}</TabsContent>
        <TabsContent value="past">{rows(past, "No past sessions.")}</TabsContent>
      </Tabs>

      <ManageBookingDialog
        open={!!managing}
        onOpenChange={(o) => !o && setManaging(null)}
        booking={managing}
        hackathonId={hackathonId}
        defaultUrl={mentorship?.defaultMeetingUrl}
        defaultPhone={mentorship?.defaultMeetingPhone}
      />
    </>
  );
}
