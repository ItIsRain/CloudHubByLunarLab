"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & {
    size?: "xs" | "sm" | "md" | "lg" | "xl";
  }
>(({ className, size = "md", ...props }, ref) => {
  const sizeClasses = {
    xs: "h-6 w-6",
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full ring-2 ring-background",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
});
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted font-medium text-muted-foreground",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// Avatar Group Component
interface AvatarGroupProps {
  avatars: { src?: string; name: string }[];
  max?: number;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const AvatarGroup = ({ avatars, max = 4, size = "sm", className }: AvatarGroupProps) => {
  const displayed = avatars.slice(0, max);
  const remaining = avatars.length - max;

  const sizeClasses = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  const overlapClasses = {
    xs: "-ml-2",
    sm: "-ml-2.5",
    md: "-ml-3",
    lg: "-ml-4",
  };

  return (
    <div className={cn("flex items-center", className)}>
      {displayed.map((avatar, i) => (
        <Avatar
          key={i}
          className={cn(
            sizeClasses[size],
            i > 0 && overlapClasses[size],
            "border-2 border-background"
          )}
        >
          <AvatarImage src={avatar.src} alt={avatar.name} />
          <AvatarFallback>
            {avatar.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
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
};

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup };
