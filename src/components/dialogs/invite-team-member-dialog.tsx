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
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, UserPlus } from "lucide-react";
import { mockUsers } from "@/lib/mock-data";
import { getInitials, cn } from "@/lib/utils";

interface InviteTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (userId: string) => void;
  existingMemberIds?: string[];
}

export function InviteTeamMemberDialog({
  open,
  onOpenChange,
  onInvite,
  existingMemberIds = [],
}: InviteTeamMemberDialogProps) {
  const [search, setSearch] = useState("");

  const filteredUsers = mockUsers
    .filter(
      (u) =>
        !existingMemberIds.includes(u.id) &&
        (u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.username.toLowerCase().includes(search.toLowerCase()))
    )
    .slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Search for users to invite to your team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or username..."
            icon={<Search className="h-4 w-4" />}
          />

          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className={cn(
                  "flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar size="sm">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onInvite(user.id);
                    onOpenChange(false);
                  }}
                  className="gap-1.5"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite
                </Button>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No users found
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
