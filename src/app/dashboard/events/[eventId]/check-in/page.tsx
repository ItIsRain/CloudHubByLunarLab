"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Search,
  QrCode,
  CheckCircle2,
  Clock,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { mockEvents } from "@/lib/mock-data";
import { toast } from "sonner";

const recentCheckIns = [
  { id: 1, name: "Sarah Kim", time: "2:34 PM", ticket: "VIP Pass" },
  { id: 2, name: "Marcus Johnson", time: "2:28 PM", ticket: "General Admission" },
  { id: 3, name: "Lisa Wang", time: "2:15 PM", ticket: "VIP Pass" },
  { id: 4, name: "Olivia Martinez", time: "1:58 PM", ticket: "General Admission" },
  { id: 5, name: "Amy Chen", time: "1:42 PM", ticket: "General Admission" },
];

const searchResults = [
  { id: "s-1", name: "Emma Wilson", email: "emma.wilson@email.com", ticket: "Early Bird" },
  { id: "s-2", name: "David Park", email: "david.park@email.com", ticket: "General Admission" },
  { id: "s-3", name: "Robert Brown", email: "robert.brown@email.com", ticket: "Student" },
];

export default function CheckInPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const event = mockEvents.find((e) => e.id === eventId);
  const [searchQuery, setSearchQuery] = React.useState("");

  if (!event) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <h2 className="font-display text-2xl font-bold mb-2">Event not found</h2>
              <p className="text-muted-foreground mb-6">
                The event you are looking for does not exist or has been removed.
              </p>
              <Button asChild>
                <Link href="/dashboard/events">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to My Events
                </Link>
              </Button>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  const checkedIn = 89;
  const totalRegistrations = 156;
  const checkInRate = ((checkedIn / totalRegistrations) * 100).toFixed(1);

  const filteredResults = searchQuery.length > 0
    ? searchResults.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/events/${eventId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Overview
              </Link>
            </Button>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display text-3xl font-bold">Check-in</h1>
            <p className="text-muted-foreground mt-1">{event.title}</p>
          </motion.div>

          {/* Large Counter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-8"
          >
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wider font-medium">
                  Checked In
                </p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="font-display text-7xl font-bold text-primary">
                    {checkedIn}
                  </span>
                  <span className="font-display text-4xl font-bold text-muted-foreground">
                    / {totalRegistrations}
                  </span>
                </div>
                <div className="w-full max-w-md mx-auto h-3 bg-muted rounded-full overflow-hidden mt-4">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                    style={{
                      width: `${(checkedIn / totalRegistrations) * 100}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8"
          >
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-in Rate</p>
                  <p className="font-display text-xl font-bold">{checkInRate}%</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Peak Check-in Time</p>
                  <p className="font-display text-xl font-bold">2:00 PM - 2:30 PM</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Manual Check-in */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Quick Check-in</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toast.info("QR scanner coming soon!")
                      }
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Scan QR Code
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Input
                    icon={<Search className="h-4 w-4" />}
                    placeholder="Search guest by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="mb-4"
                  />

                  {filteredResults.length > 0 && (
                    <div className="space-y-2">
                      {filteredResults.map((result) => (
                        <div
                          key={result.id}
                          className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/50 transition-colors"
                        >
                          <div>
                            <p className="text-sm font-medium">{result.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {result.email} &middot; {result.ticket}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              toast.success(`${result.name} checked in!`);
                              setSearchQuery("");
                            }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Check In
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchQuery.length > 0 && filteredResults.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No guests found matching &ldquo;{searchQuery}&rdquo;
                    </p>
                  )}

                  {searchQuery.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Type a name or email to search for guests
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Check-ins */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Check-ins</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentCheckIns.map((checkIn, i) => (
                      <motion.div
                        key={checkIn.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.05 }}
                        className="flex items-center justify-between p-3 rounded-xl border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-full bg-green-500/10">
                            <UserCheck className="h-4 w-4 text-green-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{checkIn.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {checkIn.ticket}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {checkIn.time}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
