"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy,
  ArrowLeft,
  Clock,
  MapPin,
  User,
  CalendarDays,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockHackathons } from "@/lib/mock-data";
import { cn, formatDate } from "@/lib/utils";

interface ScheduleSession {
  id: string;
  time: string;
  endTime: string;
  title: string;
  description: string;
  speaker: string;
  type: "ceremony" | "workshop" | "hacking" | "break" | "social" | "judging";
}

interface ScheduleDay {
  label: string;
  date: string;
  sessions: ScheduleSession[];
}

function generateSchedule(hackathon: { hackingStart: string; hackingEnd: string; submissionDeadline: string }): ScheduleDay[] {
  const startDate = new Date(hackathon.hackingStart);

  const day1 = new Date(startDate);
  const day2 = new Date(startDate);
  day2.setDate(day2.getDate() + 1);
  const day3 = new Date(startDate);
  day3.setDate(day3.getDate() + 2);

  return [
    {
      label: "Day 1",
      date: day1.toISOString(),
      sessions: [
        {
          id: "s1-1",
          time: "9:00 AM",
          endTime: "10:00 AM",
          title: "Opening Ceremony & Kickoff",
          description: "Welcome remarks, rules overview, and team formation announcements.",
          speaker: "Organizer Team",
          type: "ceremony",
        },
        {
          id: "s1-2",
          time: "10:00 AM",
          endTime: "10:30 AM",
          title: "Sponsor Presentations",
          description: "Quick pitches from sponsors about their APIs and tools.",
          speaker: "Sponsor Representatives",
          type: "ceremony",
        },
        {
          id: "s1-3",
          time: "10:30 AM",
          endTime: "12:00 PM",
          title: "Workshop: Getting Started with AI APIs",
          description: "Hands-on workshop on integrating GPT-4, Claude, and open-source models.",
          speaker: "Dr. Sarah Mitchell",
          type: "workshop",
        },
        {
          id: "s1-4",
          time: "12:00 PM",
          endTime: "1:00 PM",
          title: "Lunch Break",
          description: "Grab food, network, and brainstorm with your team.",
          speaker: "",
          type: "break",
        },
        {
          id: "s1-5",
          time: "1:00 PM",
          endTime: "6:00 PM",
          title: "Hacking Session 1",
          description: "Start building your project. Mentors available for help.",
          speaker: "",
          type: "hacking",
        },
        {
          id: "s1-6",
          time: "6:00 PM",
          endTime: "7:00 PM",
          title: "Dinner & Networking",
          description: "Take a break and connect with other participants.",
          speaker: "",
          type: "social",
        },
        {
          id: "s1-7",
          time: "7:00 PM",
          endTime: "11:59 PM",
          title: "Hacking Session 2",
          description: "Continue building. Late-night coding encouraged!",
          speaker: "",
          type: "hacking",
        },
      ],
    },
    {
      label: "Day 2",
      date: day2.toISOString(),
      sessions: [
        {
          id: "s2-1",
          time: "8:00 AM",
          endTime: "9:00 AM",
          title: "Breakfast",
          description: "Fuel up for another day of building.",
          speaker: "",
          type: "break",
        },
        {
          id: "s2-2",
          time: "9:00 AM",
          endTime: "10:00 AM",
          title: "Workshop: Pitching Your Project",
          description: "Learn how to create a compelling demo and presentation.",
          speaker: "Lisa Wang",
          type: "workshop",
        },
        {
          id: "s2-3",
          time: "10:00 AM",
          endTime: "5:00 PM",
          title: "Hacking Session 3",
          description: "Full day of building. Focus on your MVP and demo.",
          speaker: "",
          type: "hacking",
        },
        {
          id: "s2-4",
          time: "12:30 PM",
          endTime: "1:30 PM",
          title: "Lunch Break",
          description: "Recharge and refuel.",
          speaker: "",
          type: "break",
        },
        {
          id: "s2-5",
          time: "5:00 PM",
          endTime: "6:00 PM",
          title: "Mentor Office Hours",
          description: "Last chance to get feedback from mentors before submission.",
          speaker: "All Mentors",
          type: "workshop",
        },
        {
          id: "s2-6",
          time: "6:00 PM",
          endTime: "11:59 PM",
          title: "Final Hacking Sprint",
          description: "Polish your project and prepare your submission.",
          speaker: "",
          type: "hacking",
        },
      ],
    },
    {
      label: "Day 3",
      date: day3.toISOString(),
      sessions: [
        {
          id: "s3-1",
          time: "8:00 AM",
          endTime: "9:00 AM",
          title: "Breakfast",
          description: "Last morning together.",
          speaker: "",
          type: "break",
        },
        {
          id: "s3-2",
          time: "9:00 AM",
          endTime: "10:00 AM",
          title: "Submission Deadline",
          description: "All projects must be submitted by 10:00 AM sharp!",
          speaker: "",
          type: "ceremony",
        },
        {
          id: "s3-3",
          time: "10:00 AM",
          endTime: "12:00 PM",
          title: "Judging Round 1",
          description: "Teams present to judges in small group sessions.",
          speaker: "Judging Panel",
          type: "judging",
        },
        {
          id: "s3-4",
          time: "12:00 PM",
          endTime: "1:00 PM",
          title: "Lunch",
          description: "Judges deliberate while participants enjoy lunch.",
          speaker: "",
          type: "break",
        },
        {
          id: "s3-5",
          time: "1:00 PM",
          endTime: "2:30 PM",
          title: "Final Presentations",
          description: "Top 10 teams present on the main stage.",
          speaker: "Finalist Teams",
          type: "ceremony",
        },
        {
          id: "s3-6",
          time: "2:30 PM",
          endTime: "3:30 PM",
          title: "Awards Ceremony & Closing",
          description: "Winners announced, prizes awarded, and closing remarks.",
          speaker: "Organizer Team",
          type: "ceremony",
        },
      ],
    },
  ];
}

