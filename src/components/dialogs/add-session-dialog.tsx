"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateId } from "@/lib/utils";
import type { AgendaSession, Speaker } from "@/lib/types";

const sessionSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  room: z.string().optional(),
  type: z.enum(["talk", "workshop", "break", "networking", "panel", "keynote"]),
  speakerIds: z.array(z.string()).optional(),
});

type SessionForm = z.infer<typeof sessionSchema>;

interface AddSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (session: AgendaSession) => void;
  speakers?: Speaker[];
}

export function AddSessionDialog({
  open,
  onOpenChange,
  onAdd,
  speakers = [],
}: AddSessionDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SessionForm>({
    resolver: zodResolver(sessionSchema),
    defaultValues: { type: "talk", speakerIds: [] },
  });

  const onSubmit = (data: SessionForm) => {
    const selectedSpeakers = speakers.filter((s) =>
      data.speakerIds?.includes(s.id)
    );
    onAdd({
      id: generateId(),
      title: data.title,
      description: data.description,
      startTime: data.startTime,
      endTime: data.endTime,
      room: data.room,
      type: data.type,
      speakers: selectedSpeakers,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Session</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Title *</label>
            <Input {...register("title")} placeholder="Session title" />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <textarea
              {...register("description")}
              placeholder="Session description..."
              rows={3}
              className="flex w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Type</label>
            <select
              {...register("type")}
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="talk">Talk</option>
              <option value="keynote">Keynote</option>
              <option value="workshop">Workshop</option>
              <option value="panel">Panel</option>
              <option value="networking">Networking</option>
              <option value="break">Break</option>
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Start Time *</label>
              <Input type="datetime-local" {...register("startTime")} />
              {errors.startTime && (
                <p className="text-xs text-destructive">{errors.startTime.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">End Time *</label>
              <Input type="datetime-local" {...register("endTime")} />
              {errors.endTime && (
                <p className="text-xs text-destructive">{errors.endTime.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Room</label>
            <Input {...register("room")} placeholder="e.g. Main Hall, Room A" />
          </div>

          {speakers.length > 0 && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Speakers</label>
              <div className="flex flex-wrap gap-2 rounded-xl border border-input p-3">
                {speakers.map((speaker) => (
                  <label
                    key={speaker.id}
                    className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm cursor-pointer hover:bg-muted/80 transition-colors"
                  >
                    <input
                      type="checkbox"
                      value={speaker.id}
                      {...register("speakerIds")}
                      className="rounded"
                    />
                    {speaker.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Session</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
