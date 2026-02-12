"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Save, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const timeSlots = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
];

// Pre-selected default slots
const defaultSelected = new Set([
  "Mon-9:00 AM",
  "Mon-10:00 AM",
  "Mon-2:00 PM",
  "Wed-10:00 AM",
  "Wed-11:00 AM",
  "Wed-3:00 PM",
  "Wed-4:00 PM",
  "Fri-9:00 AM",
  "Fri-10:00 AM",
  "Fri-1:00 PM",
]);

export default function AvailabilityPage() {
  const [selectedSlots, setSelectedSlots] = React.useState<Set<string>>(
    new Set(defaultSelected)
  );
  const [duration, setDuration] = React.useState("30");
  const [platform, setPlatform] = React.useState("Zoom");

  const toggleSlot = (slotKey: string) => {
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slotKey)) {
        next.delete(slotKey);
      } else {
        next.add(slotKey);
      }
      return next;
    });
  };

  const handleSave = () => {
    toast.success("Availability saved!", {
      description: `${selectedSlots.size} time slots saved with ${duration}-minute sessions via ${platform}.`,
    });
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link
              href="/mentor"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Mentor Dashboard
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                <CalendarDays className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold">
                  Set Your Availability
                </h1>
                <p className="text-muted-foreground">
                  Select the time slots when you are available for mentoring
                  sessions.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Weekly Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Weekly Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="min-w-[640px]">
                    {/* Day headers */}
                    <div className="grid grid-cols-8 gap-2 mb-3">
                      <div className="text-xs font-medium text-muted-foreground py-2" />
                      {days.map((day) => (
                        <div
                          key={day}
                          className="text-center text-sm font-semibold py-2"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Time slot rows */}
                    {timeSlots.map((time, ti) => (
                      <motion.div
                        key={time}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + ti * 0.03 }}
                        className="grid grid-cols-8 gap-2 mb-2"
                      >
                        <div className="flex items-center text-xs text-muted-foreground font-mono">
                          {time}
                        </div>
                        {days.map((day) => {
                          const slotKey = `${day}-${time}`;
                          const isSelected = selectedSlots.has(slotKey);
                          return (
                            <button
                              key={slotKey}
                              onClick={() => toggleSlot(slotKey)}
                              className={cn(
                                "h-10 rounded-lg border-2 transition-all duration-200 text-xs font-medium",
                                isSelected
                                  ? "bg-primary/15 border-primary text-primary hover:bg-primary/25"
                                  : "bg-muted/30 border-transparent text-muted-foreground hover:border-border hover:bg-muted/60"
                              )}
                            >
                              {isSelected ? "Available" : ""}
                            </button>
                          );
                        })}
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 text-sm text-muted-foreground">
                  {selectedSlots.size} time slots selected
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 grid gap-6 md:grid-cols-2"
          >
            {/* Session Duration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Session Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </CardContent>
            </Card>

            {/* Platform Preference */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Platform Preference</CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Zoom">Zoom</option>
                  <option value="Google Meet">Google Meet</option>
                  <option value="Discord">Discord</option>
                </select>
              </CardContent>
            </Card>
          </motion.div>

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <Button onClick={handleSave} size="lg">
              <Save className="mr-2 h-4 w-4" />
              Save Availability
            </Button>
          </motion.div>
        </div>
      </main>
    </>
  );
}
