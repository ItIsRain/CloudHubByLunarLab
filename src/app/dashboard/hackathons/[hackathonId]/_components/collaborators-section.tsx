"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Shield,
  Pencil,
  Eye,
  Trash2,
  Crown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn, getInitials } from "@/lib/utils";
import {
  useCollaborators,
  useInviteCollaborator,
  useUpdateCollaboratorRole,
  useRemoveCollaborator,
} from "@/hooks/use-collaborators";
import type { Collaborator, CollaboratorRole } from "@/hooks/use-collaborators";
import { toast } from "sonner";

interface CollaboratorsSectionProps {
  hackathonId: string;
  isOwner: boolean;
}

const roleConfig: Record<
  CollaboratorRole,
  { label: string; icon: React.ElementType; badgeClass: string; description: string }
> = {
  admin: {
    label: "Admin",
    icon: Shield,
    badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    description: "Full access to all settings",
  },
  editor: {
    label: "Editor",
    icon: Pencil,
    badgeClass: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    description: "Can edit content but not settings",
  },
  viewer: {
    label: "Viewer",
    icon: Eye,
    badgeClass: "bg-muted text-muted-foreground border-border",
    description: "Read-only access",
  },
};

const allRoles: CollaboratorRole[] = ["admin", "editor", "viewer"];

export function CollaboratorsSection({
  hackathonId,
  isOwner,
}: CollaboratorsSectionProps) {
  const { data: collabData, isLoading } = useCollaborators(hackathonId);
  const collaborators = collabData?.data ?? [];
  const inviteCollab = useInviteCollaborator(hackathonId);
  const updateRole = useUpdateCollaboratorRole(hackathonId);
  const removeCollab = useRemoveCollaborator(hackathonId);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<CollaboratorRole>("editor");

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Email is required.");
      return;
    }
    try {
      await inviteCollab.mutateAsync({
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      toast.success(`Collaborator invited as ${inviteRole}.`);
      setInviteEmail("");
      setInviteRole("editor");
      setDialogOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to invite collaborator."
      );
    }
  };

  const handleChangeRole = async (collab: Collaborator, newRole: CollaboratorRole) => {
    if (collab.role === newRole) return;
    try {
      await updateRole.mutateAsync({
        collaboratorId: collab.id,
        role: newRole,
      });
      toast.success(
        `${collab.user?.name || "Collaborator"} role updated to ${newRole}.`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update role."
      );
    }
  };

  const handleRemove = async (collab: Collaborator) => {
    const name = collab.user?.name || collab.user?.email || "this collaborator";
    const confirmed = window.confirm(
      `Remove ${name} from this hackathon?`
    );
    if (!confirmed) return;

    try {
      await removeCollab.mutateAsync(collab.id);
      toast.success(`${name} has been removed.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove collaborator."
      );
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Team & Access
          </CardTitle>
          {isOwner && (
            <Button
              size="sm"
              className="gap-2"
              onClick={() => setDialogOpen(true)}
            >
              <UserPlus className="h-4 w-4" />
              Invite
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="shimmer rounded-lg h-16" />
              ))}
            </div>
          ) : collaborators.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-10 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                <UserPlus className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">No collaborators yet</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Invite team members to help manage this hackathon.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {collaborators.map((collab, idx) => {
                  const config = roleConfig[collab.role];
                  const RoleIcon = config.icon;
                  return (
                    <motion.div
                      key={collab.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: idx * 0.04 }}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar size="sm">
                          {collab.user?.avatar && (
                            <AvatarImage
                              src={collab.user.avatar}
                              alt={collab.user.name || ""}
                            />
                          )}
                          <AvatarFallback className="text-xs">
                            {getInitials(collab.user?.name || collab.user?.email || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {collab.user?.name || "Unknown User"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {collab.user?.email || ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1 text-xs font-medium",
                            config.badgeClass
                          )}
                        >
                          <RoleIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>

                        {isOwner && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <span className="sr-only">Actions</span>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <circle cx="12" cy="12" r="1" />
                                  <circle cx="12" cy="5" r="1" />
                                  <circle cx="12" cy="19" r="1" />
                                </svg>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {allRoles.map((r) => {
                                const rc = roleConfig[r];
                                const Icon = rc.icon;
                                return (
                                  <DropdownMenuItem
                                    key={r}
                                    disabled={
                                      collab.role === r ||
                                      updateRole.isPending
                                    }
                                    onClick={() => handleChangeRole(collab, r)}
                                    className="gap-2"
                                  >
                                    <Icon className="h-4 w-4" />
                                    Set as {rc.label}
                                  </DropdownMenuItem>
                                );
                              })}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleRemove(collab)}
                                disabled={removeCollab.isPending}
                                className="gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Collaborator</DialogTitle>
            <DialogDescription>
              Add a team member to help manage this hackathon. They must already
              have an account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="collab-email">
                Email address
              </label>
              <Input
                id="collab-email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleInvite();
                }}
              />
            </div>

            {/* Role Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <div className="grid grid-cols-3 gap-2">
                {allRoles.map((r) => {
                  const rc = roleConfig[r];
                  const Icon = rc.icon;
                  const isActive = inviteRole === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setInviteRole(r)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all duration-200 hover:shadow-sm",
                        isActive
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/30"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      <span className="text-xs font-medium">{rc.label}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        {rc.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={inviteCollab.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={inviteCollab.isPending || !inviteEmail.trim()}
              className="gap-2"
            >
              {inviteCollab.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
