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
import { TagSelector } from "@/components/forms/tag-selector";
import { useState } from "react";
import { Lock } from "lucide-react";

function buildTeamSchema(maxTeamSize: number) {
  return z.object({
    name: z.string().min(2, "Team name is required").max(50),
    description: z.string().max(500).optional(),
    maxSize: z.number().min(1).max(maxTeamSize, `Cannot exceed hackathon limit of ${maxTeamSize}`),
    joinPassword: z.string().max(50).optional(),
  });
}

type TeamForm = z.infer<ReturnType<typeof buildTeamSchema>>;

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TeamForm & { lookingForRoles: string[] }) => void;
  maxTeamSize?: number;
}

export function CreateTeamDialog({
  open,
  onOpenChange,
  onSubmit,
  maxTeamSize = 10,
}: CreateTeamDialogProps) {
  const [roles, setRoles] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TeamForm>({
    resolver: zodResolver(buildTeamSchema(maxTeamSize)),
    defaultValues: { maxSize: Math.min(4, maxTeamSize) },
  });

  const handleFormSubmit = (data: TeamForm) => {
    onSubmit({ ...data, lookingForRoles: roles });
    reset();
    setRoles([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
          <DialogDescription>
            Start a new team and invite members to join.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Team Name *</label>
            <Input {...register("name")} placeholder="e.g. Code Crusaders" />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <textarea
              {...register("description")}
              placeholder="What are you building?"
              rows={3}
              className="flex w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Max Team Size</label>
            <Input type="number" {...register("maxSize", { valueAsNumber: true })} min={1} max={maxTeamSize} />
            {errors.maxSize && (
              <p className="text-xs text-destructive">{errors.maxSize.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Join Password
            </label>
            <Input
              {...register("joinPassword")}
              type="text"
              placeholder="Leave empty for open team"
            />
            <p className="text-xs text-muted-foreground">
              Members will need this password to join your team
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Looking For</label>
            <TagSelector
              value={roles}
              onChange={setRoles}
              suggestions={[
                "Frontend Developer",
                "Backend Developer",
                "Full Stack Developer",
                "UI/UX Designer",
                "ML Engineer",
                "DevOps",
                "Product Manager",
                "Data Scientist",
              ]}
              placeholder="Add roles..."
              maxTags={5}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Team</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
