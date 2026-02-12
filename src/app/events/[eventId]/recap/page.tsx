"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Mic,
  Camera,
  Calendar,
  Play,
  Clock,
  Share2,
  Trophy,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import { mockEvents } from "@/lib/mock-data";

const recapStats = [
  { label: "Attendees", value: 156, icon: Users },
  { label: "Sessions", value: 12, icon: Calendar },
  { label: "Speakers", value: 8, icon: Mic },
  { label: "Photos", value: 45, icon: Camera },
];

const highlights = [
  "Keynote on the future of AI drew the largest crowd with over 120 attendees.",
  "The hands-on workshop on building production ML systems received the highest ratings.",
  "Networking sessions led to 34 new collaborations and 5 startup partnerships.",
  "Community feedback rated the event 4.8/5 stars overall.",
];

const recapPhotos = Array.from({ length: 6 }, (_, i) => ({
  id: `recap-${i + 1}`,
  src: `https://images.unsplash.com/photo-${1540575467063 + (i + 1) * 50000}-178a50c2df87?w=400&h=300&fit=crop`,
  alt: `Recap photo ${i + 1}`,
}));

const recordings = [
  {
    id: "rec-1",
    title: "Opening Keynote: The State of AI",
    speaker: "Dr. Sarah Mitchell",
    duration: "52:30",
  },
  {
    id: "rec-2",
    title: "Building Production-Ready ML Systems",
    speaker: "James Rodriguez",
    duration: "1:24:15",
  },
  {
    id: "rec-3",
    title: "Panel: The Future of Development",
    speaker: "Multiple Speakers",
    duration: "45:00",
  },
];

export default function RecapPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const event = mockEvents.find((e) => e.id === eventId || e.slug === eventId);

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
                <Trophy className="h-10 w-10 text-muted-foreground" />
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

          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-center mb-12"
          >
            <Badge variant="gradient" className="mb-4">
              <Sparkles className="h-3 w-3 mr-1" />
              Event Recap
            </Badge>
            <h1 className="font-display text-3xl sm:text-5xl font-bold mb-3">
              {event.title}
            </h1>
            <p className="text-muted-foreground text-lg">
              {formatDate(event.startDate)}
              {event.location.city && ` | ${event.location.city}, ${event.location.country}`}
            </p>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
          >
            {recapStats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  <Card hover className="text-center p-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-3">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="font-display text-3xl font-bold mb-1">
                      {stat.value}
                    </div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-16"
          >
            <h2 className="font-display text-2xl font-bold mb-6">
              Event Highlights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {highlights.map((highlight, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                >
                  <Card className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <p className="text-sm leading-relaxed">{highlight}</p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Photo Gallery Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-16"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold">Photos</h2>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/events/${event.slug}/gallery`}>
                  View All
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {recapPhotos.map((photo, i) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="relative aspect-[4/3] rounded-xl overflow-hidden border group"
                >
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Recordings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-16"
          >
            <h2 className="font-display text-2xl font-bold mb-6">
              Session Recordings
            </h2>
            <div className="space-y-3">
              {recordings.map((recording, i) => (
                <motion.div
                  key={recording.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                >
                  <Card
                    hover
                    className="cursor-pointer"
                    onClick={() =>
                      toast.info("Recording playback coming soon!")
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Play className="h-5 w-5 text-primary ml-0.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">
                            {recording.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {recording.speaker}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                          <Clock className="h-4 w-4" />
                          {recording.duration}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Share Recap */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <Card className="p-8 bg-gradient-to-r from-primary/5 to-accent/5">
              <h3 className="font-display text-xl font-bold mb-2">
                Enjoyed the event?
              </h3>
              <p className="text-muted-foreground mb-6">
                Share this recap with your network and help us grow the community.
              </p>
              <Button
                size="lg"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Recap link copied to clipboard!");
                }}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Recap
              </Button>
            </Card>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
