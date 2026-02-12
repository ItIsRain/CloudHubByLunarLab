"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  GraduationCap,
  Clock,
  CheckCircle,
  Calendar,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { mockHackathons, mockUsers } from "@/lib/mock-data";
import { toast } from "sonner";

interface MockMentorCard {
  user: (typeof mockUsers)[0];
  expertise: string[];
  sessionCount: number;
  available: boolean;
}

const fallbackMentors: MockMentorCard[] = [
  {
    user: mockUsers[2],
    expertise: ["Machine Learning", "Python", "TensorFlow"],
    sessionCount: 8,
    available: true,
  },
  {
    user: mockUsers[1],
    expertise: ["UI/UX", "Design Systems", "Figma"],
    sessionCount: 5,
    available: true,
  },
  {
    user: mockUsers[4],
    expertise: ["DevOps", "Cloud", "Docker"],
    sessionCount: 3,
    available: false,
  },
];

const mockSessions = [
  {
    id: 1,
    mentor: "Marcus Johnson",
    team: "AI Pioneers",
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    topic: "ML model architecture review",
  },
  {
    id: 2,
    mentor: "Sarah Kim",
    team: "Byte Builders",
    date: new Date(Date.now() - 4 * 86400000).toISOString(),
    topic: "UI/UX design feedback session",
  },
  {
    id: 3,
    mentor: "David Park",
    team: "Code Crusaders",
    date: new Date(Date.now() - 6 * 86400000).toISOString(),
    topic: "Deployment and CI/CD pipeline setup",
  },
];

export default function MentorsManagementPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;
  const hackathon = mockHackathons.find((h) => h.id === hackathonId);

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

  const mentors: MockMentorCard[] =
    hackathon.mentors.length > 0
      ? hackathon.mentors.map((m) => ({
          user: m.user,
          expertise: m.expertise,
          sessionCount: m.availability.filter((a) => a.isBooked).length + 2,
          available:
            m.availability.some((a) => !a.isBooked),
        }))
      : fallbackMentors;

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
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="font-display text-3xl font-bold">Mentors</h1>
            <p className="text-muted-foreground mt-1">
              {mentors.length} mentors supporting your hackathon
            </p>
          </div>
          <Button
            variant="gradient"
            onClick={() => toast.success("Mentor invitation sent!")}
          >
            <Plus className="h-4 w-4" />
            Add Mentor
          </Button>
        </motion.div>

        {/* Mentor Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {mentors.map((mentor, i) => (
            <motion.div
              key={mentor.user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="h-full">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <Avatar size="lg">
                      <AvatarImage
                        src={mentor.user.avatar}
                        alt={mentor.user.name}
                      />
                      <AvatarFallback>
                        {getInitials(mentor.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-bold text-base">
                        {mentor.user.name}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {mentor.user.headline || "Mentor"}
                      </p>
                    </div>
                  </div>

                  {/* Expertise */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {mentor.expertise.map((skill) => (
                      <Badge key={skill} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{mentor.sessionCount} sessions</span>
                    </div>
                    <Badge
                      variant={mentor.available ? "success" : "muted"}
                      dot
                    >
                      {mentor.available ? "Available" : "Busy"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Session Log */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockSessions.map((session, i) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.05 }}
                    className="flex items-start gap-3 pb-4 last:pb-0 border-b last:border-b-0"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <GraduationCap className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {session.mentor} with {session.team}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.topic}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Clock className="h-3 w-3" />
                      {formatDate(session.date)}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </>
  );
}
