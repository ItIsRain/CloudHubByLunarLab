"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar } from "lucide-react";
import { getInitials, cn } from "@/lib/utils";
import type { Mentor, AvailabilitySlot } from "@/lib/types";

interface BookMentorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mentor: Mentor | null;
  onBook: (mentorId: string, slotId: string, topic: string) => void;
}

export function BookMentorDialog({
  open,
  onOpenChange,
  mentor,
  onBook,
}: BookMentorDialogProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [topic, setTopic] = useState("");

  if (!mentor) return null;

  const availableSlots = mentor.availability.filter((s) => !s.isBooked);

  const handleBook = () => {
    if (!selectedSlot) return;
    onBook(mentor.id, selectedSlot, topic);
    setSelectedSlot(null);
    setTopic("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book Mentor Session</DialogTitle>
          <DialogDescription>
            Schedule a 1-on-1 session with {mentor.user.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mentor info */}
          <div className="flex items-center gap-3 rounded-xl border border-border p-3">
            <Avatar size="lg">
              <AvatarImage src={mentor.user.avatar} alt={mentor.user.name} />
              <AvatarFallback>{getInitials(mentor.user.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{mentor.user.name}</p>
              <p className="text-xs text-muted-foreground">{mentor.user.headline}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {mentor.expertise.slice(0, 3).map((exp) => (
                  <Badge key={exp} variant="muted" className="text-[10px]">
                    {exp}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Time slots */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Available Slots
            </label>
            {availableSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No available slots at the moment.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                {availableSlots.map((slot: AvailabilitySlot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlot(slot.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-3 text-left text-sm transition-all",
                      selectedSlot === slot.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium">{slot.startTime} - {slot.endTime}</p>
                      <p className="text-xs text-muted-foreground">{slot.date}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Topic */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Topic</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What would you like to discuss?"
              rows={2}
              className="flex w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleBook} disabled={!selectedSlot}>
            Book Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
