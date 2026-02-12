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
import { ImageUpload } from "@/components/forms/image-upload";
import { generateId } from "@/lib/utils";
import type { Speaker } from "@/lib/types";

const speakerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  title: z.string().min(2, "Title is required"),
  company: z.string().optional(),
  bio: z.string().optional(),
  avatar: z.string().optional(),
  twitter: z.string().optional(),
  linkedin: z.string().optional(),
});

type SpeakerForm = z.infer<typeof speakerSchema>;

interface AddSpeakerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (speaker: Speaker) => void;
}

export function AddSpeakerDialog({
  open,
  onOpenChange,
  onAdd,
}: AddSpeakerDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SpeakerForm>({
    resolver: zodResolver(speakerSchema),
  });

  const avatar = watch("avatar");

  const onSubmit = (data: SpeakerForm) => {
    onAdd({
      id: generateId(),
      name: data.name,
      title: data.title,
      company: data.company,
      bio: data.bio,
      avatar: data.avatar,
      twitter: data.twitter,
      linkedin: data.linkedin,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Speaker</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <ImageUpload
            value={avatar}
            onChange={(url) => setValue("avatar", url)}
            aspectRatio="square"
            label="Speaker Photo"
            description="Square image recommended"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Name *</label>
              <Input {...register("name")} placeholder="Jane Doe" />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Title *</label>
              <Input {...register("title")} placeholder="CEO" />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Company</label>
            <Input {...register("company")} placeholder="Acme Inc." />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Bio</label>
            <textarea
              {...register("bio")}
              placeholder="Brief bio..."
              rows={3}
              className="flex w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Twitter</label>
              <Input {...register("twitter")} placeholder="@username" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">LinkedIn</label>
              <Input {...register("linkedin")} placeholder="linkedin.com/in/..." />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Speaker</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
