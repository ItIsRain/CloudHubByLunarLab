"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bookmark, Calendar, Trophy } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventCard } from "@/components/cards/event-card";
import { HackathonCard } from "@/components/cards/hackathon-card";
import { useBookmarkedEntityIds } from "@/hooks/use-bookmarks";
import { useEventsByIds } from "@/hooks/use-events";
import { useHackathonsByIds } from "@/hooks/use-hackathons";

export default function BookmarksPage() {
  const { ids: eventIds, isLoading: eventIdsLoading } = useBookmarkedEntityIds("event");
  const { ids: hackathonIds, isLoading: hackathonIdsLoading } = useBookmarkedEntityIds("hackathon");
  const { data: eventsData, isLoading: eventsLoading } = useEventsByIds(eventIds);
  const { data: hackathonsData, isLoading: hackathonsLoading } = useHackathonsByIds(hackathonIds);

  const bookmarkedEvents = eventsData?.data || [];
  const bookmarkedHackathons = hackathonsData?.data || [];

  const isLoadingEvents = eventIdsLoading || eventsLoading;
  const isLoadingHackathons = hackathonIdsLoading || hackathonsLoading;

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display text-3xl font-bold mb-1">Bookmarks</h1>
            <p className="text-muted-foreground">Events and hackathons you&apos;ve saved</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Tabs defaultValue="events">
              <TabsList>
                <TabsTrigger value="events">
                  <Calendar className="h-4 w-4 mr-2" />
                  Events ({isLoadingEvents ? "..." : bookmarkedEvents.length})
                </TabsTrigger>
                <TabsTrigger value="hackathons">
                  <Trophy className="h-4 w-4 mr-2" />
                  Hackathons ({isLoadingHackathons ? "..." : bookmarkedHackathons.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="events">
                {isLoadingEvents ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="rounded-2xl overflow-hidden border">
                        <div className="shimmer h-48 w-full" />
                        <div className="p-4 space-y-3">
                          <div className="shimmer h-4 w-3/4 rounded" />
                          <div className="shimmer h-3 w-1/2 rounded" />
                          <div className="shimmer h-3 w-2/3 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : bookmarkedEvents.length === 0 ? (
                  <div className="text-center py-16">
                    <Bookmark className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-display text-lg font-bold mb-1">No bookmarked events</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Browse events and click the bookmark icon to save them here.
                    </p>
                    <Button asChild>
                      <Link href="/explore">Explore Events</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                    {bookmarkedEvents.map((event, i) => (
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
                )}
              </TabsContent>

              <TabsContent value="hackathons">
                {isLoadingHackathons ? (
                  <div className="space-y-4 mt-4">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="rounded-2xl overflow-hidden border">
                        <div className="shimmer h-44 w-full" />
                        <div className="p-4 space-y-3">
                          <div className="shimmer h-4 w-2/3 rounded" />
                          <div className="shimmer h-3 w-full rounded" />
                          <div className="shimmer h-3 w-1/2 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : bookmarkedHackathons.length === 0 ? (
                  <div className="text-center py-16">
                    <Bookmark className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-display text-lg font-bold mb-1">No bookmarked hackathons</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Browse hackathons and click the bookmark icon to save them here.
                    </p>
                    <Button asChild>
                      <Link href="/explore">Explore Hackathons</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 mt-4">
                    {bookmarkedHackathons.map((hackathon, i) => (
                      <motion.div
                        key={hackathon.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <HackathonCard hackathon={hackathon} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
