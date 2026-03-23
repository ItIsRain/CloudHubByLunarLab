"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  FileText,
  Star,
  Download,
  Settings2,
  Grid3x3,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatDate } from "@/lib/utils";
import type { Hackathon, FormField, FormSection } from "@/lib/types";
import { useHackathonSubmissions } from "@/hooks/use-submissions";
import { useUpdateHackathon } from "@/hooks/use-hackathons";
import { toast } from "sonner";

interface SubmissionsTabProps {
  hackathon: Hackathon;
  hackathonId: string;
}

const submissionStatusConfig: Record<
  string,
  {
    label: string;
    variant: "muted" | "success" | "warning" | "secondary" | "gradient";
  }
> = {
  draft: { label: "Draft", variant: "muted" },
  submitted: { label: "Submitted", variant: "secondary" },
  "under-review": { label: "Under Review", variant: "warning" },
  scored: { label: "Scored", variant: "success" },
  winner: { label: "Winner", variant: "gradient" },
};

const selectClasses =
  "flex h-11 rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary appearance-none";

const FIELD_TYPES = [
  { value: "text", label: "Short Text" },
  { value: "textarea", label: "Long Text" },
  { value: "email", label: "Email" },
  { value: "url", label: "URL" },
  { value: "number", label: "Number" },
  { value: "select", label: "Dropdown" },
  { value: "multi_select", label: "Multi Select" },
  { value: "radio", label: "Radio" },
  { value: "checkbox", label: "Checkbox" },
  { value: "file", label: "File Upload" },
] as const;

