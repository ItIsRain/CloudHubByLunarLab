"use client";

import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AvatarGroupUser {
  name: string;
  avatar?: string;
}

interface AvatarGroupProps {
  users: AvatarGroupUser[];
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

const overlapClasses = {
  sm: "-ml-2.5",
  md: "-ml-3",
  lg: "-ml-4",
};

export function AvatarGroup({
  users,
  max = 4,
  size = "md",
  className,
}: AvatarGroupProps) {
  const displayed = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <div className={cn("flex items-center", className)}>
      {displayed.map((user, i) => (
        <Avatar
          key={i}
          className={cn(
            sizeClasses[size],
            i > 0 && overlapClasses[size],
            "border-2 border-background"
          )}
        >
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="text-xs">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-muted text-muted-foreground border-2 border-background font-medium",
            sizeClasses[size],
            overlapClasses[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
