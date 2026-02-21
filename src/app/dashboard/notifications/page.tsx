"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bell,
  Calendar,
  Trophy,
  Users,
  MessageSquare,
  Star,
  Info,
  CheckCheck,
  Filter,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useToggleNotificationRead,
} from "@/hooks/use-notifications";
import type { NotificationType } from "@/lib/types";

const typeConfig: Record<NotificationType, { icon: React.ElementType; color: string }> = {
  "event-reminder": { icon: Calendar, color: "text-blue-500" },
  "hackathon-update": { icon: Trophy, color: "text-yellow-500" },
  "team-invite": { icon: Users, color: "text-green-500" },
  "team-message": { icon: MessageSquare, color: "text-purple-500" },
  "submission-feedback": { icon: Star, color: "text-orange-500" },
  "winner-announcement": { icon: Trophy, color: "text-amber-500" },
  system: { icon: Info, color: "text-muted-foreground" },
};

const filterOptions: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "event-reminder", label: "Events" },
  { value: "hackathon-update", label: "Hackathons" },
  { value: "team-invite", label: "Teams" },
  { value: "submission-feedback", label: "Submissions" },
];

export default function NotificationsPage() {
  const [filter, setFilter] = React.useState("all");

  const queryFilters = React.useMemo(() => {
    const f: { type?: string; unread?: boolean; pageSize?: number } = { pageSize: 50 };
    if (filter === "unread") {
      f.unread = true;
    } else if (filter !== "all") {
      f.type = filter;
    }
    return f;
  }, [filter]);

  const { data, isLoading } = useNotifications(queryFilters);
  const markAllRead = useMarkAllNotificationsRead();
  const toggleRead = useToggleNotificationRead();

  const notifications = data?.data || [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  const handleToggleRead = (id: string, currentlyRead: boolean) => {
    toggleRead.mutate({ id, is_read: !currentlyRead });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6"
          >
            <div>
              <h1 className="font-display text-3xl font-bold">Notifications</h1>
              <p className="text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            )}
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex items-center gap-2 mb-6 overflow-x-auto pb-2"
          >
            <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            {filterOptions.map((opt) => (
              <Badge
                key={opt.value}
                variant={filter === opt.value ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap"
                onClick={() => setFilter(opt.value)}
              >
                {opt.label}
              </Badge>
            ))}
          </motion.div>

          {/* List */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="shimmer rounded-xl h-20 w-full" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-display text-lg font-bold mb-1">No notifications</h3>
                <p className="text-muted-foreground text-sm">
                  {filter === "unread"
                    ? "You're all caught up!"
                    : "No notifications in this category yet."}
                </p>
              </motion.div>
            ) : (
              notifications.map((notification, i) => {
                const config = typeConfig[notification.type];
                const Icon = config.icon;

                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card
                      className={cn(
                        "transition-colors",
                        !notification.isRead && "border-primary/30 bg-primary/5"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={cn("p-2 rounded-lg bg-muted flex-shrink-0", config.color)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                {notification.link ? (
                                  <Link href={notification.link} className="hover:underline">
                                    <p className="text-sm font-medium">{notification.title}</p>
                                  </Link>
                                ) : (
                                  <p className="text-sm font-medium">{notification.title}</p>
                                )}
                                <p className="text-sm text-muted-foreground mt-0.5">
                                  {notification.message}
                                </p>
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatRelativeTime(notification.createdAt)}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleRead(notification.id, notification.isRead)}
                            className={cn(
                              "h-2.5 w-2.5 rounded-full flex-shrink-0 mt-1.5 transition-colors",
                              notification.isRead ? "bg-muted hover:bg-primary/50" : "bg-primary"
                            )}
                            title={notification.isRead ? "Mark as unread" : "Mark as read"}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
