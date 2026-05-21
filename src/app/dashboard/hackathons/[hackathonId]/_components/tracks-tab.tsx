"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Layers,
  Trophy,
  Brain,
  Link as LinkIcon,
  Wrench,
  Heart,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TagSelector } from "@/components/forms/tag-selector";
import { useUpdateHackathon } from "@/hooks/use-hackathons";
import { generateId } from "@/lib/utils";
import { toast } from "sonner";
import type { Hackathon, Track } from "@/lib/types";

interface TracksTabProps {
  hackathon: Hackathon;
  hackathonId: string;
}

// Icon keys recognized by the public /hackathons/[id]/tracks page.
// Keep this in sync with `trackIcons` in src/app/hackathons/[id]/tracks/page-client.tsx.
const iconOptions: { value: string; label: string; Icon: React.ElementType }[] = [
  { value: "", label: "Default (Trophy)", Icon: Trophy },
  { value: "brain", label: "Brain", Icon: Brain },
  { value: "link", label: "Link", Icon: LinkIcon },
  { value: "wrench", label: "Wrench", Icon: Wrench },
  { value: "heart", label: "Heart", Icon: Heart },
];

const iconMap: Record<string, React.ElementType> = {
  brain: Brain,
  link: LinkIcon,
  wrench: Wrench,
  heart: Heart,
};

function getTrackIcon(key: string | undefined): React.ElementType {
  if (!key) return Trophy;
  return iconMap[key] || Trophy;
}

const textareaClasses =
  "flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[80px]";

// ── Track Dialog (Add + Edit) ──────────────────────────────────────

interface TrackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTrack: Track | null;
  onSubmit: (track: Track) => Promise<void>;
  isSaving: boolean;
}

function TrackDialog({
  open,
  onOpenChange,
  initialTrack,
  onSubmit,
  isSaving,
}: TrackDialogProps) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [icon, setIcon] = React.useState("");
  const [requirements, setRequirements] = React.useState<string[]>([]);
  const [suggestedTech, setSuggestedTech] = React.useState<string[]>([]);

  // Reset form whenever the dialog opens with a different track.
  React.useEffect(() => {
    if (!open) return;
    setName(initialTrack?.name ?? "");
    setDescription(initialTrack?.description ?? "");
    setIcon(initialTrack?.icon ?? "");
    setRequirements(initialTrack?.requirements ?? []);
    setSuggestedTech(initialTrack?.suggestedTech ?? []);
  }, [open, initialTrack]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (trimmedName.length < 2) {
      toast.error("Track name must be at least 2 characters.");
      return;
    }
    if (trimmedDescription.length < 10) {
      toast.error("Description must be at least 10 characters.");
      return;
    }

    await onSubmit({
      id: initialTrack?.id ?? generateId(),
      name: trimmedName,
      description: trimmedDescription,
      icon: icon || undefined,
      sponsor: initialTrack?.sponsor,
      prizes: initialTrack?.prizes ?? [],
      requirements,
      suggestedTech,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialTrack ? "Edit Track" : "Add Track"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Track Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AI/ML Innovation"
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this track is about..."
              rows={3}
              maxLength={2000}
              className={textareaClasses}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Icon</label>
            <div className="grid grid-cols-5 gap-2">
              {iconOptions.map((opt) => {
                const isActive = (icon || "") === opt.value;
                return (
                  <button
                    key={opt.value || "default"}
                    type="button"
                    onClick={() => setIcon(opt.value)}
                    title={opt.label}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${
                      isActive
                        ? "border-primary bg-primary/5"
                        : "border-input hover:border-primary/30 hover:bg-muted/40"
                    }`}
                  >
                    <opt.Icon className="h-5 w-5" />
                    <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Requirements</label>
            <TagSelector
              value={requirements}
              onChange={setRequirements}
              suggestions={[
                "Must use ML model",
                "Must deploy live",
                "Open source required",
                "Must include demo video",
              ]}
              placeholder="Add requirement..."
              maxTags={5}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Suggested Technologies</label>
            <TagSelector
              value={suggestedTech}
              onChange={setSuggestedTech}
              placeholder="Add technology..."
              maxTags={8}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : initialTrack ? "Save Changes" : "Add Track"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Tab ───────────────────────────────────────────────────────

export function TracksTab({ hackathon, hackathonId }: TracksTabProps) {
  const updateHackathon = useUpdateHackathon();
  const tracks: Track[] = hackathon.tracks ?? [];

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingTrack, setEditingTrack] = React.useState<Track | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);

  const persistTracks = async (next: Track[], successMessage: string) => {
    try {
      await updateHackathon.mutateAsync({
        id: hackathonId,
        tracks: next,
      });
      toast.success(successMessage);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save tracks."
      );
      throw err;
    }
  };

  const handleSubmit = async (track: Track) => {
    const exists = tracks.some((t) => t.id === track.id);
    const next = exists
      ? tracks.map((t) => (t.id === track.id ? track : t))
      : [...tracks, track];
    try {
      await persistTracks(next, exists ? "Track updated." : "Track added.");
      setDialogOpen(false);
      setEditingTrack(null);
    } catch {
      /* error already toasted */
    }
  };

  const handleDelete = async (id: string) => {
    const next = tracks.filter((t) => t.id !== id);
    try {
      await persistTracks(next, "Track removed.");
      setPendingDeleteId(null);
    } catch {
      /* error already toasted */
    }
  };

  const openAdd = () => {
    setEditingTrack(null);
    setDialogOpen(true);
  };

  const openEdit = (track: Track) => {
    setEditingTrack(track);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Tracks
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Define the thematic tracks shown on the public hackathon page.
            </p>
          </div>
          <Button onClick={openAdd} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Track
          </Button>
        </CardHeader>
        <CardContent>
          {tracks.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">No tracks yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Add tracks for participants to choose from on the public page.
              </p>
              <Button variant="outline" size="sm" onClick={openAdd} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add your first track
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {tracks.map((track) => {
                  const Icon = getTrackIcon(track.icon);
                  const isPendingDelete = pendingDeleteId === track.id;

                  return (
                    <motion.div
                      key={track.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      className="rounded-xl border border-border p-4 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <p className="font-semibold">{track.name}</p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {track.description}
                            </p>
                          </div>

                          {(track.requirements?.length ?? 0) > 0 && (
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Requirements
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {track.requirements!.map((r) => (
                                  <Badge key={r} variant="outline" className="text-xs">
                                    {r}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {(track.suggestedTech?.length ?? 0) > 0 && (
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Suggested Tech
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {track.suggestedTech!.map((tech) => (
                                  <Badge key={tech} variant="muted" className="text-xs">
                                    {tech}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(track)}
                            disabled={updateHackathon.isPending}
                            aria-label={`Edit ${track.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isPendingDelete ? (
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(track.id)}
                                disabled={updateHackathon.isPending}
                              >
                                Confirm
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setPendingDeleteId(null)}
                                disabled={updateHackathon.isPending}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setPendingDeleteId(track.id)}
                              disabled={updateHackathon.isPending}
                              aria-label={`Delete ${track.name}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      <TrackDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTrack(null);
        }}
        initialTrack={editingTrack}
        onSubmit={handleSubmit}
        isSaving={updateHackathon.isPending}
      />
    </div>
  );
}
