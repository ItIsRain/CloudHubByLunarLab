"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DoorOpen,
  Users,
  Clock,
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  GripVertical,
  Loader2,
  Search,
  UserPlus,
  SkipForward,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  usePitchRooms,
  useCreatePitchRoom,
  useUpdatePitchRoom,
  useDeletePitchRoom,
  type PitchRoom,
  type PitchRoomJudge,
  type PitchRoomSlot,
} from "@/hooks/use-pitch-rooms";
import { usePhaseReviewers } from "@/hooks/use-phases";
import { useHackathonParticipants } from "@/hooks/use-hackathon-participants";
import type { PhaseReviewer, HackathonParticipant } from "@/lib/types";

// ── Props ────────────────────────────────────────────────

interface PitchRoomsSectionProps {
  hackathonId: string;
  phaseId: string;
}

// ── Status helpers ───────────────────────────────────────

const roomStatusVariant: Record<string, "muted" | "success" | "warning"> = {
  pending: "muted",
  in_progress: "warning",
  completed: "success",
};

const slotStatusVariant: Record<string, "muted" | "success" | "warning" | "secondary"> = {
  pending: "muted",
  in_progress: "warning",
  completed: "success",
  skipped: "secondary",
};

// ═════════════════════════════════════════════════════════
// PitchRoomsSection (main export)
// ═════════════════════════════════════════════════════════

export function PitchRoomsSection({ hackathonId, phaseId }: PitchRoomsSectionProps) {
  const { data: roomsData, isLoading } = usePitchRooms(hackathonId, phaseId);
  const rooms: PitchRoom[] = roomsData?.data ?? [];

  const [addDialogOpen, setAddDialogOpen] = React.useState(false);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <DoorOpen className="h-4 w-4 text-primary" />
        <h4 className="font-display font-semibold text-base">Pitch Rooms</h4>
        <Badge variant="muted">{rooms.length} room{rooms.length !== 1 ? "s" : ""}</Badge>
        <Button size="sm" className="ml-auto" onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Room
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && rooms.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <DoorOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-display text-base font-semibold mb-1">No pitch rooms configured</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              Create rooms to organize parallel jury sessions.
            </p>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Room
            </Button>
          </Card>
        </motion.div>
      )}

      {/* Room list */}
      <AnimatePresence mode="popLayout">
        {rooms.map((room, idx) => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ delay: idx * 0.04 }}
          >
            <RoomCard hackathonId={hackathonId} phaseId={phaseId} room={room} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add Room Dialog */}
      <AddRoomDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        hackathonId={hackathonId}
        phaseId={phaseId}
      />
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// RoomCard
// ═════════════════════════════════════════════════════════

interface RoomCardProps {
  hackathonId: string;
  phaseId: string;
  room: PitchRoom;
}

