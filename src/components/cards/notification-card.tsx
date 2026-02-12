"use client";

import * as React from "react";
import {
  Bell,
  Calendar,
  Code,
  MessageSquare,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { Notification, NotificationType } from "@/lib/types";

interface NotificationCardProps {
  notification: Notification;
  onRead?: (id: string) => void;
  className?: string;
}

const typeIcons: Record<NotificationType, React.ElementType> = {
  "event-reminder": Calendar,
  "hackathon-update": Zap,
  "team-invite": Users,
  "team-message": MessageSquare,
  "submission-feedback": Code,
  "winner-announcement": Trophy,
  system: Bell,
};

const typeColors: Record<NotificationType, string> = {
  "event-reminder": "bg-blue-500/10 text-blue-500",
  "hackathon-update": "bg-primary/10 text-primary",
  "team-invite": "bg-violet-500/10 text-violet-500",
  "team-message": "bg-emerald-500/10 text-emerald-500",
  "submission-feedback": "bg-amber-500/10 text-amber-500",
  "winner-announcement": "bg-yellow-500/10 text-yellow-500",
  system: "bg-muted text-muted-foreground",
};

export function NotificationCard({
  notification,
  onRead,
  className,
}: NotificationCardProps) {
  const Icon = typeIcons[notification.type] ?? Bell;
  const colorClass = typeColors[notification.type] ?? "bg-muted text-muted-foreground";

  const handleClick = () => {
    if (!notification.isRead) {
      onRead?.(notification.id);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors duration-200",
        notification.isRead
          ? "bg-transparent hover:bg-muted/50"
          : "bg-primary/5 hover:bg-primary/10",
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          colorClass
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4
            className={cn(
              "text-sm truncate",
              notification.isRead
                ? "font-medium text-foreground"
                : "font-semibold text-foreground"
            )}
          >
            {notification.title}
          </h4>
          {!notification.isRead && (
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        <span className="text-[11px] text-muted-foreground/70 mt-1 block">
          {formatRelativeTime(notification.createdAt)}
        </span>
      </div>
    </button>
  );
}
