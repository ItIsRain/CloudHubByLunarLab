"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Calendar, CalendarCheck, LayoutGrid } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EventCard } from "@/components/cards/event-card";
import { useMyEvents } from "@/hooks/use-events";

function EmptyState({ message, cta }: { message: string; cta: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="p-4 rounded-2xl bg-muted mb-4">
        <Calendar className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="font-display text-xl font-bold mb-2">{message}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Get started by creating your first event or browsing upcoming events in the explore page.
      </p>
      <Button asChild>
        <Link href="/events/create">
          <Plus className="h-4 w-4 mr-2" />
          {cta}
        </Link>
      </Button>
    </motion.div>
  );
}

export default function MyEventsPage() {
  const { data: eventsData, isLoading } = useMyEvents();
  const events = eventsData?.data || [];
  const hostingEvents = events.slice(0, 4);
  const attendingEvents = events.slice(4, 8);

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="font-display text-3xl font-bold">My Events</h1>
              <p className="text-muted-foreground mt-1">
                Manage your hosted events and track your registrations
              </p>
            </div>
            <Button asChild>
              <Link href="/events/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Link>
            </Button>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Tabs defaultValue="hosting">
              <TabsList>
                <TabsTrigger value="hosting" className="gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Hosting
                </TabsTrigger>
                <TabsTrigger value="attending" className="gap-2">
                  <CalendarCheck className="h-4 w-4" />
                  Attending
                </TabsTrigger>
              </TabsList>

              <TabsContent value="hosting">
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="shimmer rounded-xl h-64 w-full" />
                    ))}
                  </div>
                ) : hostingEvents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                    {hostingEvents.map((event, i) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="relative group"
                      >
                        <EventCard event={event} />
                        <div className="absolute inset-0 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          <Button
                            size="sm"
                            variant="gradient"
                            asChild
                            className="pointer-events-auto shadow-lg"
                          >
                            <Link href={`/dashboard/events/${event.id}`}>
                              Manage
                            </Link>
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    message="No events hosted yet"
                    cta="Create Your First Event"
                  />
                )}
              </TabsContent>

              <TabsContent value="attending">
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="shimmer rounded-xl h-64 w-full" />
                    ))}
                  </div>
                ) : attendingEvents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                    {attendingEvents.map((event, i) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <EventCard event={event} />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    message="Not attending any events"
                    cta="Explore Events"
                  />
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
