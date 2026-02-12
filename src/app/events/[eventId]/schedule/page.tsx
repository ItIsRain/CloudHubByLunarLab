"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  MapPin,
  CalendarDays,
  Coffee,
  Mic,
  Users,
  Wrench,
  MessageSquare,
  Star,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatDate, formatTime, getInitials } from "@/lib/utils";
import { mockEvents } from "@/lib/mock-data";
import type { AgendaSession } from "@/lib/types";

const sessionTypeConfig: Record<
  AgendaSession["type"],
  { icon: React.ElementType; color: string; label: string }
> = {
  keynote: { icon: Star, color: "bg-yellow-500/10 text-yellow-600", label: "Keynote" },
  talk: { icon: Mic, color: "bg-blue-500/10 text-blue-600", label: "Talk" },
  workshop: { icon: Wrench, color: "bg-green-500/10 text-green-600", label: "Workshop" },
  panel: { icon: MessageSquare, color: "bg-purple-500/10 text-purple-600", label: "Panel" },
  networking: { icon: Users, color: "bg-pink-500/10 text-pink-600", label: "Networking" },
  break: { icon: Coffee, color: "bg-orange-500/10 text-orange-600", label: "Break" },
};

// Mock multi-day sessions for events with no agenda
const mockSessions: AgendaSession[] = [
  {
    id: "mock-s1",
    title: "Registration & Welcome Coffee",
    startTime: "2025-01-01T08:30:00",
    endTime: "2025-01-01T09:00:00",
    type: "break",
    speakers: [],
  },
  {
    id: "mock-s2",
    title: "Opening Keynote",
    description: "Welcome address and overview of the event themes.",
    startTime: "2025-01-01T09:00:00",
    endTime: "2025-01-01T10:00:00",
    room: "Main Hall",
    type: "keynote",
    speakers: [],
  },
  {
    id: "mock-s3",
    title: "Building Scalable Systems",
    description: "Learn how to design and build systems that handle millions of users.",
    startTime: "2025-01-01T10:30:00",
    endTime: "2025-01-01T12:00:00",
    room: "Room A",
    type: "workshop",
    speakers: [],
  },
  {
    id: "mock-s4",
    title: "Lunch Break",
    startTime: "2025-01-01T12:00:00",
    endTime: "2025-01-01T13:00:00",
    type: "break",
    speakers: [],
  },
  {
    id: "mock-s5",
    title: "The Future of Web Development",
    description: "Expert panel discussing emerging trends and technologies.",
    startTime: "2025-01-01T13:00:00",
    endTime: "2025-01-01T14:30:00",
    room: "Main Hall",
    type: "panel",
    speakers: [],
  },
  {
    id: "mock-s6",
    title: "Networking Happy Hour",
    description: "Connect with fellow attendees over drinks and appetizers.",
    startTime: "2025-01-01T16:00:00",
    endTime: "2025-01-01T18:00:00",
    type: "networking",
    speakers: [],
  },
];

export default function SchedulePage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const event = mockEvents.find((e) => e.id === eventId || e.slug === eventId);

  const [activeDay, setActiveDay] = React.useState(0);

  if (!event) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-24"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
                <CalendarDays className="h-10 w-10 text-muted-foreground" />
              </div>
              <h1 className="font-display text-3xl font-bold mb-4">Event Not Found</h1>
              <p className="text-muted-foreground mb-8">
                The event you are looking for does not exist or has been removed.
              </p>
              <Button asChild>
                <Link href="/explore">Browse Events</Link>
              </Button>
            </motion.div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const sessions = event.agenda.length > 0 ? event.agenda : mockSessions;

  // Group sessions by day
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const dayCount = Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  const days = Array.from({ length: dayCount }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return date;
  });

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <Link
              href={`/events/${event.slug}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {event.title}
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-10"
          >
            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">
              Event Schedule
            </h1>
            <p className="text-muted-foreground">{event.title}</p>
          </motion.div>

          {/* Day Tabs */}
          {dayCount > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex gap-2 mb-8 overflow-x-auto pb-2"
            >
              {days.map((day, i) => (
                <Button
                  key={i}
                  variant={activeDay === i ? "default" : "outline"}
                  onClick={() => setActiveDay(i)}
                  className="shrink-0"
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Day {i + 1} - {formatDate(day)}
                </Button>
              ))}
            </motion.div>
          )}

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-border hidden sm:block" />

            <div className="space-y-6">
              {sessions.map((session, i) => {
                const config = sessionTypeConfig[session.type];
                const Icon = config.icon;
                const sessionTime = new Date(session.startTime);
                const endTime = new Date(session.endTime);

                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative flex gap-4 sm:gap-6"
                  >
                    {/* Timeline dot */}
                    <div className="hidden sm:flex flex-col items-center shrink-0">
                      <div
                        className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center z-10",
                          config.color
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>

                    {/* Content */}
                    <div
                      className={cn(
                        "flex-1 rounded-2xl border bg-card p-5 transition-all hover:shadow-md",
                        session.type === "break" && "bg-muted/50"
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="secondary"
                              className={cn("text-xs", config.color)}
                            >
                              {config.label}
                            </Badge>
                            {session.room && (
                              <Badge variant="outline" className="text-xs">
                                <MapPin className="h-3 w-3 mr-1" />
                                {session.room}
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-display text-lg font-bold">
                            {session.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                          <Clock className="h-4 w-4" />
                          {sessionTime.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}{" "}
                          -{" "}
                          {endTime.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </div>
                      </div>

                      {session.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {session.description}
                        </p>
                      )}

                      {session.speakers.length > 0 && (
                        <div className="flex items-center gap-2 pt-3 border-t">
                          {session.speakers.map((speaker) => (
                            <div
                              key={speaker.id}
                              className="flex items-center gap-2"
                            >
                              <Avatar size="sm">
                                <AvatarImage
                                  src={speaker.avatar}
                                  alt={speaker.name}
                                />
                                <AvatarFallback>
                                  {getInitials(speaker.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">
                                  {speaker.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {speaker.title}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