function RoomCard({ hackathonId, phaseId, room }: RoomCardProps) {
  const updateRoom = useUpdatePitchRoom(hackathonId, phaseId);
  const deleteRoom = useDeletePitchRoom(hackathonId, phaseId);

  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [judgeDialogOpen, setJudgeDialogOpen] = React.useState(false);
  const [slotDialogOpen, setSlotDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await deleteRoom.mutateAsync(room.id);
      toast.success(`Room "${room.name}" deleted.`);
    } catch {
      toast.error("Failed to delete room.");
    } finally {
      setConfirmDelete(false);
    }
  };

  const handleStatusChange = async (status: "in_progress" | "completed") => {
    try {
      await updateRoom.mutateAsync({ action: "update_room", roomId: room.id, status });
      toast.success(`Room status changed to "${status.replace("_", " ")}".`);
    } catch {
      toast.error("Failed to update room status.");
    }
  };

  const handleRemoveJudge = async (reviewerId: string) => {
    try {
      await updateRoom.mutateAsync({ action: "remove_judge", roomId: room.id, reviewerId });
      toast.success("Judge removed.");
    } catch {
      toast.error("Failed to remove judge.");
    }
  };

  const handleRemoveSlot = async (registrationId: string) => {
    try {
      await updateRoom.mutateAsync({ action: "remove_slot", roomId: room.id, registrationId });
      toast.success("Slot removed.");
    } catch {
      toast.error("Failed to remove slot.");
    }
  };

  const handleSlotStatus = async (registrationId: string, status: "pending" | "in_progress" | "completed" | "skipped") => {
    try {
      await updateRoom.mutateAsync({ action: "update_slot_status", roomId: room.id, registrationId, status });
    } catch {
      toast.error("Failed to update slot status.");
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-4 space-y-4">
        {/* Room header */}
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <DoorOpen className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h5 className="font-display font-semibold text-sm truncate">{room.name}</h5>
              <Badge variant={roomStatusVariant[room.status] ?? "muted"} dot pulse={room.status === "in_progress"}>
                {room.status.replace("_", " ")}
              </Badge>
            </div>
            {room.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{room.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {room.status === "pending" && (
              <Button size="sm" variant="outline" onClick={() => handleStatusChange("in_progress")} disabled={updateRoom.isPending}>
                <Play className="h-3.5 w-3.5 mr-1.5" />
                Start
              </Button>
            )}
            {room.status === "in_progress" && (
              <Button size="sm" variant="outline" onClick={() => handleStatusChange("completed")} disabled={updateRoom.isPending}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Complete
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setEditDialogOpen(true)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant={confirmDelete ? "destructive" : "outline"}
              className={cn(!confirmDelete && "text-destructive hover:text-destructive")}
              onClick={handleDelete}
              onBlur={() => setConfirmDelete(false)}
              disabled={deleteRoom.isPending}
            >
              {confirmDelete ? "Confirm?" : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Judges section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Judges ({room.judges.length})
            </span>
            <Button size="sm" variant="ghost" className="h-6 px-2 ml-auto" onClick={() => setJudgeDialogOpen(true)}>
              <UserPlus className="h-3 w-3 mr-1" />
              <span className="text-xs">Add</span>
            </Button>
          </div>
          {room.judges.length === 0 ? (
            <p className="text-xs text-muted-foreground/70 italic pl-5">No judges assigned</p>
          ) : (
            <div className="flex flex-wrap gap-2 pl-5">
              {room.judges.map((judge) => (
                <JudgePill key={judge.id} judge={judge} onRemove={() => handleRemoveJudge(judge.reviewer_id)} />
              ))}
            </div>
          )}
        </div>

        {/* Slots section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Slots ({room.slots.length})
            </span>
            <Button size="sm" variant="ghost" className="h-6 px-2 ml-auto" onClick={() => setSlotDialogOpen(true)}>
              <Plus className="h-3 w-3 mr-1" />
              <span className="text-xs">Add</span>
            </Button>
          </div>
          {room.slots.length === 0 ? (
            <p className="text-xs text-muted-foreground/70 italic pl-5">No slots assigned</p>
          ) : (
            <div className="space-y-1.5 pl-5">
              {room.slots.map((slot) => (
                <SlotRow
                  key={slot.id}
                  slot={slot}
                  onRemove={() => handleRemoveSlot(slot.registration_id)}
                  onStatusChange={(s) => handleSlotStatus(slot.registration_id, s)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <AssignJudgeDialog
        open={judgeDialogOpen}
        onOpenChange={setJudgeDialogOpen}
        hackathonId={hackathonId}
        phaseId={phaseId}
        room={room}
      />
      <AssignSlotDialog
        open={slotDialogOpen}
        onOpenChange={setSlotDialogOpen}
        hackathonId={hackathonId}
        phaseId={phaseId}
        room={room}
      />
      <EditRoomDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        hackathonId={hackathonId}
        phaseId={phaseId}
        room={room}
      />
    </Card>
  );
}

// ═════════════════════════════════════════════════════════
// JudgePill
// ═════════════════════════════════════════════════════════

function JudgePill({ judge, onRemove }: { judge: PitchRoomJudge; onRemove: () => void }) {
  const name = judge.reviewer?.name ?? judge.reviewer?.email ?? "Unknown";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-2.5 py-1 text-xs">
      <span className="truncate max-w-[120px]">{name}</span>
      <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// ═════════════════════════════════════════════════════════
// SlotRow
// ═════════════════════════════════════════════════════════

function SlotRow({
  slot,
  onRemove,
  onStatusChange,
}: {
  slot: PitchRoomSlot;
  onRemove: () => void;
  onStatusChange: (status: "pending" | "in_progress" | "completed" | "skipped") => void;
}) {
  const applicantName = slot.registration?.applicant?.name ?? slot.registration?.applicant?.email ?? "Unknown";
  const time = slot.scheduled_time
    ? new Date(slot.scheduled_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card p-2 text-xs">
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
      <span className="font-mono text-muted-foreground w-5 text-center">{slot.slot_order + 1}</span>
      <span className="truncate flex-1 font-medium">{applicantName}</span>
      {time && (
        <span className="text-muted-foreground flex items-center gap-1 shrink-0">
          <Clock className="h-3 w-3" />
          {time}
        </span>
      )}
      <span className="text-muted-foreground shrink-0">{slot.duration_minutes}m</span>
      <Badge variant={slotStatusVariant[slot.status] ?? "muted"} className="text-[10px] shrink-0">
        {slot.status.replace("_", " ")}
      </Badge>
      {/* Quick status actions */}
      {slot.status === "pending" && (
        <button type="button" onClick={() => onStatusChange("in_progress")} className="text-muted-foreground hover:text-primary transition-colors" title="Start">
          <Play className="h-3 w-3" />
        </button>
      )}
      {slot.status === "in_progress" && (
        <>
          <button type="button" onClick={() => onStatusChange("completed")} className="text-muted-foreground hover:text-emerald-500 transition-colors" title="Complete">
            <CheckCircle2 className="h-3 w-3" />
          </button>
          <button type="button" onClick={() => onStatusChange("skipped")} className="text-muted-foreground hover:text-amber-500 transition-colors" title="Skip">
            <SkipForward className="h-3 w-3" />
          </button>
        </>
      )}
      <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors" title="Remove">
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// AddRoomDialog
// ═════════════════════════════════════════════════════════

function AddRoomDialog({
  open,
  onOpenChange,
  hackathonId,
  phaseId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hackathonId: string;
  phaseId: string;
}) {
  const createRoom = useCreatePitchRoom(hackathonId, phaseId);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");

  React.useEffect(() => {
    if (open) { setName(""); setDescription(""); }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Room name is required."); return; }
    try {
      await createRoom.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
      toast.success(`Room "${name.trim()}" created.`);
      onOpenChange(false);
    } catch {
      toast.error("Failed to create room.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Pitch Room</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Name <span className="text-destructive">*</span></label>
            <Input placeholder="e.g. Room A" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <Input placeholder="Optional description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createRoom.isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createRoom.isPending}>
            {createRoom.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create Room
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════
// EditRoomDialog
// ═════════════════════════════════════════════════════════

function EditRoomDialog({
  open,
  onOpenChange,
  hackathonId,
  phaseId,
  room,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hackathonId: string;
  phaseId: string;
  room: PitchRoom;
}) {
  const updateRoom = useUpdatePitchRoom(hackathonId, phaseId);
  const [name, setName] = React.useState(room.name);
  const [description, setDescription] = React.useState(room.description ?? "");

  React.useEffect(() => {
    if (open) { setName(room.name); setDescription(room.description ?? ""); }
  }, [open, room.name, room.description]);

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Room name is required."); return; }
    try {
      await updateRoom.mutateAsync({
        action: "update_room",
        roomId: room.id,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success("Room updated.");
      onOpenChange(false);
    } catch {
      toast.error("Failed to update room.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Room</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Name <span className="text-destructive">*</span></label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateRoom.isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={updateRoom.isPending}>
            {updateRoom.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════
// AssignJudgeDialog
// ═════════════════════════════════════════════════════════

function AssignJudgeDialog({
  open,
  onOpenChange,
  hackathonId,
  phaseId,
  room,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hackathonId: string;
  phaseId: string;
  room: PitchRoom;
}) {
  const { data: reviewersData } = usePhaseReviewers(hackathonId, phaseId);
  const updateRoom = useUpdatePitchRoom(hackathonId, phaseId);
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (open) { setSearch(""); setSelected([]); }
  }, [open]);

  const reviewers: PhaseReviewer[] = reviewersData?.data ?? [];
  const assignedIds = new Set(room.judges.map((j) => j.reviewer_id));

  const filtered = reviewers.filter((r) => {
    if (assignedIds.has(r.userId)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
  });

  const toggleSelected = (userId: string) => {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAssign = async () => {
    if (selected.length === 0) { toast.error("Select at least one judge."); return; }
    try {
      await updateRoom.mutateAsync({ action: "assign_judges", roomId: room.id, reviewerIds: selected });
      toast.success(`${selected.length} judge${selected.length !== 1 ? "s" : ""} assigned.`);
      onOpenChange(false);
    } catch {
      toast.error("Failed to assign judges.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Judges to {room.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search reviewers..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="h-[240px] overflow-y-auto rounded-lg border border-border/50 p-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {reviewers.length === 0 ? "No phase reviewers available." : "No matching reviewers."}
              </p>
            ) : (
              <div className="space-y-1">
                {filtered.map((r) => {
                  const isSelected = selected.includes(r.userId);
                  return (
                    <button
                      key={r.userId}
                      type="button"
                      onClick={() => toggleSelected(r.userId)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-left transition-colors",
                        isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                      )}
                    >
                      <div className={cn(
                        "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                        isSelected ? "border-primary bg-primary" : "border-input"
                      )}>
                        {isSelected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{r.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                      </div>
                      <Badge variant={r.status === "accepted" ? "success" : "warning"} className="text-[10px] shrink-0">
                        {r.status}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={selected.length === 0 || updateRoom.isPending}>
            {updateRoom.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Assign {selected.length > 0 ? `(${selected.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════
// AssignSlotDialog
// ═════════════════════════════════════════════════════════

function AssignSlotDialog({
  open,
  onOpenChange,
  hackathonId,
  phaseId,
  room,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hackathonId: string;
  phaseId: string;
  room: PitchRoom;
}) {
  const { data: participantsData } = useHackathonParticipants(hackathonId);
  const updateRoom = useUpdatePitchRoom(hackathonId, phaseId);
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (open) { setSearch(""); setSelected([]); }
  }, [open]);

  const participants: HackathonParticipant[] = participantsData?.data ?? [];
  const assignedRegIds = new Set(room.slots.map((s) => s.registration_id));

  const filtered = participants.filter((p) => {
    if (assignedRegIds.has(p.id)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = p.user?.name ?? "";
    const email = p.user?.email ?? "";
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  });

  const toggleSelected = (regId: string) => {
    setSelected((prev) =>
      prev.includes(regId) ? prev.filter((id) => id !== regId) : [...prev, regId]
    );
  };

  const handleAssign = async () => {
    if (selected.length === 0) { toast.error("Select at least one applicant."); return; }
    const startOrder = room.slots.length;
    const slots = selected.map((registrationId, idx) => ({
      registrationId,
      slotOrder: startOrder + idx,
      durationMinutes: 10,
    }));
    try {
      await updateRoom.mutateAsync({ action: "assign_slots", roomId: room.id, slots });
      toast.success(`${selected.length} slot${selected.length !== 1 ? "s" : ""} assigned.`);
      onOpenChange(false);
    } catch {
      toast.error("Failed to assign slots.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Slots to {room.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search applicants..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="h-[240px] overflow-y-auto rounded-lg border border-border/50 p-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {participants.length === 0 ? "No participants found." : "No matching applicants."}
              </p>
            ) : (
              <div className="space-y-1">
                {filtered.map((p) => {
                  const isSelected = selected.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleSelected(p.id)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-left transition-colors",
                        isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                      )}
                    >
                      <div className={cn(
                        "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                        isSelected ? "border-primary bg-primary" : "border-input"
                      )}>
                        {isSelected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{p.user?.name ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.user?.email ?? ""}</p>
                      </div>
                      <Badge variant="muted" className="text-[10px] shrink-0">{p.status}</Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={selected.length === 0 || updateRoom.isPending}>
            {updateRoom.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Assign {selected.length > 0 ? `(${selected.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
