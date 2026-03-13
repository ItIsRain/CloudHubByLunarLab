"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  GripVertical,
  Star,
  Trash2,
  Plus,
  Calendar,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { useEvents } from "@/hooks/use-events";
import { useHackathons } from "@/hooks/use-hackathons";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

async function setFeatured(entityType: "event" | "hackathon", entityId: string, featured: boolean) {
  const res = await fetch("/api/admin/featured", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entityType, entityId, featured }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function FeaturedTab() {
  const queryClient = useQueryClient();
  const { data: eventsData, isLoading: eventsLoading } = useEvents();
  const { data: hackathonsData, isLoading: hackathonsLoading } = useHackathons();
  const allEvents = eventsData?.data || [];
  const allHackathons = hackathonsData?.data || [];

  const [featuredEventIds, setFeaturedEventIds] = React.useState<string[]>([]);
  const [featuredHackathonIds, setFeaturedHackathonIds] = React.useState<string[]>([]);
  const [initialized, setInitialized] = React.useState(false);
  const [showAddEvent, setShowAddEvent] = React.useState(false);
  const [showAddHackathon, setShowAddHackathon] = React.useState(false);
  const [selectedEventId, setSelectedEventId] = React.useState("");
  const [selectedHackathonId, setSelectedHackathonId] = React.useState("");

  React.useEffect(() => {
    if (!initialized && allEvents.length > 0) {
      setFeaturedEventIds(allEvents.filter((e) => e.isFeatured).map((e) => e.id));
    }
    if (!initialized && allHackathons.length > 0) {
      setFeaturedHackathonIds(allHackathons.filter((h) => h.isFeatured).map((h) => h.id));
    }
    if (allEvents.length > 0 && allHackathons.length > 0) {
      setInitialized(true);
    }
  }, [allEvents, allHackathons, initialized]);

  if (eventsLoading || hackathonsLoading) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="shimmer rounded-xl h-96 w-full" />
      </motion.div>
    );
  }

  const featuredEvents = allEvents.filter((e) => featuredEventIds.includes(e.id));
  const nonFeaturedEvents = allEvents.filter((e) => !featuredEventIds.includes(e.id));
  const featuredHackathons = allHackathons.filter((h) => featuredHackathonIds.includes(h.id));
  const nonFeaturedHackathons = allHackathons.filter((h) => !featuredHackathonIds.includes(h.id));

  const removeEvent = async (id: string, title: string) => {
    setFeaturedEventIds((prev) => prev.filter((eid) => eid !== id));
    try {
      await setFeatured("event", id, false);
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success(`"${title}" removed from featured`);
    } catch (err) {
      // Revert on failure
      setFeaturedEventIds((prev) => [...prev, id]);
      toast.error(`Failed to unfeature event: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const removeHackathon = async (id: string, name: string) => {
    setFeaturedHackathonIds((prev) => prev.filter((hid) => hid !== id));
    try {
      await setFeatured("hackathon", id, false);
      queryClient.invalidateQueries({ queryKey: ["hackathons"] });
      toast.success(`"${name}" removed from featured`);
    } catch (err) {
      setFeaturedHackathonIds((prev) => [...prev, id]);
      toast.error(`Failed to unfeature hackathon: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const addEvent = async () => {
    if (!selectedEventId) return;
    const event = allEvents.find((e) => e.id === selectedEventId);
    const idToAdd = selectedEventId;
    setFeaturedEventIds((prev) => [...prev, idToAdd]);
    setSelectedEventId("");
    setShowAddEvent(false);
    try {
      await setFeatured("event", idToAdd, true);
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success(`"${event?.title}" added to featured`);
    } catch (err) {
      setFeaturedEventIds((prev) => prev.filter((eid) => eid !== idToAdd));
      toast.error(`Failed to feature event: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const addHackathon = async () => {
    if (!selectedHackathonId) return;
    const hack = allHackathons.find((h) => h.id === selectedHackathonId);
    const idToAdd = selectedHackathonId;
    setFeaturedHackathonIds((prev) => [...prev, idToAdd]);
    setSelectedHackathonId("");
    setShowAddHackathon(false);
    try {
      await setFeatured("hackathon", idToAdd, true);
      queryClient.invalidateQueries({ queryKey: ["hackathons"] });
      toast.success(`"${hack?.name}" added to featured`);
    } catch (err) {
      setFeaturedHackathonIds((prev) => prev.filter((hid) => hid !== idToAdd));
      toast.error(`Failed to feature hackathon: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* Featured Events */}
      <div className="mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Featured Events</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {featuredEvents.length}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setShowAddEvent(!showAddEvent)}
            >
              <Plus className="h-4 w-4" />
              Add to Featured
            </Button>
          </CardHeader>
          <CardContent>
            {/* Add Event Panel */}
            {showAddEvent && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mb-4 p-4 rounded-xl border border-border bg-muted/30"
              >
                <p className="text-sm font-medium mb-2">Select an event to feature:</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="flex-1 h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Choose an event...</option>
                    {nonFeaturedEvents.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" onClick={addEvent} disabled={!selectedEventId}>
                    Add
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddEvent(false)}>
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Featured Events List */}
            {featuredEvents.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No featured events. Click &quot;Add to Featured&quot; to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {featuredEvents.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors group"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab flex-shrink-0" />
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.organizer.name} &middot; {formatDate(event.startDate)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize hidden sm:inline-flex">
                      {event.category}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-red-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeEvent(event.id, event.title)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Featured Hackathons */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Featured Hackathons</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {featuredHackathons.length}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setShowAddHackathon(!showAddHackathon)}
          >
            <Plus className="h-4 w-4" />
            Add to Featured
          </Button>
        </CardHeader>
        <CardContent>
          {/* Add Hackathon Panel */}
          {showAddHackathon && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-4 p-4 rounded-xl border border-border bg-muted/30"
            >
              <p className="text-sm font-medium mb-2">Select a hackathon to feature:</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedHackathonId}
                  onChange={(e) => setSelectedHackathonId(e.target.value)}
                  className="flex-1 h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Choose a hackathon...</option>
                  {nonFeaturedHackathons.map((hack) => (
                    <option key={hack.id} value={hack.id}>
                      {hack.name}
                    </option>
                  ))}
                </select>
                <Button size="sm" onClick={addHackathon} disabled={!selectedHackathonId}>
                  Add
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAddHackathon(false)}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}

          {/* Featured Hackathons List */}
          {featuredHackathons.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No featured hackathons. Click &quot;Add to Featured&quot; to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {featuredHackathons.map((hack, i) => (
                <motion.div
                  key={hack.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors group"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab flex-shrink-0" />
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{hack.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {hack.organizer.name} &middot; {hack.participantCount} participants
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-xs capitalize whitespace-nowrap hidden sm:inline-flex"
                  >
                    {hack.status.replace("-", " ")}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-red-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeHackathon(hack.id, hack.name)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
