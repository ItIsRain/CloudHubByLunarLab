"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink } from "lucide-react";

const quickSubmitSchema = z.object({
  projectName: z.string().min(2, "Project name is required"),
  tagline: z.string().min(5, "Tagline is required").max(120),
  trackId: z.string().min(1, "Track is required"),
  githubUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type QuickSubmitForm = z.infer<typeof quickSubmitSchema>;

interface SubmitProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: QuickSubmitForm) => void;
  tracks?: { id: string; name: string }[];
}

export function SubmitProjectDialog({
  open,
  onOpenChange,
  onSubmit,
  tracks = [],
}: SubmitProjectDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuickSubmitForm>({
    resolver: zodResolver(quickSubmitSchema),
  });

  const handleFormSubmit = (data: QuickSubmitForm) => {
    onSubmit(data);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Submit</DialogTitle>
          <DialogDescription>
            Submit your project. You can add more details later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Project Name *</label>
            <Input {...register("projectName")} placeholder="My Awesome Project" />
            {errors.projectName && (
              <p className="text-xs text-destructive">{errors.projectName.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Tagline *</label>
            <Input {...register("tagline")} placeholder="One line about your project" />
            {errors.tagline && (
              <p className="text-xs text-destructive">{errors.tagline.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Track *</label>
            <select
              {...register("trackId")}
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select a track</option>
              {tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.name}
                </option>
              ))}
            </select>
            {errors.trackId && (
              <p className="text-xs text-destructive">{errors.trackId.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">GitHub URL</label>
            <Input
              {...register("githubUrl")}
              placeholder="https://github.com/..."
              icon={<ExternalLink className="h-4 w-4" />}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            You&apos;ll be redirected to the full submission form to add screenshots,
            demo, and more details.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Submit & Continue</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
