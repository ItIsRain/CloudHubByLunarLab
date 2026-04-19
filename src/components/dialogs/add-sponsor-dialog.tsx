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
import {
  PRESET_SPONSOR_TIERS,
  normalizeSponsorTier,
  sponsorTierLabel,
} from "@/lib/sponsor-tiers";

// "other" is a sentinel in the select — when chosen, the user enters their own
// tier name. It is never stored; we persist the normalized custom string.
const OTHER_TIER_SENTINEL = "__other__";

const sponsorSchema = z
  .object({
    name: z.string().min(2, "Name is required"),
    logo: z.string().optional(),
    website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    tierSelection: z.string().min(1, "Tier is required"),
    customTier: z.string().max(40, "Tier name is too long").optional(),
    description: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.tierSelection === OTHER_TIER_SENTINEL) {
      const custom = normalizeSponsorTier(data.customTier ?? "");
      if (!custom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customTier"],
          message: "Enter a custom tier name",
        });
      }
    }
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
    defaultValues: { tierSelection: "silver", customTier: "" },
  });

  const logo = watch("logo");
  const tierSelection = watch("tierSelection");
  const isCustomTier = tierSelection === OTHER_TIER_SENTINEL;

  const onSubmit = (data: SponsorForm) => {
    const tier =
      data.tierSelection === OTHER_TIER_SENTINEL
        ? normalizeSponsorTier(data.customTier ?? "")
        : normalizeSponsorTier(data.tierSelection);

    onAdd({
      id: generateId(),
      name: data.name,
      logo:
        data.logo ||
        `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(data.name)}`,
      website: data.website || undefined,
      tier,
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
            folder="cloudhub/uploads"
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
              {...register("tierSelection")}
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {PRESET_SPONSOR_TIERS.map((preset) => (
                <option key={preset} value={preset}>
                  {sponsorTierLabel(preset)}
                </option>
              ))}
              <option value={OTHER_TIER_SENTINEL}>Other (custom)…</option>
            </select>
          </div>

          {isCustomTier && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Custom tier name *</label>
              <Input
                {...register("customTier")}
                placeholder="e.g. Title Sponsor, Venue Partner"
                maxLength={40}
              />
              {errors.customTier ? (
                <p className="text-xs text-destructive">
                  {errors.customTier.message}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Name your own tier — e.g. &ldquo;Title Sponsor&rdquo;,
                  &ldquo;Venue Partner&rdquo;, &ldquo;Media Partner&rdquo;.
                </p>
              )}
            </div>
          )}

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
