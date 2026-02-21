"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Users,
  CheckCircle2,
  DollarSign,
  Percent,
  Clock,
  UserCheck,
  Ticket,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency, formatRelativeTime } from "@/lib/utils";
import type { Event } from "@/lib/types";
import { useEventGuests } from "@/hooks/use-event-guests";

interface OverviewTabProps {
  event: Event;
  eventId: string;
}

export function OverviewTab({ event, eventId }: OverviewTabProps) {
  const { data: guestsData, isLoading } = useEventGuests(eventId);
  const guests = guestsData?.data ?? [];

  const confirmedCount = guests.filter(
    (g) => g.status === "confirmed" || g.status === "checked-in"
  ).length;
  const checkedInCount = guests.filter(
    (g) => g.status === "checked-in"
  ).length;

  // Compute real revenue from registration data + multi-currency
  const revenueByCurrency = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const guest of guests) {
      if (guest.status === "cancelled") continue;
      const ticketType = guest.ticketType as {
        price?: number;
        currency?: string;
      } | null;
      if (ticketType?.price && ticketType.price > 0) {
        const cur = ticketType.currency || "USD";
        map[cur] = (map[cur] || 0) + ticketType.price;
      }
    }
    // Fallback to ticket.sold * ticket.price if no registration data
    if (Object.keys(map).length === 0) {
      for (const t of event.tickets ?? []) {
        if (t.sold > 0 && t.price > 0) {
          map[t.currency] = (map[t.currency] || 0) + t.price * t.sold;
        }
      }
    }
    return map;
  }, [guests, event.tickets]);

  const revenueDisplay = React.useMemo(() => {
    const entries = Object.entries(revenueByCurrency);
    if (entries.length === 0)
      return formatCurrency(0, event.tickets?.[0]?.currency || "USD");
    if (entries.length === 1)
      return formatCurrency(entries[0][1], entries[0][0]);
    return entries.map(([cur, amt]) => formatCurrency(amt, cur)).join(" + ");
  }, [revenueByCurrency, event.tickets]);

  const capacity = event.capacity || 0;
  const utilization =
    capacity > 0 ? Math.round((confirmedCount / capacity) * 100) : 0;

  const stats = [
    {
      label: "Registrations",
      value: isLoading ? "--" : String(guests.length),
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Checked In",
      value: isLoading ? "--" : String(checkedInCount),
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Revenue",
      value: revenueDisplay,
      icon: DollarSign,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      label: "Capacity",
      value: capacity > 0 ? `${utilization}%` : "N/A",
      icon: Percent,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  // Recent activity from the last 5 registrations
  const recentGuests = guests.slice(0, 5);

  const getActivityIcon = (status: string) => {
    switch (status) {
      case "checked-in":
        return CheckCircle2;
      case "cancelled":
        return XCircle;
      case "confirmed":
        return UserCheck;
      default:
        return Ticket;
    }
  };

  const getActivityMessage = (guest: (typeof guests)[0]) => {
    if (!guest.user) return "Unknown user";
    const name = guest.user.name;
    switch (guest.status) {
      case "checked-in":
        return `${name} checked in`;
      case "cancelled":
        return `${name} cancelled registration`;
      default:
        return `${name} registered`;
    }
  };

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      stat.bgColor
                    )}
                  >
                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentGuests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No registrations yet. Share your event to start getting signups!
              </p>
            ) : (
              <div className="space-y-4">
                {recentGuests.map((guest, i) => {
                  const Icon = getActivityIcon(guest.status);
                  return (
                    <motion.div
                      key={guest.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className="flex items-start gap-3 pb-4 last:pb-0 border-b last:border-b-0"
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {getActivityMessage(guest)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {guest.ticketType
                            ? (guest.ticketType as { name?: string }).name ||
                              "General"
                            : "General Admission"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(guest.createdAt)}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
