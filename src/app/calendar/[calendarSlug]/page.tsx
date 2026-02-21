"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  MapPin,
  Bell,
  CalendarDays,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatDate, formatTime, getInitials, formatNumber } from "@/lib/utils";
import { mockCommunities } from "@/lib/mock-data";
import { useEvents } from "@/hooks/use-events";

type ViewMode = "calendar" | "list";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMonthData(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const days: (number | null)[] = [];

  // Add padding for days before the 1st
  for (let i = 0; i < startPadding; i++) {
    days.push(null);
  }

  // Add actual days
  for (let i = 1; i <= totalDays; i++) {
    days.push(i);
  }

  return days;
}

function getMonthName(month: number) {
  return new Date(2025, month).toLocaleString("en-US", { month: "long" });
}

export default function CommunityCalendarPage() {
  const params = useParams();
  const calendarSlug = params.calendarSlug as string;
  const community = mockCommunities.find((c) => c.slug === calendarSlug);
  const { data: eventsData } = useEvents();

  const [viewMode, setViewMode] = React.useState<ViewMode>("calendar");
  const now = new Date();
  const [currentMonth, setCurrentMonth] = React.useState(now.getMonth());
  const [currentYear, setCurrentYear] = React.useState(now.getFullYear());

  if (!community) {
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
              <h1 className="font-display text-3xl font-bold mb-4">
                Community Not Found
              </h1>
              <p className="text-muted-foreground mb-8">
                The community calendar you are looking for does not exist.
              </p>
              <Button asChild>
                <Link href="/explore">Browse Communities</Link>
              </Button>
            </motion.div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const events = (eventsData?.data || []).slice(0, 6);

  // Determine which dates have events (use day-of-month from startDate)
  const eventDates = new Set(
    events.map((e) => {
      const d = new Date(e.startDate);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  const monthDays = getMonthData(currentYear, currentMonth);

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Community Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <Card className="overflow-hidden">
              <div className="h-24 bg-gradient-to-r from-primary to-accent" />
              <CardContent className="p-6 -mt-8 relative">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-card border-4 border-card shadow-lg flex items-center justify-center">
                    {community.logo ? (
                      <Avatar size="xl" className="rounded-xl">
                        <AvatarImage src={community.logo} alt={community.name} />
                        <AvatarFallback className="rounded-xl">
                          {getInitials(community.name)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <span className="font-display text-xl font-bold text-primary">
                        {community.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h1 className="font-display text-2xl font-bold">
                      {community.name}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                      {community.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      <Users className="h-3 w-3 mr-1" />
                      {formatNumber(community.memberCount)} members
                    </Badge>
                    <Button
                      onClick={() =>
                        toast.success("Subscribed to calendar!")
                      }
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Subscribe
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* View Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex items-center justify-between mb-6"
          >
            <h2 className="font-display text-xl font-bold">Upcoming Events</h2>
            <div className="flex items-center gap-1 rounded-lg border p-1">
              <Button
                variant={viewMode === "calendar" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("calendar")}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Calendar
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4 mr-1" />
                List
              </Button>
            </div>
          </motion.div>

          {/* Calendar View */}
          {viewMode === "calendar" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="p-6">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="font-display text-lg font-bold">
                    {getMonthName(currentMonth)} {currentYear}
                  </h3>
                  <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-medium text-muted-foreground py-2"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Date Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {monthDays.map((day, i) => {
                    const isToday =
                      day === now.getDate() &&
                      currentMonth === now.getMonth() &&
                      currentYear === now.getFullYear();
                    const dateKey = `${currentYear}-${currentMonth}-${day}`;
                    const hasEvent = day !== null && eventDates.has(dateKey);

                    return (
                      <div
                        key={i}
                        className={cn(
                          "relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors",
                          day === null
                            ? ""
                            : isToday
                              ? "bg-primary text-primary-foreground font-bold"
                              : "hover:bg-muted cursor-pointer"
                        )}
                      >
                        {day !== null && (
                          <>
                            <span>{day}</span>
                            {hasEvent && (
                              <div
                                className={cn(
                                  "absolute bottom-1 h-1.5 w-1.5 rounded-full",
                                  isToday ? "bg-white" : "bg-primary"
                                )}
                              />
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Events scheduled
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-6 w-6 rounded-lg bg-primary" />
                    Today
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* List View */}
          {viewMode === "list" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-3"
            >
              {events.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  <Link href={`/events/${event.slug}`}>
                    <Card hover>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Date Block */}
                          <div className="h-14 w-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                            <span className="text-xs font-medium text-primary uppercase">
                              {new Date(event.startDate).toLocaleString("en-US", {
                                month: "short",
                              })}
                            </span>
                            <span className="text-lg font-bold font-display text-primary">
                              {new Date(event.startDate).getDate()}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">
                              {event.title}
                            </h3>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(event.startDate)}
                              </span>
                              {event.location.city && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {event.location.city}
                                </span>
                              )}
                            </div>
                          </div>

                          <Badge variant="secondary" className="shrink-0 text-xs">
                            {event.type}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Subscribe CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-10 text-center"
          >
            <Card className="p-8 bg-gradient-to-r from-primary/5 to-accent/5">
              <CalendarDays className="h-10 w-10 text-primary mx-auto mb-3" />
              <h3 className="font-display text-xl font-bold mb-2">
                Never miss an event
              </h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                Subscribe to this calendar and get all events synced to your
                favorite calendar app.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  onClick={() =>
                    toast.success("Calendar subscription activated!")
                  }
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Subscribe to Calendar
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/calendar/${calendarSlug}/subscribe`}>
                    <Globe className="h-4 w-4 mr-2" />
                    More Options
                  </Link>
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
