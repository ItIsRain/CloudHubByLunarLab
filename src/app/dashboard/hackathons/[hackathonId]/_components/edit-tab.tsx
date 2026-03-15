"use client";

import * as React from "react";
import DOMPurify from "dompurify";
import { motion } from "framer-motion";
import {
  Save,
  Plus,
  Trash2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TagSelector } from "@/components/forms/tag-selector";
import { DateTimePicker } from "@/components/forms/date-time-picker";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { useUpdateHackathon } from "@/hooks/use-hackathons";
import { toast } from "sonner";
import { cn, slugify } from "@/lib/utils";
import type { Hackathon, FormField, FormFieldType } from "@/lib/types";

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

const selectClasses =
  "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 appearance-none";

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
    registrationFields: [] as FormField[],
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
      registrationStart: hackathon.registrationStart || "",
      registrationEnd: hackathon.registrationEnd || "",
      hackingStart: hackathon.hackingStart || "",
      hackingEnd: hackathon.hackingEnd || "",
      submissionDeadline: hackathon.submissionDeadline || "",
      judgingStart: hackathon.judgingStart || "",
      judgingEnd: hackathon.judgingEnd || "",
      winnersAnnouncement: hackathon.winnersAnnouncement || "",
      minTeamSize: hackathon.minTeamSize || 1,
      maxTeamSize: hackathon.maxTeamSize || 4,
      allowSolo: hackathon.allowSolo ?? true,
      rules: hackathon.rules || "",
      eligibility: hackathon.eligibility || [],
      registrationFields: hackathon.registrationFields || [],
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
                <DateTimePicker
                  value={formData.registrationStart}
                  onChange={(val) =>
                    setFormData((prev) => ({ ...prev, registrationStart: val }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Registration Closes
                </label>
                <DateTimePicker
                  value={formData.registrationEnd}
                  onChange={(val) =>
                    setFormData((prev) => ({ ...prev, registrationEnd: val }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hacking Starts</label>
                <DateTimePicker
                  value={formData.hackingStart}
                  onChange={(val) =>
                    setFormData((prev) => ({ ...prev, hackingStart: val }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hacking Ends</label>
                <DateTimePicker
                  value={formData.hackingEnd}
                  onChange={(val) =>
                    setFormData((prev) => ({ ...prev, hackingEnd: val }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Submission Deadline
                </label>
                <DateTimePicker
                  value={formData.submissionDeadline}
                  onChange={(val) =>
                    setFormData((prev) => ({ ...prev, submissionDeadline: val }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Judging Starts</label>
                <DateTimePicker
                  value={formData.judgingStart}
                  onChange={(val) =>
                    setFormData((prev) => ({ ...prev, judgingStart: val }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Judging Ends</label>
                <DateTimePicker
                  value={formData.judgingEnd}
                  onChange={(val) =>
                    setFormData((prev) => ({ ...prev, judgingEnd: val }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Winners Announced
                </label>
                <DateTimePicker
                  value={formData.winnersAnnouncement}
                  onChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      winnersAnnouncement: val,
                    }))
                  }
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

        {/* Registration Form — now in the dedicated "Form Builder" tab */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Registration Form</p>
                <p className="text-xs text-muted-foreground">
                  {formData.registrationFields.length > 0
                    ? `${formData.registrationFields.length} fields configured`
                    : "No custom fields — one-click registration"}
                </p>
              </div>
              <Badge variant="muted">{formData.registrationFields.length} fields</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Use the <strong>Form Builder</strong> tab to create and manage your application form with multi-page support, file uploads, and conditional logic.
            </p>
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

// ── Registration Field Editor ───────────────────────────────────────

const fieldTypeOptions: { value: FormFieldType; label: string }[] = [
  { value: "text", label: "Short Text" },
  { value: "textarea", label: "Long Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "url", label: "URL" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "multi_select", label: "Multi Select" },
  { value: "radio", label: "Radio" },
  { value: "checkbox", label: "Checkbox" },
  { value: "heading", label: "Heading" },
  { value: "paragraph", label: "Info Text" },
];

function RegistrationFieldEditor({
  field,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [expanded, setExpanded] = React.useState(!field.label);
  const hasOptions = field.type === "select" || field.type === "multi_select" || field.type === "radio";
  const isLayout = field.type === "heading" || field.type === "paragraph";

  return (
    <div className={cn(
      "rounded-xl border transition-all",
      expanded ? "border-primary/30 bg-primary/[0.02]" : "border-border"
    )}>
      {/* Header row */}
      <div
        className="flex items-center gap-2 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {field.type}
        </span>
        <span className="text-sm font-medium truncate flex-1">
          {field.label || "(untitled)"}
        </span>
        {field.required && (
          <span className="text-[10px] font-medium text-primary border border-primary/30 rounded px-1.5 py-0.5">
            Required
          </span>
        )}
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="p-1 text-muted-foreground hover:text-foreground">
            <span className="text-xs">&#9650;</span>
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="p-1 text-muted-foreground hover:text-foreground">
            <span className="text-xs">&#9660;</span>
          </button>
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Field Type</label>
              <select
                value={field.type}
                onChange={(e) => {
                  const newType = e.target.value as FormFieldType;
                  const updates: Partial<FormField> = { type: newType };
                  // Add empty options array for types that need it
                  if ((newType === "select" || newType === "multi_select" || newType === "radio") && !field.options?.length) {
                    updates.options = [{ label: "Option 1", value: "option_1" }];
                  }
                  onUpdate(updates);
                }}
                className={selectClasses}
              >
                {fieldTypeOptions.map((ft) => (
                  <option key={ft.value} value={ft.value}>{ft.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Label *</label>
              <Input
                value={field.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                placeholder="e.g. Phone Number"
              />
            </div>
          </div>

          {!isLayout && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Placeholder</label>
                <Input
                  value={field.placeholder || ""}
                  onChange={(e) => onUpdate({ placeholder: e.target.value })}
                  placeholder="Placeholder text"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Help Text</label>
                <Input
                  value={field.description || ""}
                  onChange={(e) => onUpdate({ description: e.target.value })}
                  placeholder="Help text shown below the field"
                />
              </div>
            </div>
          )}

          {isLayout && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {field.type === "heading" ? "Heading Text" : "Paragraph Text"}
              </label>
              <Input
                value={field.description || field.label}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder={field.type === "heading" ? "Section heading" : "Informational text"}
              />
            </div>
          )}

          {/* Options for select/radio/multi_select */}
          {hasOptions && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Options</label>
              {(field.options || []).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={opt.label}
                    onChange={(e) => {
                      const updated = [...(field.options || [])];
                      updated[i] = {
                        label: e.target.value,
                        value: slugify(e.target.value) || `option_${i + 1}`,
                      };
                      onUpdate({ options: updated });
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = (field.options || []).filter((_, j) => j !== i);
                      onUpdate({ options: updated });
                    }}
                    className="text-muted-foreground hover:text-destructive shrink-0 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  onUpdate({
                    options: [
                      ...(field.options || []),
                      { label: `Option ${(field.options?.length || 0) + 1}`, value: `option_${(field.options?.length || 0) + 1}` },
                    ],
                  })
                }
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" /> Add Option
              </Button>
            </div>
          )}

          {/* Required toggle + remove */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            {!isLayout ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => onUpdate({ required: e.target.checked })}
                  className="h-3.5 w-3.5 rounded border-input"
                />
                <span className="text-xs font-medium">Required</span>
              </label>
            ) : (
              <div />
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-xs text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1" /> Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
