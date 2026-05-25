"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Mail, Users } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { useTeam } from "@/hooks/use-teams";
import type { Team } from "@/lib/types";

interface TeamMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The team whose members should be shown. The dialog will fetch the
   * authoritative team data (which is the only source that includes
   * teammate emails for callers who are members of the team).
   */
  team: Team | null;
}

export function TeamMembersDialog({
  open,
  onOpenChange,
  team,
}: TeamMembersDialogProps) {
  // Refetch through the by-id endpoint so we pick up emails when the
  // current user is a teammate (the listing endpoint never includes them).
  const { data: detailData, isLoading } = useTeam(open && team ? team.id : undefined);
  const liveTeam = detailData?.data ?? team;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {liveTeam ? liveTeam.name : "Team members"}
          </DialogTitle>
          <DialogDescription>
            {liveTeam
              ? `${liveTeam.members.length} of ${liveTeam.maxSize} member${liveTeam.maxSize === 1 ? "" : "s"}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {isLoading && !liveTeam ? (
          <div className="space-y-2">
            <div className="shimmer rounded-xl h-16 w-full" />
            <div className="shimmer rounded-xl h-16 w-full" />
          </div>
        ) : liveTeam ? (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {liveTeam.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-xl p-3 border border-border"
              >
                <Avatar size="sm">
                  <AvatarImage src={member.user.avatar} alt={member.user.name} />
                  <AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm truncate">
                      {member.user.name}
                    </p>
                    {member.isLeader && (
                      <Crown
                        className="h-3.5 w-3.5 text-warning shrink-0"
                        aria-label="Team leader"
                      />
                    )}
                  </div>
                  {member.user.email ? (
                    <a
                      href={`mailto:${member.user.email}`}
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1 truncate"
                    >
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{member.user.email}</span>
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground truncate">
                      {member.role}
                    </p>
                  )}
                  {member.user.email && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {member.role}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {liveTeam && (
            <Button asChild>
              <Link
                href={`/dashboard/team/${liveTeam.id}`}
                onClick={() => onOpenChange(false)}
              >
                Open workspace
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
