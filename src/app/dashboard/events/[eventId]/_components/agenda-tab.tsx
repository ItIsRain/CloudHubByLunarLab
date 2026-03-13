"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SortableList } from "@/components/ui/sortable-list";
import { cn, formatDate } from "@/lib/utils";
import type { Event, AgendaSession } from "@/lib/types";
import { useUpdateEvent } from "@/hooks/use-events";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const AddSessionDialog = dynamic(
  () =>
    import("@/components/dialogs/add-session-dialog").then(
      (m) => m.AddSessionDialog
    ),
  { ssr: false }
);

interface AgendaTabProps {
  event: Event;
  eventId: string;
}

// ── Session type badge colors ──────────────────────────────────────

const sessionTypeBadge: Record<
  string,
  "gradient" | "warning" | "muted" | "secondary" | "success" | "destructive"
> = {
  keynote: "gradient",
  talk: "secondary",
  workshop: "warning",
  panel: "success",
  networking: "muted",
  break: "muted",
};

// ── Session Card ───────────────────────────────────────────────────

interface SessionCardProps {
  session: AgendaSession;
  dragHandle: React.ReactNode;
  onRemove: (id: string) => void;
  isPending: boolean;
}

function SessionCard({
  session,
  dragHandle,
  onRemove,
  isPending,
}: SessionCardProps) {
  return (
    <Card className="group hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {dragHandle}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-medium truncate">{session.title}</h3>
              <Badge
                variant={sessionTypeBadge[session.type] ?? "muted"}
                className="text-[10px] px-1.5 py-0 shrink-0"
              >
                {session.type}
              </Badge>
            </div>
            {session.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {session.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {session.startTime && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(session.startTime)}
                  {session.endTime && ` - ${formatDate(session.endTime)}`}
                </span>
              )}
              {session.room && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {session.room}
                </span>
              )}
              {session.speakers.length > 0 && (
                <span>
                  {session.speakers.map((s) => s.name).join(", ")}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={() => onRemove(session.id)}
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main AgendaTab ─────────────────────────────────────────────────

export function AgendaTab({ event, eventId }: AgendaTabProps) {
  const updateEvent = useUpdateEvent();
  const [showSessionDialog, setShowSessionDialog] = React.useState(false);

  const sessions: AgendaSession[] = event.agenda ?? [];

  const handleAddSession = async (session: AgendaSession) => {
    const updatedAgenda = [...sessions, session];
    try {
      await updateEvent.mutateAsync({
        id: eventId,
        agenda: updatedAgenda,
      });
      toast.success(`Session "${session.title}" added!`);
    } catch {
      toast.error("Failed to add session.");
    }
  };

  const handleRemoveSession = async (sessionId: string) => {
    const updatedAgenda = sessions.filter((s) => s.id !== sessionId);
    try {
      await updateEvent.mutateAsync({
        id: eventId,
        agenda: updatedAgenda,
      });
      toast.success("Session removed.");
    } catch {
      toast.error("Failed to remove session.");
    }
  };

  const handleReorderSessions = async (reordered: AgendaSession[]) => {
    try {
      await updateEvent.mutateAsync({
        id: eventId,
        agenda: reordered,
      });
      toast.success("Agenda order updated.");
    } catch {
      toast.error("Failed to reorder sessions.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="font-display text-2xl font-bold">Agenda</h2>
          <p className="text-sm text-muted-foreground">
            Manage event sessions and schedule
          </p>
        </div>
        <Button
          variant="gradient"
          onClick={() => setShowSessionDialog(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Session
        </Button>
      </motion.div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">
                  {sessions.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total Session{sessions.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Session List — sortable */}
      {sessions.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          {sessions.length > 1 && (
            <p className="text-xs text-muted-foreground/60">
              Drag to reorder sessions
            </p>
          )}
          <SortableList
            items={sessions}
            onReorder={handleReorderSessions}
            disabled={updateEvent.isPending}
            renderItem={(session, dragHandle) => (
              <SessionCard
                session={session}
                dragHandle={dragHandle}
                onRemove={handleRemoveSession}
                isPending={updateEvent.isPending}
              />
            )}
            renderOverlay={(session) => (
              <SessionCard
                session={session}
                dragHandle={
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground shrink-0">
                    <GripVertical className="h-4 w-4" />
                  </div>
                }
                onRemove={() => {}}
                isPending={false}
              />
            )}
          />
        </motion.div>
      ) : (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Calendar className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-display text-lg font-bold mb-1">
                No Sessions Yet
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Add sessions to build your event agenda. Drag to reorder them.
              </p>
              <Button
                variant="gradient"
                onClick={() => setShowSessionDialog(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add First Session
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Add Session Dialog */}
      <AddSessionDialog
        open={showSessionDialog}
        onOpenChange={setShowSessionDialog}
        onAdd={handleAddSession}
        speakers={event.speakers ?? []}
      />
    </div>
  );
}
