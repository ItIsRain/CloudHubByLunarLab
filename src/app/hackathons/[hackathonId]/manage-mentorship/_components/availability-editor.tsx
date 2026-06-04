"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, CalendarDays, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";
import { generateBlockSlots } from "@/lib/mentor-slots";
import type { MentorAvailabilityBlock } from "@/lib/types";
import {
  useMentorAvailabilityBlocks,
  useAddMentorAvailabilityBlock,
  useDeleteMentorAvailabilityBlock,
} from "@/hooks/use-mentorship";

const DURATIONS = [15, 30, 45, 60];
const selectClasses =
  "flex h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const browserTz =
  typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

/** Build a throwaway block to preview the generated slots before saving. */
function previewSlots(date: string, start: string, end: string, dur: number): string[] {
  if (!date || !start || !end || start >= end) return [];
  const block: MentorAvailabilityBlock = {
    id: "preview",
    hackathonId: "",
    mentorUserId: "",
    date,
    startTime: start,
    endTime: end,
    slotDurationMinutes: dur,
    timezone: browserTz,
    createdAt: "",
  };
  return generateBlockSlots(block).map((s) => s.startTime);
}

export function AvailabilityEditor({ hackathonId }: { hackathonId: string }) {
  const { data, isLoading } = useMentorAvailabilityBlocks(hackathonId);
  const addBlock = useAddMentorAvailabilityBlock(hackathonId);
  const deleteBlock = useDeleteMentorAvailabilityBlock(hackathonId);

  const blocks = data?.data ?? [];

  const [date, setDate] = React.useState("");
  const [startTime, setStartTime] = React.useState("09:00");
  const [endTime, setEndTime] = React.useState("12:00");
  const [duration, setDuration] = React.useState(30);

  const preview = previewSlots(date, startTime, endTime, duration);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return toast.error("Pick a date.");
    if (startTime >= endTime) return toast.error("End time must be after start time.");
    try {
      await addBlock.mutateAsync({
        date,
        startTime,
        endTime,
        slotDurationMinutes: duration,
        timezone: browserTz,
      });
      toast.success("Availability added.");
      setDate("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add availability.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Add block form */}
      <Card>
        <CardContent className="p-5">
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">From</label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">To</label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Slot length</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className={cn(selectClasses, "w-full")}
                >
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} min
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live slot preview */}
            {preview.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">
                  {preview.length} slot{preview.length !== 1 ? "s" : ""} will be bookable ({browserTz}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {preview.slice(0, 24).map((t) => (
                    <span
                      key={t}
                      className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-mono"
                    >
                      {t}
                    </span>
                  ))}
                  {preview.length > 24 && (
                    <span className="text-xs text-muted-foreground self-center">
                      +{preview.length - 24} more
                    </span>
                  )}
                </div>
              </div>
            )}

            <Button type="submit" disabled={addBlock.isPending} className="gap-2">
              {addBlock.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Availability
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing blocks */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="shimmer rounded-xl h-16 w-full" />
          ))}
        </div>
      ) : blocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
            <CalendarDays className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-display font-bold mb-1">No availability yet</h3>
          <p className="text-sm text-muted-foreground">
            Add date blocks above so participants can book time with you.
          </p>
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {blocks.map((block) => {
            const slotCount = generateBlockSlots(block).length;
            return (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3"
              >
                <Card>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <CalendarDays className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{formatDate(block.date)}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {block.startTime.slice(0, 5)}–{block.endTime.slice(0, 5)}
                          <span className="text-muted-foreground/50">·</span>
                          {block.timezone}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {slotCount} × {block.slotDurationMinutes}m
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          deleteBlock.mutate(block.id, {
                            onError: (err) =>
                              toast.error(err instanceof Error ? err.message : "Failed to delete."),
                          });
                        }}
                        disabled={deleteBlock.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}
