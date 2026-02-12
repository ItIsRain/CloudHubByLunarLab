"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Download,
  UserPlus,
  CheckCircle2,
  Users,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatDate } from "@/lib/utils";
import { mockEvents } from "@/lib/mock-data";
import { toast } from "sonner";

type GuestStatus = "Registered" | "Checked-in" | "Cancelled";

interface Guest {
  id: string;
  name: string;
  email: string;
  ticketType: string;
  status: GuestStatus;
  date: string;
}

const mockGuests: Guest[] = [
  { id: "g-1", name: "Sarah Kim", email: "sarah.kim@email.com", ticketType: "VIP Pass", status: "Checked-in", date: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: "g-2", name: "Marcus Johnson", email: "marcus.johnson@email.com", ticketType: "General Admission", status: "Checked-in", date: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: "g-3", name: "Emma Wilson", email: "emma.wilson@email.com", ticketType: "Early Bird", status: "Registered", date: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: "g-4", name: "David Park", email: "david.park@email.com", ticketType: "General Admission", status: "Registered", date: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: "g-5", name: "Lisa Wang", email: "lisa.wang@email.com", ticketType: "VIP Pass", status: "Checked-in", date: new Date(Date.now() - 86400000 * 1).toISOString() },
  { id: "g-6", name: "James Rodriguez", email: "james.rodriguez@email.com", ticketType: "Early Bird", status: "Cancelled", date: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: "g-7", name: "Amy Chen", email: "amy.chen@email.com", ticketType: "General Admission", status: "Registered", date: new Date(Date.now() - 86400000 * 4).toISOString() },
  { id: "g-8", name: "Robert Brown", email: "robert.brown@email.com", ticketType: "Student", status: "Registered", date: new Date(Date.now() - 86400000 * 6).toISOString() },
  { id: "g-9", name: "Olivia Martinez", email: "olivia.martinez@email.com", ticketType: "General Admission", status: "Checked-in", date: new Date(Date.now() - 86400000 * 8).toISOString() },
  { id: "g-10", name: "Daniel Lee", email: "daniel.lee@email.com", ticketType: "VIP Pass", status: "Cancelled", date: new Date(Date.now() - 86400000 * 12).toISOString() },
];

const statusFilters: Array<"All" | GuestStatus> = [
  "All",
  "Registered",
  "Checked-in",
  "Cancelled",
];

const statusBadgeVariant: Record<GuestStatus, "secondary" | "success" | "destructive"> = {
  Registered: "secondary",
  "Checked-in": "success",
  Cancelled: "destructive",
};

export default function GuestsPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const event = mockEvents.find((e) => e.id === eventId);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"All" | GuestStatus>("All");

  if (!event) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <h2 className="font-display text-2xl font-bold mb-2">Event not found</h2>
              <p className="text-muted-foreground mb-6">
                The event you are looking for does not exist or has been removed.
              </p>
              <Button asChild>
                <Link href="/dashboard/events">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to My Events
                </Link>
              </Button>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  const filteredGuests = mockGuests.filter((guest) => {
    const matchesSearch =
      guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guest.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      activeFilter === "All" || guest.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const registeredCount = mockGuests.filter((g) => g.status === "Registered").length;
  const checkedInCount = mockGuests.filter((g) => g.status === "Checked-in").length;
  const cancelledCount = mockGuests.filter((g) => g.status === "Cancelled").length;

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/events/${eventId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Overview
              </Link>
            </Button>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
          >
            <div>
              <h1 className="font-display text-3xl font-bold">Guest List</h1>
              <p className="text-muted-foreground mt-1">{event.title}</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => toast.success("CSV export started. Download will begin shortly.")}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                onClick={() => toast.success("Guest invitation sent!")}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Guest
              </Button>
            </div>
          </motion.div>

          {/* Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
          >
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Registered</p>
                  <p className="font-display text-xl font-bold">{registeredCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Checked-in</p>
                  <p className="font-display text-xl font-bold">{checkedInCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Users className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cancelled</p>
                  <p className="font-display text-xl font-bold">{cancelledCount}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Search & Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row gap-4 mb-6"
          >
            <div className="flex-1">
              <Input
                icon={<Search className="h-4 w-4" />}
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {statusFilters.map((filter) => (
                <Button
                  key={filter}
                  variant={activeFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter}
                </Button>
              ))}
            </div>
          </motion.div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left text-sm font-medium text-muted-foreground px-6 py-3">
                          Name
                        </th>
                        <th className="text-left text-sm font-medium text-muted-foreground px-6 py-3">
                          Email
                        </th>
                        <th className="text-left text-sm font-medium text-muted-foreground px-6 py-3">
                          Ticket
                        </th>
                        <th className="text-left text-sm font-medium text-muted-foreground px-6 py-3">
                          Status
                        </th>
                        <th className="text-left text-sm font-medium text-muted-foreground px-6 py-3">
                          Date
                        </th>
                        <th className="text-left text-sm font-medium text-muted-foreground px-6 py-3">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGuests.map((guest, i) => (
                        <motion.tr
                          key={guest.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.15 + i * 0.05 }}
                          className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-6 py-4 text-sm font-medium">
                            {guest.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {guest.email}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {guest.ticketType}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={statusBadgeVariant[guest.status]}>
                              {guest.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {formatDate(guest.date)}
                          </td>
                          <td className="px-6 py-4">
                            {guest.status === "Registered" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  toast.success(`${guest.name} has been checked in!`)
                                }
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                Check In
                              </Button>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                      {filteredGuests.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-6 py-12 text-center text-muted-foreground"
                          >
                            No guests found matching your criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
