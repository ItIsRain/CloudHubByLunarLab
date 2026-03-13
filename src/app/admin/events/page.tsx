"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Eye,
  Star,
  StarOff,
  Check,
  X,
  ChevronLeft,
  Calendar,
} from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { cn, formatDate } from "@/lib/utils";
import { useEvents } from "@/hooks/use-events";
import type { Event } from "@/lib/types";
import { toast } from "sonner";

const statusStyles: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  draft: "secondary",
  published: "success",
  cancelled: "destructive",
  completed: "default",
};

const columnHelper = createColumnHelper<Event>();

export default function AdminEventsPage() {
  const { data: eventsData, isLoading: eventsLoading } = useEvents();
  const events = eventsData?.data || [];
  const [search, setSearch] = React.useState("");
  const [featured, setFeatured] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (events.length > 0 && Object.keys(featured).length === 0) {
      const map: Record<string, boolean> = {};
      events.forEach((e) => {
        map[e.id] = e.isFeatured;
      });
      setFeatured(map);
    }
  }, [events, featured]);

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

  const filterBySearch = (list: Event[]) =>
    search
      ? list.filter(
          (event) =>
            event.title.toLowerCase().includes(search.toLowerCase()) ||
            event.organizer.name.toLowerCase().includes(search.toLowerCase())
        )
      : list;

  const allEvents = filterBySearch(events);
  const flaggedEvents = filterBySearch(events.filter((_, i) => i % 7 === 0));
  const pendingEvents = filterBySearch(events.filter((e) => e.status === "draft"));

  const columns = React.useMemo(
    () => [
      columnHelper.accessor("title", {
        header: "Title",
        cell: ({ row }) => {
          const event = row.original;
          return (
            <div>
              <p className="font-medium text-sm">{event.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 md:hidden">
                by {event.organizer.name}
              </p>
            </div>
          );
        },
      }),
      columnHelper.accessor((row) => row.organizer.name, {
        id: "organizer",
        header: "Organizer",
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground hidden md:inline">
            {getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("startDate", {
        header: "Date",
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground hidden lg:inline">
            {formatDate(getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ getValue }) => (
          <Badge variant={statusStyles[getValue()] || "secondary"} className="capitalize text-xs">
            {getValue()}
          </Badge>
        ),
      }),
      columnHelper.display({
        id: "featured",
        header: "Featured",
        cell: ({ row }) => {
          const event = row.original;
          const isFeatured = featured[event.id] ?? event.isFeatured;
          return (
            <div className="text-center">
              <button
                onClick={() => toggleFeatured(event.id, event.title)}
                className={cn(
                  "inline-flex items-center justify-center h-6 w-6 rounded-md transition-colors",
                  isFeatured
                    ? "text-yellow-500 bg-yellow-500/10"
                    : "text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10"
                )}
              >
                {isFeatured ? (
                  <Star className="h-4 w-4 fill-current" />
                ) : (
                  <StarOff className="h-4 w-4" />
                )}
              </button>
            </div>
          );
        },
        enableSorting: false,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const event = row.original;
          return (
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
          );
        },
        enableSorting: false,
      }),
    ],
    [featured]
  );

  if (eventsLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="shimmer rounded-xl h-96 w-full" />
          </div>
        </main>
      </>
    );
  }

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

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
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

              <TabsContent value="all" className="mt-0">
                <DataTable
                  columns={columns}
                  data={allEvents}
                  searchable={true}
                  searchPlaceholder="Search events by title or organizer..."
                  emptyTitle="No events found"
                  emptyDescription="No events match your criteria."
                  emptyIcon={<Calendar className="h-6 w-6 text-muted-foreground" />}
                />
              </TabsContent>
              <TabsContent value="flagged" className="mt-0">
                <DataTable
                  columns={columns}
                  data={flaggedEvents}
                  searchable={false}
                  emptyTitle="No flagged events"
                  emptyDescription="No events have been flagged for review."
                  emptyIcon={<Calendar className="h-6 w-6 text-muted-foreground" />}
                />
              </TabsContent>
              <TabsContent value="pending" className="mt-0">
                <DataTable
                  columns={columns}
                  data={pendingEvents}
                  searchable={false}
                  emptyTitle="No pending events"
                  emptyDescription="All events have been reviewed."
                  emptyIcon={<Calendar className="h-6 w-6 text-muted-foreground" />}
                />
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>
    </>
  );
}
