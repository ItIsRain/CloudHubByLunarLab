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
import { useState, useEffect } from "react";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUpdateTeam } from "@/hooks/use-teams";
import type { Team } from "@/lib/types";

const editTeamSchema = z.object({
  name: z.string().min(2, "Team name is required").max(50),
  description: z.string().max(500).optional(),
  maxSize: z.number().min(1).max(10),
  joinPassword: z.string().max(50).optional(),
});

type EditTeamForm = z.infer<typeof editTeamSchema>;

interface EditTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team;
}

export function EditTeamDialog({
  open,
  onOpenChange,
  team,
}: EditTeamDialogProps) {
  const [roles, setRoles] = useState<string[]>(team.lookingForRoles || []);
  const updateMutation = useUpdateTeam();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditTeamForm>({
    resolver: zodResolver(editTeamSchema),
    defaultValues: {
      name: team.name,
      description: team.description || "",
      maxSize: team.maxSize,
      joinPassword: team.joinPassword || "",
    },
  });

  useEffect(() => {
    reset({
      name: team.name,
      description: team.description || "",
      maxSize: team.maxSize,
      joinPassword: team.joinPassword || "",
    });
    setRoles(team.lookingForRoles || []);
  }, [team, reset]);

  const handleFormSubmit = async (data: EditTeamForm) => {
    try {
      await updateMutation.mutateAsync({
        id: team.id,
        name: data.name,
        description: data.description || null,
        max_size: data.maxSize,
        looking_for_roles: roles,
        join_password: data.joinPassword || null,
      });
      toast.success("Team updated successfully!");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update team");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
          <DialogDescription>
            Update your team details and settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Team Name *</label>
            <Input {...register("name")} />
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
            <Input
              type="number"
              {...register("maxSize", { valueAsNumber: true })}
              min={team.members.length}
              max={10}
            />
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
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
