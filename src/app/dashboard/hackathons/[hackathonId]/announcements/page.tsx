"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Send,
  Megaphone,
  Clock,
  Users,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatDate } from "@/lib/utils";
import { mockHackathons } from "@/lib/mock-data";
import { toast } from "sonner";

const pastAnnouncements = [
  {
    id: 1,
    title: "Hacking Phase Has Begun!",
    message:
      "The hacking phase is now live! You have 48 hours to build your project. Don't forget to check in with your mentors and submit before the deadline.",
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    recipients: 245,
  },
  {
    id: 2,
    title: "Mentor Office Hours Updated",
    message:
      "We've added new mentor office hours for Saturday. Check the schedule page for available time slots with our expert mentors.",
    date: new Date(Date.now() - 5 * 86400000).toISOString(),
    recipients: 245,
  },
  {
    id: 3,
    title: "Workshop: Deploying ML Models",
    message:
      "Join Marcus Johnson for a live workshop on deploying ML models at scale. Today at 3:00 PM in Workshop Room A.",
    date: new Date(Date.now() - 7 * 86400000).toISOString(),
    recipients: 180,
  },
  {
    id: 4,
    title: "Welcome to the Hackathon!",
    message:
      "Welcome all participants! We're excited to have you here. Make sure to join our Discord server and introduce yourself in the #general channel.",
    date: new Date(Date.now() - 14 * 86400000).toISOString(),
    recipients: 210,
  },
];

export default function AnnouncementsPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;
  const hackathon = mockHackathons.find((h) => h.id === hackathonId);

  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");

  if (!hackathon) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h2 className="font-display text-2xl font-bold mb-2">Hackathon Not Found</h2>
            <Link href="/dashboard/hackathons">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        </main>
      </>
    );
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Please fill in both title and message.");
      return;
    }
    toast.success("Announcement sent to all participants!");
    setTitle("");
    setMessage("");
  };

  const textareaClasses =
    "flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[100px]";

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link
            href={`/dashboard/hackathons/${hackathonId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Overview
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl font-bold">Announcements</h1>
          <p className="text-muted-foreground mt-1">
            Broadcast messages to all hackathon participants
          </p>
        </motion.div>

        {/* New Announcement Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">New Announcement</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSend} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Announcement title"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your announcement message..."
                    rows={4}
                    className={textareaClasses}
                  />
                </div>
                <Button type="submit" variant="gradient">
                  <Send className="h-4 w-4" />
                  Send to All
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Past Announcements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-display text-xl font-bold mb-4">
            Past Announcements
          </h2>
          <div className="space-y-4">
            {pastAnnouncements.map((announcement, i) => (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
              >
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Megaphone className="h-4 w-4 text-primary" />
                        </div>
                        <h3 className="font-display font-bold">
                          {announcement.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {announcement.recipients}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDate(announcement.date)}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground ml-11 line-clamp-2">
                      {announcement.message}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </>
  );
}
