"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, GraduationCap, CalendarDays, Inbox, Settings } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMyMentorships, useMentorBookings } from "@/hooks/use-mentorship";
import { AvailabilityEditor } from "./_components/availability-editor";
import { BookingsList } from "./_components/bookings-list";
import { MentorDefaultsCard } from "./_components/mentor-defaults-card";

export default function ManageMentorshipClient() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;

  const { data: mentorshipsData, isLoading } = useMyMentorships();
  const mentorship = mentorshipsData?.data?.find(
    (m) => m.hackathonId === hackathonId && m.status === "accepted"
  );

  const { data: bookingsData } = useMentorBookings(mentorship ? hackathonId : undefined);
  const pendingCount =
    bookingsData?.data?.filter((b) => b.status === "pending").length ?? 0;

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <Link
              href={`/hackathons/${hackathonId}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to competition
            </Link>
          </motion.div>

          {isLoading ? (
            <div className="shimmer rounded-xl h-96 w-full" />
          ) : !mentorship ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <GraduationCap className="h-7 w-7 text-muted-foreground" />
              </div>
              <h1 className="font-display text-xl font-bold mb-2">Not a mentor here</h1>
              <p className="text-muted-foreground max-w-md mb-6">
                You don&apos;t have an accepted mentor invitation for this competition.
              </p>
              <Button asChild variant="outline">
                <Link href={`/hackathons/${hackathonId}`}>Back to competition</Link>
              </Button>
            </div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex items-center gap-3"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-display text-3xl font-bold">Manage Mentorship</h1>
                  <p className="text-muted-foreground">{mentorship.hackathonName}</p>
                </div>
              </motion.div>

              <Tabs defaultValue="availability" className="space-y-6">
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="availability" className="gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    Availability
                  </TabsTrigger>
                  <TabsTrigger value="bookings" className="gap-1.5">
                    <Inbox className="h-4 w-4" />
                    Bookings
                    {pendingCount > 0 && (
                      <Badge variant="warning" className="ml-1 h-4 px-1.5 text-[10px]">
                        {pendingCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="gap-1.5">
                    <Settings className="h-4 w-4" />
                    Settings
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="availability">
                  <AvailabilityEditor hackathonId={hackathonId} />
                </TabsContent>
                <TabsContent value="bookings">
                  <BookingsList hackathonId={hackathonId} />
                </TabsContent>
                <TabsContent value="settings">
                  <MentorDefaultsCard
                    hackathonId={hackathonId}
                    mentorshipId={mentorship.mentorshipId}
                    initialUrl={mentorship.defaultMeetingUrl ?? ""}
                    initialPhone={mentorship.defaultMeetingPhone ?? ""}
                  />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
