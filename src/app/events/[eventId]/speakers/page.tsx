"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Twitter,
  Linkedin,
  ChevronDown,
  ChevronUp,
  Users,
  Mic,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import { mockSpeakers } from "@/lib/mock-data";
import { useEvent } from "@/hooks/use-events";
import type { Speaker } from "@/lib/types";

export default function SpeakersPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const { data: eventData, isLoading } = useEvent(eventId);
  const event = eventData?.data;

  const [expandedSpeaker, setExpandedSpeaker] = React.useState<string | null>(null);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="h-8 w-48 rounded shimmer" />
            <div className="h-12 w-64 rounded shimmer" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-56 rounded-2xl shimmer" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

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
                <Mic className="h-10 w-10 text-muted-foreground" />
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

  // Use event speakers if available, otherwise fall back to mockSpeakers
  const speakers: Speaker[] =
    event.speakers.length > 0 ? event.speakers : mockSpeakers;

  const toggleExpand = (id: string) => {
    setExpandedSpeaker((prev) => (prev === id ? null : id));
  };

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
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-3xl sm:text-4xl font-bold">
                  Speaker Lineup
                </h1>
              </div>
            </div>
            <p className="text-muted-foreground mt-2">
              Meet the speakers for {event.title}
            </p>
          </motion.div>

          {/* Speakers Grid */}
          {speakers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center py-20"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Mic className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">
                Speakers Coming Soon
              </h3>
              <p className="text-muted-foreground">
                The speaker lineup for this event has not been announced yet.
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {speakers.map((speaker, i) => {
                const isExpanded = expandedSpeaker === speaker.id;
                return (
                  <motion.div
                    key={speaker.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card hover className="overflow-hidden h-full">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4 mb-4">
                          <Avatar size="xl">
                            <AvatarImage
                              src={speaker.avatar}
                              alt={speaker.name}
                            />
                            <AvatarFallback>
                              {getInitials(speaker.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display text-lg font-bold truncate">
                              {speaker.name}
                            </h3>
                            <p className="text-sm text-primary font-medium">
                              {speaker.title}
                            </p>
                            {speaker.company && (
                              <p className="text-sm text-muted-foreground">
                                {speaker.company}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Bio Preview / Full */}
                        {speaker.bio && (
                          <>
                            <AnimatePresence mode="wait">
                              <motion.p
                                key={isExpanded ? "full" : "preview"}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-sm text-muted-foreground mb-3"
                              >
                                {isExpanded
                                  ? speaker.bio
                                  : speaker.bio.length > 100
                                    ? speaker.bio.slice(0, 100) + "..."
                                    : speaker.bio}
                              </motion.p>
                            </AnimatePresence>
                            {speaker.bio.length > 100 && (
                              <button
                                onClick={() => toggleExpand(speaker.id)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors mb-4"
                              >
                                {isExpanded ? (
                                  <>
                                    Show less <ChevronUp className="h-3 w-3" />
                                  </>
                                ) : (
                                  <>
                                    Read more <ChevronDown className="h-3 w-3" />
                                  </>
                                )}
                              </button>
                            )}
                          </>
                        )}

                        {/* Social Links */}
                        <div className="flex items-center gap-2 pt-3 border-t">
                          {speaker.twitter && (
                            <a
                              href={`https://twitter.com/${speaker.twitter}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Twitter className="h-4 w-4" />
                            </a>
                          )}
                          {speaker.linkedin && (
                            <a
                              href={`https://linkedin.com/in/${speaker.linkedin}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Linkedin className="h-4 w-4" />
                            </a>
                          )}
                          {!speaker.twitter && !speaker.linkedin && (
                            <span className="text-xs text-muted-foreground">
                              No social links
                            </span>
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
      <Footer />
    </>
  );
}
