"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  Eye,
  Star,
  StarOff,
  Check,
  X,
  ChevronLeft,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn, formatDate } from "@/lib/utils";
import { mockEvents } from "@/lib/mock-data";
import { toast } from "sonner";

const statusStyles: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  draft: "secondary",
  published: "success",
  cancelled: "destructive",
  completed: "default",
};

export default function AdminEventsPage() {
  const [search, setSearch] = React.useState("");
  const [featured, setFeatured] = React.useState<Record<string, boolean>>(
    () => {
      const map: Record<string, boolean> = {};
      mockEvents.forEach((e) => {
        map[e.id] = e.isFeatured;
      });
      return map;
    }
  );

  const filterBySearch = (events: typeof mockEvents) =>
    events.filter(
      (event) =>
        event.title.toLowerCase().includes(search.toLowerCase()) ||
        event.organizer.name.toLowerCase().includes(search.toLowerCase())
    );

  const allEvents = filterBySearch(mockEvents);
  const flaggedEvents = filterBySearch(
    mockEvents.filter((_, i) => i % 7 === 0)
  );
  const pendingEvents = filterBySearch(
    mockEvents.filter((e) => e.status === "draft")
  );

  const toggleFeatured = (eventId: string, title: string) => {
    setFeatured((prev) => {
      const next = { ...prev, [eventId]: !prev[eventId] };
      if (next[eventId]) {
        toast.success(`"${title}" has been featured`);
      } else {
        toast.info(`"${title}" has been unfeatured`);
      }
      return next;
    });
  };

  const renderTable = (events: typeof mockEvents) => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Title</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4 hidden md:table-cell">Organizer</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4 hidden lg:table-cell">Date</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Status</th>
            <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Featured</th>
            <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {events.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-8 text-center text-muted-foreground">
                No events found matching your criteria.
              </td>
            </tr>
          ) : (
            events.map((event, i) => (
              <motion.tr
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="hover:bg-muted/50 transition-colors"
              >
                <td className="p-4">
                  <div>
                    <p className="font-medium text-sm">{event.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 md:hidden">
                      by {event.organizer.name}
                    </p>
                  </div>
                </td>
                <td className="p-4 text-sm text-muted-foreground hidden md:table-cell">
                  {event.organizer.name}
                </td>
                <td className="p-4 text-sm text-muted-foreground hidden lg:table-cell">
                  {formatDate(event.startDate)}
                </td>
                <td className="p-4">
                  <Badge variant={statusStyles[event.status] || "secondary"} className="capitalize text-xs">
                    {event.status}
                  </Badge>
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => toggleFeatured(event.id, event.title)}
                    className={cn(
                      "inline-flex items-center justify-center h-6 w-6 rounded-md transition-colors",
                      featured[event.id]
                        ? "text-yellow-500 bg-yellow-500/10"
                        : "text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10"
                    )}
                  >
                    {featured[event.id] ? (
                      <Star className="h-4 w-4 fill-current" />
                    ) : (
                      <StarOff className="h-4 w-4" />
                    )}
                  </button>
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/events/${event.slug}`}>
                      <Button variant="ghost" size="sm" className="h-8 px-2" title="View event">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-green-500 hover:text-green-600"
                      title="Approve"
                      onClick={() => toast.success(`"${event.title}" approved`)}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-red-500 hover:text-red-600"
                      title="Reject"
                      onClick={() => toast.error(`"${event.title}" rejected`)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </motion.tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-1">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="gap-1 -ml-2">
                  <ChevronLeft className="h-4 w-4" />
                  Admin
                </Button>
              </Link>
            </div>
            <h1 className="font-display text-3xl font-bold">Events Moderation</h1>
            <p className="text-muted-foreground mt-1">Review, moderate, and feature events</p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-6"
          >
            <Input
              placeholder="Search events by title or organizer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">
                  All Events ({allEvents.length})
                </TabsTrigger>
                <TabsTrigger value="flagged">
                  Flagged ({flaggedEvents.length})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending Review ({pendingEvents.length})
                </TabsTrigger>
              </TabsList>

              <Card>
                <CardContent className="p-0">
                  <TabsContent value="all" className="mt-0">
                    {renderTable(allEvents)}
                  </TabsContent>
                  <TabsContent value="flagged" className="mt-0">
                    {renderTable(flaggedEvents)}
                  </TabsContent>
                  <TabsContent value="pending" className="mt-0">
                    {renderTable(pendingEvents)}
                  </TabsContent>
                </CardContent>
              </Card>
            </Tabs>
          </motion.div>
        </div>
      </main>
    </>
  );
}
