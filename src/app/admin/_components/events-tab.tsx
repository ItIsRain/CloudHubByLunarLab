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
  Calendar,
  Loader2,
} from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import { useQueryClient } from "@tanstack/react-query";
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

export function EventsTab() {
  const queryClient = useQueryClient();
  const { data: eventsData, isLoading: eventsLoading } = useEvents();
  const events = eventsData?.data || [];
  const [search, setSearch] = React.useState("");
  const [featured, setFeatured] = React.useState<Record<string, boolean>>({});
  const [loadingActions, setLoadingActions] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (events.length > 0 && Object.keys(featured).length === 0) {
      const map: Record<string, boolean> = {};
      events.forEach((e) => {
        map[e.id] = e.isFeatured;
      });
      setFeatured(map);
    }
  }, [events, featured]);

  const toggleFeatured = async (eventId: string, title: string) => {
    const current = featured[eventId] ?? false;
    const newValue = !current;

    // Optimistic update
    setFeatured((prev) => ({ ...prev, [eventId]: newValue }));
    setLoadingActions((prev) => ({ ...prev, [eventId]: "featured" }));

    try {
      const res = await fetch("/api/admin/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "event",
          entityId: eventId,
          featured: newValue,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(data.error || "Failed to update featured status");
      }

      await queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success(
        newValue
          ? `"${title}" has been featured`
          : `"${title}" has been unfeatured`
      );
    } catch (err) {
      // Revert optimistic update
      setFeatured((prev) => ({ ...prev, [eventId]: current }));
      toast.error(err instanceof Error ? err.message : "Failed to toggle featured");
    } finally {
      setLoadingActions((prev) => {
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
    }
  };

  const moderateEvent = async (
    eventId: string,
    title: string,
    action: "approve" | "reject"
  ) => {
    setLoadingActions((prev) => ({ ...prev, [eventId]: action }));

    try {
      const res = await fetch("/api/admin/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "event",
          entityId: eventId,
          action,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(data.error || `Failed to ${action} event`);
      }

      await queryClient.invalidateQueries({ queryKey: ["events"] });

      if (action === "approve") {
        toast.success(`"${title}" has been approved and published`);
      } else {
        toast.warning(`"${title}" has been rejected`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action} event`);
    } finally {
      setLoadingActions((prev) => {
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
    }
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
  const cancelledEvents = filterBySearch(events.filter((e) => e.status === "cancelled"));
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
          const isLoading = !!loadingActions[event.id];
          const currentAction = loadingActions[event.id];
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
                disabled={isLoading}
                onClick={() => moderateEvent(event.id, event.title, "approve")}
              >
                {currentAction === "approve" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-red-500 hover:text-red-600"
                title="Reject"
                disabled={isLoading}
                onClick={() => moderateEvent(event.id, event.title, "reject")}
              >
                {currentAction === "reject" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          );
        },
        enableSorting: false,
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [featured, loadingActions]
  );

  if (eventsLoading) {
    return <div className="shimmer rounded-xl h-96 w-full" />;
  }

  return (
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
          <TabsTrigger value="cancelled">
            Cancelled ({cancelledEvents.length})
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
        <TabsContent value="cancelled" className="mt-0">
          <DataTable
            columns={columns}
            data={cancelledEvents}
            searchable={false}
            emptyTitle="No cancelled events"
            emptyDescription="No events have been cancelled."
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
  );
}
