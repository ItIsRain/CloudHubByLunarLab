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
import type { Sponsor } from "@/lib/types";

const sponsorSchema = z.object({
  name: z.string().min(2, "Name is required"),
  logo: z.string().optional(),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  tier: z.enum(["platinum", "gold", "silver", "bronze", "community"]),
  description: z.string().optional(),
});

type SponsorForm = z.infer<typeof sponsorSchema>;

interface AddSponsorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (sponsor: Sponsor) => void;
}

export function AddSponsorDialog({
  open,
  onOpenChange,
  onAdd,
}: AddSponsorDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SponsorForm>({
    resolver: zodResolver(sponsorSchema),
    defaultValues: { tier: "silver" },
  });

  const logo = watch("logo");

  const onSubmit = (data: SponsorForm) => {
    onAdd({
      id: generateId(),
      name: data.name,
      logo: data.logo || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(data.name)}`,
      website: data.website || undefined,
      tier: data.tier,
      description: data.description,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Sponsor</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <ImageUpload
            value={logo}
            onChange={(url) => setValue("logo", url)}
            aspectRatio="square"
            label="Sponsor Logo"
          />

          <div className="space-y-1">
            <label className="text-sm font-medium">Company Name *</label>
            <Input {...register("name")} placeholder="Acme Inc." />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Website</label>
            <Input {...register("website")} placeholder="https://example.com" />
            {errors.website && (
              <p className="text-xs text-destructive">{errors.website.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Tier</label>
            <select
              {...register("tier")}
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="platinum">Platinum</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="bronze">Bronze</option>
              <option value="community">Community</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <textarea
              {...register("description")}
              placeholder="Brief description..."
              rows={2}
              className="flex w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Sponsor</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
