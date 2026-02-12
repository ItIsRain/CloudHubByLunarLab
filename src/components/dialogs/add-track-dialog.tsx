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
import { TagSelector } from "@/components/forms/tag-selector";
import { generateId } from "@/lib/utils";
import type { Track } from "@/lib/types";
import { useState } from "react";

const trackSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  icon: z.string().optional(),
});

type TrackForm = z.infer<typeof trackSchema>;

interface AddTrackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (track: Track) => void;
}

export function AddTrackDialog({
  open,
  onOpenChange,
  onAdd,
}: AddTrackDialogProps) {
  const [requirements, setRequirements] = useState<string[]>([]);
  const [suggestedTech, setSuggestedTech] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TrackForm>({
    resolver: zodResolver(trackSchema),
  });

  const onSubmit = (data: TrackForm) => {
    onAdd({
      id: generateId(),
      name: data.name,
      description: data.description,
      icon: data.icon,
      prizes: [],
      requirements,
      suggestedTech,
    });
    reset();
    setRequirements([]);
    setSuggestedTech([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Track</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Track Name *</label>
            <Input {...register("name")} placeholder="e.g. AI/ML Innovation" />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Description *</label>
            <textarea
              {...register("description")}
              placeholder="Describe what this track is about..."
              rows={3}
              className="flex w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Requirements</label>
            <TagSelector
              value={requirements}
              onChange={setRequirements}
              suggestions={[
                "Must use ML model",
                "Must deploy live",
                "Open source required",
                "Must include demo video",
              ]}
              placeholder="Add requirement..."
              maxTags={5}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Suggested Technologies</label>
            <TagSelector
              value={suggestedTech}
              onChange={setSuggestedTech}
              placeholder="Add technology..."
              maxTags={8}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Track</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
