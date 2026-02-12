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
import type { JudgingCriteria } from "@/lib/types";

const criteriaSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().min(5, "Description is required"),
  weight: z.number().min(1).max(100, "Weight must be 1-100%"),
  maxScore: z.number().min(1).max(100, "Max score must be 1-100"),
});

type CriteriaForm = z.infer<typeof criteriaSchema>;

interface JudgingCriteriaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (criteria: JudgingCriteria) => void;
}

export function JudgingCriteriaDialog({
  open,
  onOpenChange,
  onAdd,
}: JudgingCriteriaDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CriteriaForm>({
    resolver: zodResolver(criteriaSchema),
    defaultValues: { weight: 20, maxScore: 10 },
  });

  const onSubmit = (data: CriteriaForm) => {
    onAdd({
      id: generateId(),
      name: data.name,
      description: data.description,
      weight: data.weight,
      maxScore: data.maxScore,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Judging Criteria</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Criteria Name *</label>
            <Input {...register("name")} placeholder="e.g. Innovation" />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Description *</label>
            <textarea
              {...register("description")}
              placeholder="What should judges evaluate?"
              rows={2}
              className="flex w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Weight (%) *</label>
              <Input type="number" {...register("weight", { valueAsNumber: true })} placeholder="20" />
              {errors.weight && (
                <p className="text-xs text-destructive">{errors.weight.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Max Score *</label>
              <Input type="number" {...register("maxScore", { valueAsNumber: true })} placeholder="10" />
              {errors.maxScore && (
                <p className="text-xs text-destructive">{errors.maxScore.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Criteria</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
