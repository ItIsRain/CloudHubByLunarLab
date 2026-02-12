"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import { getInitials } from "@/lib/utils";
import type { Team } from "@/lib/types";

interface JoinTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  onJoin: (teamId: string, message: string) => void;
}

export function JoinTeamDialog({
  open,
  onOpenChange,
  team,
  onJoin,
}: JoinTeamDialogProps) {
  const [message, setMessage] = useState("");

  if (!team) return null;

  const handleJoin = () => {
    onJoin(team.id, message);
    setMessage("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join {team.name}</DialogTitle>
          <DialogDescription>
            Send a request to join this team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Team preview */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{team.name}</p>
                <p className="text-xs text-muted-foreground">
                  {team.members.length}/{team.maxSize} members
                </p>
              </div>
            </div>

            {team.description && (
              <p className="text-sm text-muted-foreground">{team.description}</p>
            )}

            {/* Members */}
            <div className="flex -space-x-2">
              {team.members.map((member) => (
                <Avatar key={member.id} size="sm">
                  <AvatarImage src={member.user.avatar} alt={member.user.name} />
                  <AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
                </Avatar>
              ))}
            </div>

            {/* Looking for */}
            {team.lookingForRoles && team.lookingForRoles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-muted-foreground">Looking for:</span>
                {team.lookingForRoles.map((role) => (
                  <Badge key={role} variant="outline" className="text-xs">
                    {role}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Message */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell the team about yourself..."
              rows={3}
              className="flex w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleJoin}>
            Request to Join
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
