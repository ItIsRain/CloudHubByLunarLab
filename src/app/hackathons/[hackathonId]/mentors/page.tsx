"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy,
  ArrowLeft,
  MessageSquare,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mockHackathons } from "@/lib/mock-data";
import { cn, getInitials } from "@/lib/utils";

export default function HackathonMentorsPage() {
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

  const mentors = hackathon.mentors;

  // Determine availability status per mentor
  const getMentorAvailability = (
    mentor: (typeof mentors)[0]
  ): "available" | "busy" => {
    const hasOpenSlot = mentor.availability.some((slot) => !slot.isBooked);
    return hasOpenSlot ? "available" : "busy";
  };

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
            <h1 className="font-display text-4xl font-bold mb-2">Mentors</h1>
            <p className="text-muted-foreground text-lg">
              {mentors.length > 0
                ? `${mentors.length} mentor${mentors.length !== 1 ? "s" : ""} ready to help at ${hackathon.name}`
                : `Mentors for ${hackathon.name}`}
            </p>
          </motion.div>

          {/* Mentors Grid */}
          {mentors.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-display text-lg font-bold mb-1">
                No mentors yet
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Mentors will be announced as the hackathon approaches.
              </p>
            </motion.div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {mentors.map((mentor, i) => {
                const availability = getMentorAvailability(mentor);

                return (
                  <motion.div
                    key={mentor.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="h-full hover:shadow-md transition-shadow">
                      <CardContent className="p-6 text-center">
                        {/* Avatar */}
                        <Avatar className="h-20 w-20 mx-auto mb-4">
                          <AvatarImage src={mentor.user.avatar} />
                          <AvatarFallback className="text-xl">
                            {getInitials(mentor.user.name)}
                          </AvatarFallback>
                        </Avatar>

                        {/* Name & Title */}
                        <h3 className="font-display text-lg font-bold">
                          {mentor.user.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {mentor.user.headline}
                        </p>

                        {/* Availability Badge */}
                        <div className="mt-3">
                          <Badge
                            variant={
                              availability === "available"
                                ? "success"
                                : "warning"
                            }
                            dot
                            pulse={availability === "available"}
                            className="text-xs"
                          >
                            {availability === "available"
                              ? "Available"
                              : "Busy"}
                          </Badge>
                        </div>

                        {/* Bio */}
                        {mentor.bio && (
                          <p className="text-xs text-muted-foreground mt-3">
                            {mentor.bio}
                          </p>
                        )}

                        {/* Expertise Tags */}
                        <div className="flex flex-wrap gap-1.5 justify-center mt-4">
                          {mentor.expertise.map((skill) => (
                            <Badge
                              key={skill}
                              variant="secondary"
                              className="text-xs"
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>

                        {/* Book Session Button */}
                        <Button
                          size="sm"
                          className="mt-5 gap-1.5"
                          onClick={() =>
                            toast.info("Booking coming soon!", {
                              description: `Mentor session booking for ${mentor.user.name} is not yet available.`,
                            })
                          }
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Book a Session
                        </Button>
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
    </div>
  );
}
