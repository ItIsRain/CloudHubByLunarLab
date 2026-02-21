"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Users,
  DollarSign,
  CheckCircle2,
  Eye,
  Ticket,
  Globe,
  MapPin,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import type { Event } from "@/lib/types";
import { useEventGuests } from "@/hooks/use-event-guests";

interface AnalyticsTabProps {
  event: Event;
  eventId: string;
}

export function AnalyticsTab({ event, eventId }: AnalyticsTabProps) {
  const { data: guestsData, isLoading } = useEventGuests(eventId);
  const guests = guestsData?.data ?? [];

  const registrationCount = guests.length;
  const checkedInCount = guests.filter(
    (g) => g.status === "checked-in"
  ).length;
  const totalGuests = guests.filter((g) => g.status !== "cancelled").length;
  const checkInRate =
    totalGuests > 0 ? Math.round((checkedInCount / totalGuests) * 100) : 0;

  const tickets = event.tickets ?? [];

  // Compute real revenue from registration data
  const revenueByCurrency = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const guest of guests) {
      if (guest.status === "cancelled") continue;
      const ticketType = guest.ticketType as {
        id?: string;
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
      for (const ticket of tickets) {
        if (ticket.sold > 0 && ticket.price > 0) {
          map[ticket.currency] =
            (map[ticket.currency] || 0) + ticket.price * ticket.sold;
        }
      }
    }
    return map;
  }, [guests, tickets]);

  const revenueDisplay = React.useMemo(() => {
    const entries = Object.entries(revenueByCurrency);
    if (entries.length === 0) return formatCurrency(0, tickets[0]?.currency || "USD");
    if (entries.length === 1) return formatCurrency(entries[0][1], entries[0][0]);
    return entries.map(([cur, amt]) => formatCurrency(amt, cur)).join(" + ");
  }, [revenueByCurrency, tickets]);

  // Real: Registration status breakdown (replaces fake "traffic sources")
  const registrationStatusBreakdown = React.useMemo(() => {
    const statusCounts: Record<string, number> = {};
    for (const guest of guests) {
      const status = guest.status || "pending";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }
    const total = guests.length || 1;
    const labels: Record<string, string> = {
      confirmed: "Confirmed",
      "checked-in": "Checked In",
      pending: "Pending",
      cancelled: "Cancelled",
    };
    return Object.entries(statusCounts)
      .map(([status, count]) => ({
        label: labels[status] || status,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [guests]);

  // Real: Ticket type breakdown
  const ticketBreakdown = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const guest of guests) {
      if (guest.status === "cancelled") continue;
      const ticketType = guest.ticketType as { name?: string } | null;
      const name = ticketType?.name || "General Admission";
      counts[name] = (counts[name] || 0) + 1;
    }
    const total = totalGuests || 1;
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [guests, totalGuests]);

  // Real: Geographic distribution from user location data
  const geoDistribution = React.useMemo(() => {
    const locations: Record<string, number> = {};
    for (const guest of guests) {
      if (guest.status === "cancelled") continue;
      const user = guest.user as { location?: string } | null;
      const loc = user?.location?.trim();
      if (loc) {
        locations[loc] = (locations[loc] || 0) + 1;
      } else {
        locations["Unknown"] = (locations["Unknown"] || 0) + 1;
      }
    }
    return Object.entries(locations)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [guests]);

  // Real: Registration timeline (group by date)
  const registrationTimeline = React.useMemo(() => {
    const dateMap: Record<string, number> = {};
    for (const guest of guests) {
      const date = new Date(guest.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      dateMap[date] = (dateMap[date] || 0) + 1;
    }
    return Object.entries(dateMap)
      .map(([date, count]) => ({ date, count }))
      .slice(-14); // Last 14 days
  }, [guests]);

  const totalSold = tickets.reduce((sum, t) => sum + t.sold, 0);

  const stats = [
    {
      label: "Total Registrations",
      value: isLoading ? "--" : String(registrationCount),
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Page Views",
      value: "--",
      subtext: "Tracking not enabled",
      icon: Eye,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Check-in Rate",
      value: `${checkInRate}%`,
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
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="font-display text-2xl font-bold">Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Event performance and insights
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.05 }}
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
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Ticket className="h-5 w-5 text-muted-foreground" />
                Ticket Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticketBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No registrations yet.
                </p>
              ) : (
                ticketBreakdown.map((item) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{item.name}</span>
                      <span className="text-muted-foreground">
                        {item.count} registered ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Registration Status Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                Registration Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {registrationStatusBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No registrations yet.
                </p>
              ) : (
                registrationStatusBreakdown.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{item.label}</span>
                      <span className="text-muted-foreground">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          item.label === "Confirmed"
                            ? "bg-primary"
                            : item.label === "Checked In"
                              ? "bg-green-500"
                              : item.label === "Cancelled"
                                ? "bg-red-500"
                                : "bg-yellow-500"
                        )}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Registration Timeline */}
        {registrationTimeline.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  Registration Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-32">
                  {registrationTimeline.map((day) => {
                    const maxCount = Math.max(
                      ...registrationTimeline.map((d) => d.count)
                    );
                    const height =
                      maxCount > 0
                        ? Math.max(8, (day.count / maxCount) * 100)
                        : 8;
                    return (
                      <div
                        key={day.date}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <span className="text-[10px] text-muted-foreground">
                          {day.count}
                        </span>
                        <div
                          className="w-full rounded-t bg-primary/80 transition-all duration-500"
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                          {day.date}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Geographic Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                Geographic Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {geoDistribution.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No registration data yet.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {geoDistribution.map((city, i) => (
                    <motion.div
                      key={city.city}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 + i * 0.05 }}
                      className="text-center p-3 rounded-xl bg-muted/50"
                    >
                      <p className="text-xl font-bold font-display">
                        {city.count}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {city.city}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
