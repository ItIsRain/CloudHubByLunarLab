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
import type { Prize } from "@/lib/types";

const prizeSchema = z.object({
  name: z.string().min(2, "Name is required"),
  place: z.string().min(1, "Place is required"),
  value: z.number().min(0, "Value must be positive"),
  currency: z.string(),
  type: z.enum(["cash", "credits", "swag", "incubation", "other"]),
  description: z.string().optional(),
});

type PrizeForm = z.infer<typeof prizeSchema>;

interface AddPrizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (prize: Prize) => void;
}

export function AddPrizeDialog({
  open,
  onOpenChange,
  onAdd,
}: AddPrizeDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PrizeForm>({
    resolver: zodResolver(prizeSchema),
    defaultValues: { currency: "USD", type: "cash" },
  });

  const onSubmit = (data: PrizeForm) => {
    const place = data.place === "special" ? "special" as const : Number(data.place);
    onAdd({
      id: generateId(),
      name: data.name,
      place,
      value: data.value,
      currency: data.currency,
      type: data.type,
      description: data.description,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Prize</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Prize Name *</label>
            <Input {...register("name")} placeholder="e.g. Grand Prize" />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Place *</label>
              <select
                {...register("place")}
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="1">1st Place</option>
                <option value="2">2nd Place</option>
                <option value="3">3rd Place</option>
                <option value="special">Special Award</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Type</label>
              <select
                {...register("type")}
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="cash">Cash</option>
                <option value="credits">Credits</option>
                <option value="swag">Swag</option>
                <option value="incubation">Incubation</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Value *</label>
              <Input
                type="number"
                {...register("value", { valueAsNumber: true })}
                placeholder="5000"
              />
              {errors.value && (
                <p className="text-xs text-destructive">{errors.value.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Currency</label>
              <Input {...register("currency")} placeholder="USD" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <textarea
              {...register("description")}
              placeholder="Prize details..."
              rows={2}
              className="flex w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Prize</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
