"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, ArrowLeft, MessageSquare, Users, Link2, Phone, Clock } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useHackathon } from "@/hooks/use-hackathons";
import { useHackathonMentors, useMyMentorBookings } from "@/hooks/use-mentorship";
import { useAuthStore } from "@/store/auth-store";
import { getInitials, safeHref } from "@/lib/utils";
import { MentorSessionBookingDialog } from "@/components/dialogs/mentor-session-booking-dialog";
import type { HackathonMentor, MentorSession } from "@/lib/types";

export default function HackathonMentorsPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: hackathonData, isLoading } = useHackathon(hackathonId);
  const hackathon = hackathonData?.data;

  const { data: mentorsData } = useHackathonMentors(hackathon?.id);
  const { data: myBookingsData } = useMyMentorBookings(hackathon?.id);

  const [bookingMentor, setBookingMentor] = React.useState<HackathonMentor | null>(null);

  // Latest booking per mentor (keyed by mentor user id).
  const bookingByMentor = React.useMemo(() => {
    const map = new Map<string, MentorSession>();
    for (const b of myBookingsData?.data ?? []) {
      const existing = map.get(b.mentorId);
      if (!existing || new Date(b.createdAt) > new Date(existing.createdAt)) {
        map.set(b.mentorId, b);
      }
    }
    return map;
  }, [myBookingsData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="shimmer rounded-xl h-96 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16 text-center">
          <div className="mx-auto max-w-md">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h1 className="font-display text-3xl font-bold mb-2">Hackathon Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The hackathon you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Button asChild>
              <Link href="/hackathons">Browse Competitions</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const mentors = mentorsData?.data ?? [];

  function handleBook(mentor: HackathonMentor) {
    if (!isAuthenticated) {
      toast.error("Please sign in to book a mentoring session.");
      return;
    }
    setBookingMentor(mentor);
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <Link
              href={`/hackathons/${hackathonId}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {hackathon.name}
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display text-4xl font-bold mb-2">Mentors</h1>
            <p className="text-muted-foreground text-lg">
              {mentors.length > 0
                ? `Book a 1:1 session with one of ${mentors.length} mentor${mentors.length !== 1 ? "s" : ""} at ${hackathon.name}`
                : `Mentors for ${hackathon.name}`}
            </p>
          </motion.div>

          {mentors.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-display text-lg font-bold mb-1">No mentors yet</h3>
              <p className="text-sm text-muted-foreground">
                Mentors will be announced as the hackathon approaches.
              </p>
            </motion.div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {mentors.map((mentor, i) => {
                const name = mentor.user?.name || mentor.name;
                const booking = mentor.userId ? bookingByMentor.get(mentor.userId) : undefined;
                return (
                  <motion.div
                    key={mentor.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="h-full hover:shadow-md transition-shadow">
                      <CardContent className="p-6 text-center flex flex-col h-full">
                        <Avatar className="h-20 w-20 mx-auto mb-4">
                          <AvatarImage src={mentor.user?.avatar} />
                          <AvatarFallback className="text-xl">{getInitials(name)}</AvatarFallback>
                        </Avatar>
                        <h3 className="font-display text-lg font-bold">{name}</h3>
                        {mentor.user?.headline && (
                          <p className="text-sm text-muted-foreground">{mentor.user.headline}</p>
                        )}
                        {mentor.bio && (
                          <p className="text-xs text-muted-foreground mt-3 line-clamp-3">{mentor.bio}</p>
                        )}
                        {mentor.expertise.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 justify-center mt-4">
                            {mentor.expertise.map((skill) => (
                              <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="mt-auto pt-5">
                          {booking ? (
                            <BookingStatus booking={booking} onRebook={() => handleBook(mentor)} />
                          ) : (
                            <Button size="sm" className="gap-1.5 w-full" onClick={() => handleBook(mentor)}>
                              <MessageSquare className="h-3.5 w-3.5" />
                              Book a Session
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <MentorSessionBookingDialog
        open={!!bookingMentor}
        onOpenChange={(o) => !o && setBookingMentor(null)}
        hackathonId={hackathonId}
        mentor={bookingMentor}
      />

      <Footer />
    </div>
  );
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function BookingStatus({ booking, onRebook }: { booking: MentorSession; onRebook: () => void }) {
  if (booking.status === "pending") {
    return (
      <Badge variant="warning" dot className="w-full justify-center py-1.5">
        <Clock className="h-3 w-3 mr-1" />
        Request pending
      </Badge>
    );
  }
  if (booking.status === "confirmed") {
    return (
      <div className="space-y-2">
        <Badge variant="success" className="w-full justify-center py-1.5">
          Confirmed · {formatDateTime(booking.sessionDate)}
        </Badge>
        {booking.meetingUrl && (
          <a
            href={safeHref(booking.meetingUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Link2 className="h-3 w-3" /> Join meeting
          </a>
        )}
        {booking.meetingPhone && (
          <a
            href={`tel:${booking.meetingPhone}`}
            className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:underline"
          >
            <Phone className="h-3 w-3" /> {booking.meetingPhone}
          </a>
        )}
      </div>
    );
  }
  // cancelled / declined / completed → allow a fresh request
  return (
    <Button size="sm" variant="outline" className="gap-1.5 w-full" onClick={onRebook}>
      <MessageSquare className="h-3.5 w-3.5" />
      Book again
    </Button>
  );
}
