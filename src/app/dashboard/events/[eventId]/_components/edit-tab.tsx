"use client";

import * as React from "react";
import DOMPurify from "dompurify";
import { motion } from "framer-motion";
import {
  Save,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading2,
  Undo2,
  Redo2,
  Link2,
  Strikethrough,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TagSelector } from "@/components/forms/tag-selector";
import { DateTimePicker } from "@/components/forms/date-time-picker";
import { LocationPicker } from "@/components/forms/location-picker";
import type { Event, EventType } from "@/lib/types";
import { useUpdateEvent } from "@/hooks/use-events";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EditTabProps {
  event: Event;
  eventId: string;
}

const eventCategories = [
  "tech",
  "ai-ml",
  "web3",
  "design",
  "business",
  "health",
  "music",
  "social",
  "workshop",
  "conference",
  "meetup",
  "networking",
] as const;

const selectClasses =
  "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50";

// ── Rich Text Editor ────────────────────────────────────────────────

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

function RichTextEditor({
  value,
  onChange,
  placeholder = "Start typing...",
  minHeight = "160px",
}: RichTextEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const isInternalUpdate = React.useRef(false);

  React.useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = DOMPurify.sanitize(value);
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalUpdate.current = true;
      onChange(editorRef.current.innerHTML);
    }
  };

  const exec = (command: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    handleInput();
  };

  const toolbarButtons = [
    { icon: Bold, command: "bold", label: "Bold" },
    { icon: Italic, command: "italic", label: "Italic" },
    { icon: Underline, command: "underline", label: "Underline" },
    { icon: Strikethrough, command: "strikeThrough", label: "Strikethrough" },
    { divider: true },
    { icon: Heading2, command: "formatBlock", value: "H3", label: "Heading" },
    { icon: List, command: "insertUnorderedList", label: "Bullet list" },
    { icon: ListOrdered, command: "insertOrderedList", label: "Numbered list" },
    { divider: true },
    { icon: Link2, command: "createLink", label: "Link", prompt: true },
    { divider: true },
    { icon: Undo2, command: "undo", label: "Undo" },
    { icon: Redo2, command: "redo", label: "Redo" },
  ] as const;

  return (
    <div className="rounded-xl border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:border-primary transition-all duration-200">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b bg-muted/30">
        {toolbarButtons.map((btn, i) => {
          if ("divider" in btn && btn.divider) {
            return (
              <div key={`div-${i}`} className="w-px h-5 bg-border mx-1" />
            );
          }

          const b = btn as {
            icon: React.ComponentType<{ className?: string }>;
            command: string;
            value?: string;
            label: string;
            prompt?: boolean;
          };

          return (
            <button
              key={b.command + (b.value || "")}
              type="button"
              title={b.label}
              onMouseDown={(e) => {
                e.preventDefault();
                if (b.prompt) {
                  const url = window.prompt("Enter URL:");
                  if (url && /^https?:\/\/.+/i.test(url)) exec(b.command, url);
                } else {
                  exec(b.command, b.value);
                }
              }}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <b.icon className="h-3.5 w-3.5" />
            </button>
          );
        })}
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        className={cn(
          "px-4 py-3 text-sm outline-none",
          "prose prose-sm dark:prose-invert max-w-none",
          "[&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:my-1",
          "[&_p:empty]:hidden",
          "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none"
        )}
        style={{ minHeight }}
      />
    </div>
  );
}

// ── Main EditTab ────────────────────────────────────────────────────

export function EditTab({ event, eventId }: EditTabProps) {
  const updateEvent = useUpdateEvent();

  const [formData, setFormData] = React.useState({
    title: "",
    description: "",
    category: "tech",
    type: "in-person" as EventType,
    tags: [] as string[],
    startDate: "",
    endDate: "",
    address: "",
    city: "",
    country: "",
    platform: "",
    meetingUrl: "",
  });

  React.useEffect(() => {
    if (!event) return;
    setFormData({
      title: event.title || "",
      description: event.description || "",
      category: event.category || "tech",
      type: event.type || "in-person",
      tags: event.tags || [],
      startDate: event.startDate || "",
      endDate: event.endDate || "",
      address: event.location?.address || "",
      city: event.location?.city || "",
      country: event.location?.country || "",
      platform: event.location?.platform || "",
      meetingUrl: event.location?.meetingUrl || "",
    });
  }, [event]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "number") {
      setFormData((prev) => ({ ...prev, [name]: Number(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Event title is required");
      return;
    }

    try {
      // Map to snake_case DB column names
      await updateEvent.mutateAsync({
        id: eventId,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        type: formData.type,
        tags: formData.tags,
        start_date: formData.startDate || null,
        end_date: formData.endDate || null,
        location: {
          type: formData.type,
          address: formData.address || undefined,
          city: formData.city || undefined,
          country: formData.country || undefined,
          platform: formData.platform || undefined,
          meetingUrl: formData.meetingUrl || undefined,
        },
      });
      toast.success("Event updated successfully!");
    } catch {
      toast.error("Failed to update event.");
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="font-display text-2xl font-bold">Edit Event</h2>
        <p className="text-sm text-muted-foreground">
          Update the details of &ldquo;{event.title}&rdquo;
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <form onSubmit={handleSave}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Event Title
                </label>
                <Input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter event title"
                />
              </div>

              {/* Description — Rich Text Editor */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(html) =>
                    setFormData((prev) => ({ ...prev, description: html }))
                  }
                  placeholder="Describe your event..."
                  minHeight="180px"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={selectClasses}
                >
                  {eventCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat
                        .replace("-", " / ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-2">Tags</label>
                <TagSelector
                  value={formData.tags}
                  onChange={(tags) =>
                    setFormData((prev) => ({ ...prev, tags }))
                  }
                />
              </div>

              {/* Dates row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Start Date & Time
                  </label>
                  <DateTimePicker
                    value={formData.startDate}
                    onChange={(val) =>
                      setFormData((prev) => ({ ...prev, startDate: val }))
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    End Date & Time
                  </label>
                  <DateTimePicker
                    value={formData.endDate}
                    onChange={(val) =>
                      setFormData((prev) => ({ ...prev, endDate: val }))
                    }
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Location
                </label>
                <LocationPicker
                  value={{
                    type: formData.type,
                    address: formData.address,
                    city: formData.city,
                    country: formData.country,
                    platform: formData.platform,
                    meetingUrl: formData.meetingUrl,
                  }}
                  onChange={(data) => {
                    setFormData((prev) => ({
                      ...prev,
                      type: data.type,
                      address: data.address || "",
                      city: data.city || "",
                      country: data.country || "",
                      platform: data.platform || "",
                      meetingUrl: data.meetingUrl || "",
                    }));
                  }}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4 border-t">
                <Button type="submit" disabled={updateEvent.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateEvent.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </motion.div>
    </div>
  );
}