export function SubmissionsTab({
  hackathon,
  hackathonId,
}: SubmissionsTabProps) {
  const [activeView, setActiveView] = React.useState<"submissions" | "form-editor">("submissions");

  return (
    <div className="space-y-6">
      {/* Header with view toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="font-display text-2xl font-bold">Submissions</h2>
          <p className="text-muted-foreground mt-1">
            Manage submission form and view team submissions
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-muted/30">
          <button
            onClick={() => setActiveView("submissions")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              activeView === "submissions"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Grid3x3 className="h-3.5 w-3.5" />
            Submissions
          </button>
          <button
            onClick={() => setActiveView("form-editor")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              activeView === "form-editor"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Form Editor
            {(hackathon.submissionFields?.length ?? 0) > 0 && (
              <Badge variant="secondary" className="text-[10px] ml-1">
                {hackathon.submissionFields?.length ?? 0}
              </Badge>
            )}
          </button>
        </div>
      </motion.div>

      {activeView === "submissions" ? (
        <SubmissionsGrid hackathon={hackathon} hackathonId={hackathonId} />
      ) : (
        <SubmissionFormEditor hackathon={hackathon} hackathonId={hackathonId} />
      )}
    </div>
  );
}

// ── Submissions Grid (existing) ──────────────────────────

function SubmissionsGrid({ hackathon, hackathonId }: SubmissionsTabProps) {
  const { data: submissionsData, isLoading } =
    useHackathonSubmissions(hackathonId);

  const [search, setSearch] = React.useState("");
  const [trackFilter, setTrackFilter] = React.useState("all");

  const submissions = submissionsData?.data ?? [];

  const tracks = React.useMemo(
    () => Array.from(new Set(submissions.map((s) => s.track?.name).filter(Boolean))),
    [submissions]
  );

  const filteredSubmissions = React.useMemo(
    () =>
      submissions.filter((s) => {
        const q = search.toLowerCase();
        const matchesSearch =
          s.projectName.toLowerCase().includes(q) ||
          s.team.name.toLowerCase().includes(q);
        const matchesTrack =
          trackFilter === "all" || s.track?.name === trackFilter;
        return matchesSearch && matchesTrack;
      }),
    [submissions, search, trackFilter]
  );

  const handleExport = () => {
    const csv = [
      [
        "Project Name",
        "Team",
        "Track",
        "Status",
        "Average Score",
        "Submitted At",
      ].join(","),
      ...filteredSubmissions.map((s) =>
        [
          `"${s.projectName}"`,
          `"${s.team.name}"`,
          `"${s.track?.name || "N/A"}"`,
          s.status,
          s.averageScore?.toFixed(1) || "N/A",
          s.submittedAt,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "submissions.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded!");
  };

  return (
    <>
      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="flex-1">
          <Input
            placeholder="Search submissions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <select
          value={trackFilter}
          onChange={(e) => setTrackFilter(e.target.value)}
          className={selectClasses}
        >
          <option value="all">All Tracks</option>
          {tracks.map((track) => (
            <option key={track} value={track}>
              {track}
            </option>
          ))}
        </select>
        <Button variant="secondary" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </motion.div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shimmer rounded-xl h-36 w-full" />
          ))}
        </div>
      )}

      {/* Submissions Grid */}
      {!isLoading && filteredSubmissions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSubmissions.map((sub, i) => {
            const statusConf = submissionStatusConfig[sub.status] || {
              label: sub.status,
              variant: "muted" as const,
            };
            return (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <Link href={`/dashboard/submissions/${sub.id}`}>
                  <Card hover className="h-full">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-display font-bold text-base mb-1 truncate">
                            {sub.projectName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            by {sub.team.name}
                          </p>
                        </div>
                        <Badge variant={statusConf.variant}>
                          {statusConf.label}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        {sub.track?.name && (
                          <Badge variant="outline" className="text-xs">
                            {sub.track.name}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Submitted {formatDate(sub.submittedAt)}</span>
                        {sub.averageScore !== undefined && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium text-foreground">
                              {sub.averageScore.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredSubmissions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <FileText className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="font-display text-xl font-bold mb-2">
            No submissions found
          </h3>
          <p className="text-muted-foreground max-w-md">
            No submissions match your current filters.
          </p>
        </motion.div>
      )}
    </>
  );
}

// ── Submission Form Editor ────────────────────────────────

function SubmissionFormEditor({ hackathon, hackathonId }: SubmissionsTabProps) {
  const updateHackathon = useUpdateHackathon();
  const [fields, setFields] = React.useState<FormField[]>(
    hackathon.submissionFields || []
  );
  const [sections, setSections] = React.useState<FormSection[]>(
    hackathon.submissionSections || []
  );

  // Sync from hackathon prop when it changes externally
  React.useEffect(() => {
    setFields(hackathon.submissionFields || []);
    setSections(hackathon.submissionSections || []);
  }, [hackathon.submissionFields, hackathon.submissionSections]);

  const addField = () => {
    const newField: FormField = {
      id: crypto.randomUUID(),
      type: "text",
      label: "",
      placeholder: "",
      required: false,
      order: fields.length,
    };
    setFields([...fields, newField]);
  };

  const updateFieldValue = (fieldId: string, key: keyof FormField, value: unknown) => {
    setFields((prev) =>
      prev.map((f) =>
        f.id === fieldId ? { ...f, [key]: value } : f
      )
    );
  };

  const removeField = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
  };

  const moveField = (fromIndex: number, direction: "up" | "down") => {
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= fields.length) return;
    const updated = [...fields];
    [updated[fromIndex], updated[toIndex]] = [updated[toIndex], updated[fromIndex]];
    setFields(updated.map((f, i) => ({ ...f, order: i })));
  };

  const handleSave = async () => {
    // Validate fields have labels
    const emptyLabel = fields.find((f) => !f.label.trim());
    if (emptyLabel) {
      toast.error("All fields must have a label.");
      return;
    }

    try {
      await updateHackathon.mutateAsync({
        id: hackathonId,
        submissionFields: fields.map((f, i) => ({ ...f, order: i })),
        submissionSections: sections,
      });
      toast.success("Submission form saved!");
    } catch {
      toast.error("Failed to save submission form.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-lg">
                Submission Form Fields
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Define the custom fields teams fill out when submitting their project.
                These fields are used when a phase is set to &quot;Submission Mode&quot;.
              </p>
            </div>
            <Button onClick={handleSave} disabled={updateHackathon.isPending}>
              {updateHackathon.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>

          {fields.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center border-2 border-dashed rounded-xl">
              <Settings2 className="h-8 w-8 text-muted-foreground mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground mb-3">
                No submission fields yet. Add fields that teams will fill out.
              </p>
              <Button variant="outline" size="sm" onClick={addField}>
                <Plus className="h-4 w-4 mr-1" />
                Add First Field
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex items-start gap-3 rounded-lg border border-border p-3 bg-muted/20"
                >
                  <div className="flex flex-col items-center gap-1 pt-2">
                    <button
                      type="button"
                      onClick={() => moveField(index, "up")}
                      disabled={index === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {index + 1}
                    </span>
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <Input
                        placeholder="Field label"
                        value={field.label}
                        onChange={(e) =>
                          updateFieldValue(field.id, "label", e.target.value)
                        }
                      />
                    </div>
                    <select
                      className={cn(selectClasses, "h-10")}
                      value={field.type}
                      onChange={(e) =>
                        updateFieldValue(field.id, "type", e.target.value)
                      }
                    >
                      {FIELD_TYPES.map((ft) => (
                        <option key={ft.value} value={ft.value}>
                          {ft.label}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="Placeholder text"
                      value={field.placeholder || ""}
                      onChange={(e) =>
                        updateFieldValue(field.id, "placeholder", e.target.value)
                      }
                    />
                    <Input
                      placeholder="Description (optional)"
                      value={field.description || ""}
                      onChange={(e) =>
                        updateFieldValue(field.id, "description", e.target.value)
                      }
                    />
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) =>
                          updateFieldValue(field.id, "required", e.target.checked)
                        }
                        className="rounded border-border"
                      />
                      Required
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeField(field.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors mt-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {fields.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={addField}
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Field
            </Button>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Note: The built-in submission fields (project name, description, GitHub URL, demo URL, etc.)
        are always available. These custom fields let you collect additional structured data from teams.
      </p>
    </motion.div>
  );
}
