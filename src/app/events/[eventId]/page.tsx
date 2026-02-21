"use client";

import * as React from "react";
import { useParams, notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Calendar,
  Check,
  Clock,
  MapPin,
  Users,
  Globe,
  Bookmark,
  BookmarkCheck,
  Share2,
  CalendarPlus,
  Ticket,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Twitter,
  Linkedin,
  Pencil,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RegisterEventDialog } from "@/components/dialogs/register-event-dialog";
import { ShareDialog } from "@/components/dialogs/share-dialog";
import { AddToCalendarDialog } from "@/components/dialogs/add-to-calendar-dialog";
import { EventCard } from "@/components/cards/event-card";
import { useEvent, useEvents } from "@/hooks/use-events";
import { useEventRegistration, useCancelEventRegistration } from "@/hooks/use-registrations";
import { useEventGuests } from "@/hooks/use-event-guests";
import { useBookmarkIds, useToggleBookmark } from "@/hooks/use-bookmarks";
import { useAuthStore } from "@/store/auth-store";
import { cn, formatDate, formatTime, formatCurrency, getInitials } from "@/lib/utils";
import type { AgendaSession } from "@/lib/types";

const sessionTypeColors: Record<AgendaSession["type"], string> = {
  keynote: "border-l-amber-500",
  talk: "border-l-blue-500",
  workshop: "border-l-green-500",
  panel: "border-l-purple-500",
  break: "border-l-muted-foreground",
  networking: "border-l-pink-500",
};

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const { data: eventData, isLoading } = useEvent(eventId);
  const event = eventData?.data;
  const relatedFilters = event ? { category: [event.category], pageSize: 4 } : undefined;
  const { data: relatedData } = useEvents(relatedFilters);
  const relatedEventsAll = relatedData?.data || [];

  const { user, isAuthenticated } = useAuthStore();
  const isOrganizer = !!(user && event && user.id === event.organizerId);
  const { data: regData } = useEventRegistration(event?.id);
  const isRegistered = regData?.registered ?? false;
  const cancelRegistration = useCancelEventRegistration();

  const { data: guestsData } = useEventGuests(event?.id);
  const attendees = React.useMemo(() => {
    const guests = guestsData?.data ?? [];
    return guests
      .filter((g) => g.status === "confirmed" || g.status === "checked-in")
      .filter((g) => g.user != null);
  }, [guestsData]);

  const { bookmarkIds } = useBookmarkIds("event");
  const toggleBookmark = useToggleBookmark();
  const isBookmarked = event ? bookmarkIds.has(event.id) : false;
  const [registerOpen, setRegisterOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [faqOpen, setFaqOpen] = React.useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="h-[400px] rounded-2xl shimmer" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 rounded-2xl shimmer" />
                <div className="h-48 rounded-2xl shimmer" />
              </div>
              <div className="space-y-6">
                <div className="h-72 rounded-2xl shimmer" />
                <div className="h-40 rounded-2xl shimmer" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16 text-center">
          <div className="mx-auto max-w-md">
            <Calendar className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h1 className="font-display text-3xl font-bold mb-2">Event Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The event you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Button asChild>
              <Link href="/explore">Browse Events</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const isFree = event.tickets.every((t) => t.price === 0);
  const lowestPrice = Math.min(...event.tickets.map((t) => t.price));
  const relatedEvents = relatedEventsAll.filter((e) => e.id !== event.id).slice(0, 3);
  const faqItems = event.faq ?? [];

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      {/* Hero */}
      <div className="relative h-[400px] overflow-hidden">
        <Image
          src={event.coverImage || "/placeholder-event.jpg"}
          alt={event.title}
          fill
          className="object-cover"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

        {/* Floating Action Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-6 left-0 right-0"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div className="text-white">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-white/20 text-white border-none">
                  {event.category}
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white border-none">
                  {event.type}
                </Badge>
                {event.isFeatured && <Badge className="bg-primary">Featured</Badge>}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold mb-1">{event.title}</h1>
              {event.tagline && <p className="text-white/80 text-lg">{event.tagline}</p>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => { if (event) toggleBookmark.mutate({ entityType: "event", entityId: event.id }); }}
              >
                {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => setShareOpen(true)}
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => setCalendarOpen(true)}
              >
                <CalendarPlus className="h-4 w-4" />
              </Button>
              {isOrganizer ? (
                <>
                  <Button size="sm" asChild>
                    <Link href={`/dashboard/events/${event.id}?tab=edit`}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Event
                    </Link>
                  </Button>
                  <Button size="sm" variant="secondary" asChild>
                    <Link href={`/dashboard/events/${event.id}`}>
                      <Settings className="h-4 w-4 mr-2" />
                      Manage
                    </Link>
                  </Button>
                </>
              ) : isRegistered ? (
                <Button size="sm" variant="secondary" onClick={async () => {
                  if (event) {
                    await cancelRegistration.mutateAsync(event.id);
                    toast.success("Registration cancelled");
                  }
                }}>
                  <Check className="h-4 w-4 mr-2" />
                  Registered
                </Button>
              ) : (
                <Button size="sm" onClick={() => {
                  if (!isAuthenticated) { toast.error("Please sign in to register"); return; }
                  setRegisterOpen(true);
                }}>
                  <Ticket className="h-4 w-4 mr-2" />
                  Register
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <main className="pt-8 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>About this event</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:my-1"
                      dangerouslySetInnerHTML={{ __html: event.description }}
                    />
                  </CardContent>
                </Card>
              </motion.div>

              {/* Speakers */}
              {event.speakers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Speakers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {event.speakers.map((speaker, i) => (
                          <motion.div
                            key={speaker.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center gap-4 p-4 rounded-lg bg-muted/50"
                          >
                            <Avatar className="h-14 w-14">
                              <AvatarImage src={speaker.avatar} />
                              <AvatarFallback>{speaker.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{speaker.name}</p>
                              <p className="text-sm text-muted-foreground">{speaker.title}</p>
                              {speaker.company && (
                                <p className="text-xs text-muted-foreground">{speaker.company}</p>
                              )}
                              <div className="flex gap-2 mt-1">
                                {speaker.twitter && (
                                  <a href={`https://twitter.com/${speaker.twitter}`} target="_blank" rel="noopener noreferrer">
                                    <Twitter className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                  </a>
                                )}
                                {speaker.linkedin && (
                                  <a href={`https://linkedin.com/in/${speaker.linkedin}`} target="_blank" rel="noopener noreferrer">
                                    <Linkedin className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Schedule */}
              {event.agenda.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Schedule</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {event.agenda.map((session, i) => (
                          <motion.div
                            key={session.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={cn(
                              "border-l-4 pl-4 py-3",
                              sessionTypeColors[session.type]
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">{session.type}</Badge>
                                  {session.room && (
                                    <span className="text-xs text-muted-foreground">{session.room}</span>
                                  )}
                                </div>
                                <h4 className="font-medium">{session.title}</h4>
                                {session.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{session.description}</p>
                                )}
                                {session.speakers.length > 0 && (
                                  <div className="flex items-center gap-2 mt-2">
                                    {session.speakers.map((s) => (
                                      <div key={s.id} className="flex items-center gap-1.5">
                                        <Avatar className="h-5 w-5">
                                          <AvatarImage src={s.avatar} />
                                          <AvatarFallback className="text-[10px]">{s.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs">{s.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="text-right text-sm text-muted-foreground flex-shrink-0 ml-4">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {formatTime(session.startTime)}
                                </div>
                                <div className="text-xs">to {formatTime(session.endTime)}</div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* FAQ */}
              {faqItems.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>FAQ</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {faqItems.map((item, i) => (
                        <div key={i} className="border rounded-lg">
                          <button
                            type="button"
                            onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                            className="w-full flex items-center justify-between p-4 text-left"
                          >
                            <span className="font-medium text-sm">{item.question}</span>
                            {faqOpen === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                          {faqOpen === i && (
                            <div className="px-4 pb-4 text-sm text-muted-foreground">
                              {item.answer}
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Event Info Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <Card className="sticky top-24">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{formatDate(event.startDate)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(event.startDate)} — {formatTime(event.endDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        {event.type === "online" ? (
                          <Globe className="h-5 w-5 text-primary" />
                        ) : (
                          <MapPin className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        {event.type === "online" ? (
                          <>
                            <p className="text-sm font-medium">Online Event</p>
                            <p className="text-xs text-muted-foreground">{event.location.platform}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium">{event.location.address}</p>
                            <p className="text-xs text-muted-foreground">
                              {event.location.city}, {event.location.country}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{event.registrationCount} registered</p>
                        {event.capacity && (
                          <p className="text-xs text-muted-foreground">of {event.capacity} capacity</p>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Tickets</p>
                      {event.tickets.map((ticket) => (
                        <div key={ticket.id} className="flex items-center justify-between py-1.5 text-sm">
                          <span>{ticket.name}</span>
                          <span className="font-medium">
                            {ticket.price === 0 ? "Free" : formatCurrency(ticket.price, ticket.currency)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {isOrganizer ? (
                      <div className="space-y-2">
                        <Button className="w-full" asChild>
                          <Link href={`/dashboard/events/${event.id}?tab=edit`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit Event
                          </Link>
                        </Button>
                        <Button className="w-full" variant="outline" asChild>
                          <Link href={`/dashboard/events/${event.id}`}>
                            <Settings className="h-4 w-4 mr-2" />
                            Manage Event
                          </Link>
                        </Button>
                      </div>
                    ) : isRegistered ? (
                      <Button className="w-full" variant="secondary" onClick={async () => {
                        if (event) {
                          await cancelRegistration.mutateAsync(event.id);
                          toast.success("Registration cancelled");
                        }
                      }}>
                        <Check className="h-4 w-4 mr-2" />
                        Registered
                      </Button>
                    ) : (
                      <Button className="w-full" onClick={() => {
                        if (!isAuthenticated) { toast.error("Please sign in to register"); return; }
                        setRegisterOpen(true);
                      }}>
                        <Ticket className="h-4 w-4 mr-2" />
                        {isFree ? "Register for Free" : `Register from ${formatCurrency(lowestPrice)}`}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Organizer */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Organized by</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/profile/${event.organizer.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                      <Avatar>
                        <AvatarImage src={event.organizer.avatar} />
                        <AvatarFallback>{event.organizer.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{event.organizer.name}</p>
                        <p className="text-xs text-muted-foreground">{event.organizer.headline}</p>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Attending Avatars */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Who&apos;s attending</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {attendees.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No attendees yet. Be the first to register!
                      </p>
                    ) : (
                      <>
                        <div className="flex -space-x-2 mb-2">
                          {attendees.slice(0, 8).map((guest) => (
                            <Avatar key={guest.id} className="h-8 w-8 border-2 border-background">
                              <AvatarImage src={guest.user!.avatar} />
                              <AvatarFallback className="text-[10px]">
                                {getInitials(guest.user!.name)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {attendees.length > 8 && (
                            <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                              +{attendees.length - 8}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {attendees.length} {attendees.length === 1 ? "person" : "people"} registered
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>

          {/* Related Events */}
          {relatedEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-12"
            >
              <h2 className="font-display text-2xl font-bold mb-6">Related Events</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedEvents.map((e, i) => (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.05 }}
                  >
                    <EventCard event={e} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Dialogs */}
      <RegisterEventDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        eventId={event.id}
        eventTitle={event.title}
        tickets={event.tickets}
      />
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        title={event.title}
        url={`https://cloudhub.dev/events/${event.slug}`}
      />
      <AddToCalendarDialog
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        title={event.title}
        startDate={event.startDate}
        endDate={event.endDate}
        location={event.location.address || "Online"}
      />
    </div>
  );
}
