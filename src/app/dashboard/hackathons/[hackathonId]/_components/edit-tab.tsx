"use client";

import * as React from "react";
import DOMPurify from "dompurify";
import { motion } from "framer-motion";
import {
  Save,
  Plus,
  Trash2,
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
import { useUpdateHackathon } from "@/hooks/use-hackathons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Hackathon } from "@/lib/types";

interface EditTabProps {
  hackathon: Hackathon;
  hackathonId: string;
}

const hackathonStatuses = [
  { value: "draft", label: "Draft" },
  { value: "registration-open", label: "Registration Open" },
  { value: "registration-closed", label: "Registration Closed" },
  { value: "hacking", label: "Hacking" },
  { value: "submission", label: "Submission" },
  { value: "judging", label: "Judging" },
  { value: "completed", label: "Completed" },
];

const categoryOptions = [
  { value: "tech", label: "Technology" },
  { value: "ai-ml", label: "AI / Machine Learning" },
  { value: "web3", label: "Web3 / Blockchain" },
  { value: "design", label: "Design" },
  { value: "business", label: "Business" },
  { value: "health", label: "Health" },
  { value: "music", label: "Music" },
  { value: "social", label: "Social" },
];

const typeOptions = [
  { value: "online", label: "Online" },
  { value: "in-person", label: "In-Person" },
  { value: "hybrid", label: "Hybrid" },
];

function toDateTimeInputValue(isoString: string) {
  if (!isoString) return "";
  // datetime-local needs "YYYY-MM-DDTHH:MM"
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const selectClasses =
  "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 appearance-none";

// ── Rich Text Editor ────────────────────────────────────────────────
// A lightweight contentEditable-based editor with formatting toolbar.

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

  // Sync external value → editor only on mount or when value changes externally
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
    {
      icon: ListOrdered,
      command: "insertOrderedList",
      label: "Numbered list",
    },
    { divider: true },
    { icon: Link2, command: "createLink", label: "Link", prompt: true },
    { divider: true },
    { icon: Undo2, command: "undo", label: "Undo" },
    { icon: Redo2, command: "redo", label: "Redo" },
  ] as const;

  return (
    <div className="rounded-xl border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:border-primary transition-all duration-200">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b bg-muted/30">
        {toolbarButtons.map((btn, i) => {
          if ("divider" in btn && btn.divider) {
            return (
              <div
                key={`div-${i}`}
                className="w-px h-5 bg-border mx-1"
              />
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

      {/* Editable area */}
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

export function EditTab({ hackathon, hackathonId }: EditTabProps) {
  const updateHackathon = useUpdateHackathon();

  const [formData, setFormData] = React.useState({
    name: "",
    tagline: "",
    description: "",
    category: "tech",
    status: "draft",
    type: "online",
    tags: [] as string[],
    registrationStart: "",
    registrationEnd: "",
    hackingStart: "",
    hackingEnd: "",
    submissionDeadline: "",
    judgingStart: "",
    judgingEnd: "",
    winnersAnnouncement: "",
    minTeamSize: 1,
    maxTeamSize: 4,
    allowSolo: true,
    rules: "",
    eligibility: [] as string[],
  });

  const [newEligibility, setNewEligibility] = React.useState("");

  // Sync form when hackathon data loads
  React.useEffect(() => {
    if (!hackathon) return;
    setFormData({
      name: hackathon.name || "",
      tagline: hackathon.tagline || "",
      description: hackathon.description || "",
      category: hackathon.category || "tech",
      status: hackathon.status || "draft",
      type: hackathon.type || "online",
      tags: hackathon.tags || [],
      registrationStart: toDateTimeInputValue(hackathon.registrationStart || ""),
      registrationEnd: toDateTimeInputValue(hackathon.registrationEnd || ""),
      hackingStart: toDateTimeInputValue(hackathon.hackingStart || ""),
      hackingEnd: toDateTimeInputValue(hackathon.hackingEnd || ""),
      submissionDeadline: toDateTimeInputValue(hackathon.submissionDeadline || ""),
      judgingStart: toDateTimeInputValue(hackathon.judgingStart || ""),
      judgingEnd: toDateTimeInputValue(hackathon.judgingEnd || ""),
      winnersAnnouncement: toDateTimeInputValue(hackathon.winnersAnnouncement || ""),
      minTeamSize: hackathon.minTeamSize || 1,
      maxTeamSize: hackathon.maxTeamSize || 4,
      allowSolo: hackathon.allowSolo ?? true,
      rules: hackathon.rules || "",
      eligibility: hackathon.eligibility || [],
    });
  }, [hackathon]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else if (type === "number") {
      setFormData((prev) => ({ ...prev, [name]: Number(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateHackathon.mutateAsync({ id: hackathonId, ...formData });
      toast.success("Hackathon updated successfully!");
    } catch {
      toast.error("Failed to update hackathon.");
    }
  };

  // Strip HTML tags from eligibility items for clean display
  const stripHtml = (html: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = DOMPurify.sanitize(html);
    return tmp.textContent || tmp.innerText || html;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Hackathon name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tagline</label>
              <Input
                name="tagline"
                value={formData.tagline}
                onChange={handleChange}
                placeholder="A short catchy tagline"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <RichTextEditor
                value={formData.description}
                onChange={(html) =>
                  setFormData((prev) => ({ ...prev, description: html }))
                }
                placeholder="Describe your hackathon..."
                minHeight="180px"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={selectClasses}
                >
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className={selectClasses}
                >
                  {hackathonStatuses.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className={selectClasses}
                >
                  {typeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <TagSelector
                value={formData.tags}
                onChange={(tags) =>
                  setFormData((prev) => ({ ...prev, tags }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Registration Opens
                </label>
                <Input
                  type="datetime-local"
                  name="registrationStart"
                  value={formData.registrationStart}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Registration Closes
                </label>
                <Input
                  type="datetime-local"
                  name="registrationEnd"
                  value={formData.registrationEnd}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hacking Starts</label>
                <Input
                  type="datetime-local"
                  name="hackingStart"
                  value={formData.hackingStart}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hacking Ends</label>
                <Input
                  type="datetime-local"
                  name="hackingEnd"
                  value={formData.hackingEnd}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Submission Deadline
                </label>
                <Input
                  type="datetime-local"
                  name="submissionDeadline"
                  value={formData.submissionDeadline}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Judging Starts</label>
                <Input
                  type="datetime-local"
                  name="judgingStart"
                  value={formData.judgingStart}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Judging Ends</label>
                <Input
                  type="datetime-local"
                  name="judgingEnd"
                  value={formData.judgingEnd}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Winners Announced
                </label>
                <Input
                  type="datetime-local"
                  name="winnersAnnouncement"
                  value={formData.winnersAnnouncement}
                  onChange={handleChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Teams</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Team Size</label>
                <Input
                  type="number"
                  name="minTeamSize"
                  value={formData.minTeamSize}
                  onChange={handleChange}
                  min={1}
                  max={10}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Team Size</label>
                <Input
                  type="number"
                  name="maxTeamSize"
                  value={formData.maxTeamSize}
                  onChange={handleChange}
                  min={1}
                  max={10}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="allowSolo"
                name="allowSolo"
                checked={formData.allowSolo}
                onChange={handleChange}
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
              />
              <label htmlFor="allowSolo" className="text-sm font-medium">
                Allow solo participation
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Rules & Eligibility */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Rules &amp; Eligibility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rules</label>
              <RichTextEditor
                value={formData.rules}
                onChange={(html) =>
                  setFormData((prev) => ({ ...prev, rules: html }))
                }
                placeholder="Hackathon rules and guidelines..."
                minHeight="140px"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Eligibility Requirements
              </label>
              <div className="space-y-2">
                {formData.eligibility.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="flex-1 text-sm bg-muted/50 rounded-lg px-3 py-2">
                      {stripHtml(item)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          eligibility: prev.eligibility.filter(
                            (_, i) => i !== idx
                          ),
                        }));
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newEligibility}
                  onChange={(e) => setNewEligibility(e.target.value)}
                  placeholder="Add eligibility requirement..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newEligibility.trim()) {
                        setFormData((prev) => ({
                          ...prev,
                          eligibility: [
                            ...prev.eligibility,
                            newEligibility.trim(),
                          ],
                        }));
                        setNewEligibility("");
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (newEligibility.trim()) {
                      setFormData((prev) => ({
                        ...prev,
                        eligibility: [
                          ...prev.eligibility,
                          newEligibility.trim(),
                        ],
                      }));
                      setNewEligibility("");
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="gradient"
            disabled={updateHackathon.isPending}
          >
            <Save className="h-4 w-4" />
            {updateHackathon.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
