"use client";

import { motion } from "framer-motion";
import { cn, getInitials } from "@/lib/utils";
import type { Team } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TeamCardProps {
  team: Team;
  onJoin?: (teamId: string) => void;
  onView?: (teamId: string) => void;
  className?: string;
}

const statusVariant: Record<string, "default" | "success" | "warning" | "muted"> = {
  forming: "warning",
  complete: "success",
  submitted: "default",
};

export function TeamCard({
  team,
  onJoin,
  onView,
  className,
}: TeamCardProps) {
  const isJoinable = team.status === "forming" && team.members.length < team.maxSize;
  const displayedMembers = team.members.slice(0, 4);
  const remainingMembers = team.members.length - 4;

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Card
        className={cn(
          "overflow-hidden transition-shadow duration-300 hover:shadow-lg",
          className
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display font-bold text-lg truncate">
              {team.name}
            </h3>
            <Badge variant={statusVariant[team.status] ?? "muted"}>
              {team.status}
            </Badge>
          </div>
          {team.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {team.description}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Member avatars */}
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {displayedMembers.map((member) => (
                <Avatar
                  key={member.id}
                  size="sm"
                  className="border-2 border-background"
                >
                  <AvatarImage src={member.user.avatar} alt={member.user.name} />
                  <AvatarFallback className="text-xs">
                    {getInitials(member.user.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {remainingMembers > 0 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground border-2 border-background text-xs font-medium -ml-2">
                  +{remainingMembers}
                </div>
              )}
            </div>
            <span className="ml-3 text-sm text-muted-foreground">
              {team.members.length}/{team.maxSize} members
            </span>
          </div>

          {/* Looking for roles */}
          {team.lookingForRoles && team.lookingForRoles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">Looking for:</span>
              {team.lookingForRoles.map((role) => (
                <Badge key={role} variant="outline" className="text-xs">
                  {role}
                </Badge>
              ))}
            </div>
          )}

          {/* Track badge */}
          {team.track && (
            <Badge variant="secondary" className="text-xs">
              {team.track.name}
            </Badge>
          )}
        </CardContent>

        <CardFooter className="gap-2">
          {isJoinable && onJoin ? (
            <Button
              size="sm"
              onClick={() => onJoin(team.id)}
              className="flex-1"
            >
              Join Team
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onView?.(team.id)}
              className="flex-1"
            >
              View Team
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}
