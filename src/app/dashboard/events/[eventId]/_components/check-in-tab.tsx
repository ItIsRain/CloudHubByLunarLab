"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ScanLine,
  Search,
  CheckCircle2,
  Users,
  TrendingUp,
  Clock,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatRelativeTime, getInitials } from "@/lib/utils";
import type { Event } from "@/lib/types";
import {
  useEventGuests,
  useUpdateGuestStatus,
} from "@/hooks/use-event-guests";
import { toast } from "sonner";

interface CheckInTabProps {
  event: Event;
  eventId: string;
}

export function CheckInTab({ event, eventId }: CheckInTabProps) {
  const { data: guestsData, isLoading } = useEventGuests(eventId);
  const updateStatus = useUpdateGuestStatus();

  const [search, setSearch] = React.useState("");

  const guests = guestsData?.data ?? [];
  const totalGuests = guests.filter(
    (g) => g.status !== "cancelled"
  ).length;
  const checkedInCount = guests.filter(
    (g) => g.status === "checked-in"
  ).length;
  const checkInRate =
    totalGuests > 0 ? Math.round((checkedInCount / totalGuests) * 100) : 0;

  // Guests available for check-in (confirmed only)
  const checkInableGuests = guests.filter(
    (g) =>
      g.status === "confirmed" &&
      g.user &&
      (search === "" ||
        g.user.name.toLowerCase().includes(search.toLowerCase()) ||
        g.user.email.toLowerCase().includes(search.toLowerCase()))
  );

  // Recent check-ins
  const recentCheckIns = guests
    .filter((g) => g.status === "checked-in")
    .sort(
      (a, b) =>
        new Date(b.checkedInAt || b.createdAt).getTime() -
        new Date(a.checkedInAt || a.createdAt).getTime()
    )
    .slice(0, 8);

  const handleCheckIn = async (registrationId: string, name: string) => {
    try {
      await updateStatus.mutateAsync({
        eventId,
        registrationId,
        status: "checked-in",
      });
      toast.success(`${name} checked in!`);
      setSearch("");
    } catch {
      toast.error("Failed to check in guest.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="font-display text-2xl font-bold">Check-In</h2>
        <p className="text-sm text-muted-foreground">
          Manage attendee check-ins for {event.title}
        </p>
      </motion.div>

      {/* Counter Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <ScanLine className="h-8 w-8 text-primary" />
            </div>
            <p className="text-6xl font-bold font-display mb-2">
              {isLoading ? "--" : checkedInCount}{" "}
              <span className="text-2xl text-muted-foreground font-normal">
                / {totalGuests}
              </span>
            </p>
            <p className="text-muted-foreground">Guests Checked In</p>

            {/* Progress bar */}
            <div className="mt-4 max-w-xs mx-auto">
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${checkInRate}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {checkInRate}% check-in rate
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-4"
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xl font-bold font-display">{totalGuests}</p>
                <p className="text-xs text-muted-foreground">Expected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-xl font-bold font-display">{checkedInCount}</p>
                <p className="text-xs text-muted-foreground">Checked In</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-xl font-bold font-display">{checkInRate}%</p>
                <p className="text-xs text-muted-foreground">Check-in Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Check-in Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Check-In</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />

            {search && (
              <div className="space-y-2">
                {checkInableGuests.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No matching confirmed guests found.
                  </p>
                ) : (
                  checkInableGuests.slice(0, 5).map((guest) => (
                    <div
                      key={guest.id}
                      className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar size="sm">
                          <AvatarImage
                            src={guest.user?.avatar}
                            alt={guest.user?.name}
                          />
                          <AvatarFallback>
                            {getInitials(guest.user?.name || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {guest.user?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {guest.user?.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          handleCheckIn(guest.id, guest.user?.name || "Guest")
                        }
                        disabled={updateStatus.isPending}
                      >
                        <UserCheck className="h-4 w-4" />
                        Check In
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Check-ins */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Check-Ins</CardTitle>
          </CardHeader>
          <CardContent>
            {recentCheckIns.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No guests have checked in yet.
              </p>
            ) : (
              <div className="space-y-3">
                {recentCheckIns.map((guest, i) => (
                  <motion.div
                    key={guest.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.03 }}
                    className="flex items-center justify-between py-2 border-b last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar size="sm">
                        <AvatarImage
                          src={guest.user?.avatar}
                          alt={guest.user?.name}
                        />
                        <AvatarFallback>
                          {getInitials(guest.user?.name || "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {guest.user?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(
                            guest.ticketType as { name?: string } | null
                          )?.name || "General"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(
                        guest.checkedInAt || guest.createdAt
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
