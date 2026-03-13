"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Save, CalendarDays, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import {
  useMentorAvailability,
  useSetAvailability,
  useDeleteAvailability,
} from "@/hooks/use-mentor-sessions";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const timeSlots = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
];

const timeLabels: Record<string, string> = {
  "09:00": "9:00 AM",
  "10:00": "10:00 AM",
  "11:00": "11:00 AM",
  "12:00": "12:00 PM",
  "13:00": "1:00 PM",
  "14:00": "2:00 PM",
  "15:00": "3:00 PM",
  "16:00": "4:00 PM",
};

function slotKey(dayIdx: number, time: string): string {
  return `${dayIdx}-${time}`;
}

function parseSlotKey(key: string): { dayOfWeek: number; startTime: string } {
  const [day, time] = key.split("-");
  return { dayOfWeek: parseInt(day, 10), startTime: time };
}

export default function AvailabilityPage() {
  const user = useAuthStore((s) => s.user);
  const { data: availData, isLoading } = useMentorAvailability(user?.id);
  const setAvailability = useSetAvailability();
  const deleteAvailability = useDeleteAvailability();
  const [duration, setDuration] = React.useState("30");
  const [platform, setPlatform] = React.useState("zoom");
  const [saving, setSaving] = React.useState(false);

  // Build set of existing slot keys from DB data and track their IDs
  const existingSlots = React.useMemo(() => {
    const map = new Map<string, string>(); // slotKey -> id
    for (const slot of availData?.data || []) {
      const key = slotKey(slot.dayOfWeek, slot.startTime.substring(0, 5));
      map.set(key, slot.id);
    }
    return map;
  }, [availData]);

  const [selectedSlots, setSelectedSlots] = React.useState<Set<string>>(new Set());

  // Sync from DB on load
  React.useEffect(() => {
    if (availData?.data) {
      const keys = new Set(
        availData.data.map((s) => slotKey(s.dayOfWeek, s.startTime.substring(0, 5)))
      );
      setSelectedSlots(keys);
    }
  }, [availData]);

  const toggleSlot = (key: string) => {
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Find slots to add (selected but not in DB)
      const toAdd = [...selectedSlots].filter((key) => !existingSlots.has(key));
      // Find slots to remove (in DB but not selected)
      const toRemove = [...existingSlots.entries()].filter(
        ([key]) => !selectedSlots.has(key)
      );

      // Delete removed slots
      const deletePromises = toRemove.map(([, id]) =>
        deleteAvailability.mutateAsync(id)
      );

      // Add new slots
      const durationNum = parseInt(duration, 10);
      const addPromises = toAdd.map((key) => {
        const { dayOfWeek, startTime } = parseSlotKey(key);
        // Calculate end time based on duration
        const [hours, minutes] = startTime.split(":").map(Number);
        const endMinutes = hours * 60 + minutes + durationNum;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        const endTime = `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`;

        return setAvailability.mutateAsync({
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      });

      await Promise.all([...deletePromises, ...addPromises]);

      toast.success("Availability saved!", {
        description: `${selectedSlots.size} time slots saved with ${duration}-minute sessions via ${platform}.`,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save availability"
      );
    } finally {
      setSaving(false);
    }
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

          {isLoading ? (
            <div className="shimmer rounded-xl h-96 w-full" />
          ) : (
            <>
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
                              {timeLabels[time] || time}
                            </div>
                            {days.map((day, dayIdx) => {
                              const key = slotKey(dayIdx, time);
                              const isSelected = selectedSlots.has(key);
                              return (
                                <button
                                  key={key}
                                  onClick={() => toggleSlot(key)}
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
                      <option value="zoom">Zoom</option>
                      <option value="google_meet">Google Meet</option>
                      <option value="discord">Discord</option>
                      <option value="teams">Microsoft Teams</option>
                      <option value="in_person">In Person</option>
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
                <Button onClick={handleSave} size="lg" disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Availability
                </Button>
              </motion.div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