const sessionTypeColors: Record<string, string> = {
  ceremony: "border-l-primary bg-primary/5",
  workshop: "border-l-blue-500 bg-blue-500/5",
  hacking: "border-l-green-500 bg-green-500/5",
  break: "border-l-muted-foreground/30 bg-muted/50",
  social: "border-l-accent bg-accent/5",
  judging: "border-l-amber-500 bg-amber-500/5",
};

const sessionTypeBadges: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "muted" }> = {
  ceremony: { label: "Ceremony", variant: "default" },
  workshop: { label: "Workshop", variant: "secondary" },
  hacking: { label: "Hacking", variant: "outline" },
  break: { label: "Break", variant: "muted" },
  social: { label: "Social", variant: "secondary" },
  judging: { label: "Judging", variant: "default" },
};

export default function HackathonSchedulePage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;

  const hackathon = mockHackathons.find(
    (h) => h.id === hackathonId || h.slug === hackathonId
  );

  if (!hackathon) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16 text-center">
          <div className="mx-auto max-w-md">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h1 className="font-display text-3xl font-bold mb-2">
              Hackathon Not Found
            </h1>
            <p className="text-muted-foreground mb-6">
              The hackathon you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Button asChild>
              <Link href="/hackathons">Browse Hackathons</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const schedule = generateSchedule(hackathon);

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link
              href={`/hackathons/${hackathonId}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {hackathon.name}
            </Link>
          </motion.div>

          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display text-4xl font-bold mb-2">Schedule</h1>
            <p className="text-muted-foreground text-lg">
              3-day schedule for {hackathon.name}
            </p>
          </motion.div>

          {/* Day Filter Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Tabs defaultValue="day-0">
              <TabsList>
                {schedule.map((day, i) => (
                  <TabsTrigger key={i} value={`day-${i}`}>
                    <CalendarDays className="h-4 w-4 mr-1.5" />
                    {day.label}
                    <span className="hidden sm:inline ml-1.5 text-xs text-muted-foreground">
                      ({formatDate(day.date)})
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {schedule.map((day, di) => (
                <TabsContent key={di} value={`day-${di}`} className="mt-6">
                  {/* Day Header */}
                  <div className="mb-6">
                    <h2 className="font-display text-2xl font-bold">
                      {day.label}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(day.date)}
                    </p>
                  </div>

                  {/* Vertical Timeline */}
                  <div className="space-y-4">
                    {day.sessions.map((session, si) => (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: si * 0.05 }}
                      >
                        <Card
                          className={cn(
                            "border-l-4",
                            sessionTypeColors[session.type] || ""
                          )}
                        >
                          <CardContent className="p-5">
                            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                              {/* Time */}
                              <div className="flex items-center gap-2 sm:w-40 flex-shrink-0">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-mono font-medium">
                                  {session.time} - {session.endTime}
                                </span>
                              </div>

                              {/* Content */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-medium">
                                    {session.title}
                                  </h3>
                                  <Badge
                                    variant={
                                      sessionTypeBadges[session.type]
                                        ?.variant || "outline"
                                    }
                                    className="text-xs"
                                  >
                                    {sessionTypeBadges[session.type]?.label ||
                                      session.type}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {session.description}
                                </p>
                                {session.speaker && (
                                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                                    <User className="h-3.5 w-3.5" />
                                    {session.speaker}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
