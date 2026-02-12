"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  X,
  Bell,
  Calendar,
  Trophy,
  Users,
  MessageSquare,
  Star,
  AlertCircle,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mockNotifications } from "@/lib/mock-data";
import type { NotificationType } from "@/lib/types";

interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "event-reminder":
      return <Calendar className="h-4 w-4" />;
    case "hackathon-update":
      return <Trophy className="h-4 w-4" />;
    case "team-invite":
      return <Users className="h-4 w-4" />;
    case "team-message":
      return <MessageSquare className="h-4 w-4" />;
    case "submission-feedback":
      return <Star className="h-4 w-4" />;
    case "winner-announcement":
      return <Trophy className="h-4 w-4 text-yellow-500" />;
    case "system":
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

function getNotificationIconBg(type: NotificationType) {
  switch (type) {
    case "event-reminder":
      return "bg-blue-500/10 text-blue-500";
    case "hackathon-update":
      return "bg-primary/10 text-primary";
    case "team-invite":
      return "bg-green-500/10 text-green-500";
    case "team-message":
      return "bg-purple-500/10 text-purple-500";
    case "submission-feedback":
      return "bg-amber-500/10 text-amber-500";
    case "winner-announcement":
      return "bg-yellow-500/10 text-yellow-500";
    case "system":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

export function NotificationPanel({
  open,
  onOpenChange,
}: NotificationPanelProps) {
  const [notifications, setNotifications] = useState(mockNotifications.slice(0, 10));

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true }))
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed right-0 top-0 z-50 h-full w-full max-w-md",
              "border-l bg-background shadow-2xl"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-bold">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="text-xs"
                >
                  <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                  Mark all read
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Notification list */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <div className="rounded-full bg-muted p-4">
                    <Bell className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    No notifications yet
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Link
                        href={notification.link || "#"}
                        className={cn(
                          "flex gap-3 px-5 py-3.5 transition-colors hover:bg-muted/50",
                          !notification.isRead && "bg-primary/[0.03]"
                        )}
                        onClick={() => onOpenChange(false)}
                      >
                        {/* Icon */}
                        <div
                          className={cn(
                            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                            getNotificationIconBg(notification.type)
                          )}
                        >
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={cn(
                                "text-sm leading-tight",
                                !notification.isRead
                                  ? "font-semibold"
                                  : "font-medium"
                              )}
                            >
                              {notification.title}
                            </p>
                            {/* Unread dot */}
                            {!notification.isRead && (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground/70">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t px-5 py-3">
              <Link
                href="/dashboard/notifications"
                className="flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"
                onClick={() => onOpenChange(false)}
              >
                View All Notifications
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
