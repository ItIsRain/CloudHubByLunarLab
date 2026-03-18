"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Eye,
  Pencil,
  Send,
  FileText,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FormField, FormSection } from "@/lib/types";

// ── Types ────────────────────────────────────────────────

interface UploadedFileValue {
  url?: string;
  originalFilename?: string;
  format?: string;
  bytes?: number;
  publicId?: string;
}

interface SectionGroup {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

interface ApplicationPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: FormField[];
  sections: FormSection[];
  values: Record<string, unknown>;
  onSubmit: () => void;
  onBackToEdit: () => void;
  isSubmitting: boolean;
  submitLabel?: string;
  competitionName?: string;
}

// ── Animation variants ───────────────────────────────────

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.35, ease: "easeOut" as const },
  }),
};

const fieldVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, duration: 0.25, ease: "easeOut" as const },
  }),
};

// ── Main Component ───────────────────────────────────────

export function ApplicationPreviewDialog({
  open,
  onOpenChange,
  fields,
  sections,
  values,
  onSubmit,
  onBackToEdit,
  isSubmitting,
  submitLabel = "Submit Application",
  competitionName,
}: ApplicationPreviewDialogProps) {
  // Group fields by sections
  const sectionGroups = React.useMemo(() => {
    const sortedSections = [...sections].sort((a, b) => a.order - b.order);
    const groups: SectionGroup[] = [];

    if (sortedSections.length === 0) {
      // No sections defined: single group with all fields
      const displayFields = fields
        .filter((f) => f.type !== "heading" && f.type !== "paragraph")
        .sort((a, b) => a.order - b.order);
      if (displayFields.length > 0) {
        groups.push({ id: "__all__", title: "Application Details", fields: displayFields });
      }
      return groups;
    }

    for (const section of sortedSections) {
      const sectionFields = fields
        .filter((f) => f.sectionId === section.id)
        .filter((f) => f.type !== "heading" && f.type !== "paragraph")
        .sort((a, b) => a.order - b.order);

      if (sectionFields.length > 0) {
        groups.push({
          id: section.id,
          title: section.title,
          description: section.description,
          fields: sectionFields,
        });
      }
    }

    // Fields without a sectionId
    const orphanFields = fields
      .filter((f) => !f.sectionId && f.type !== "heading" && f.type !== "paragraph")
      .sort((a, b) => a.order - b.order);
    if (orphanFields.length > 0) {
      groups.push({ id: "__other__", title: "Other Information", fields: orphanFields });
    }

    return groups;
  }, [fields, sections]);

  // Count filled vs total visible fields (excluding conditional-hidden)
  const { filledCount, totalCount } = React.useMemo(() => {
    let filled = 0;
    let total = 0;

    for (const group of sectionGroups) {
      for (const field of group.fields) {
        // Skip conditionally hidden fields
        if (field.conditionalOn) {
          const depValue = values[field.conditionalOn.fieldId];
          let visible = false;
          switch (field.conditionalOn.operator) {
            case "equals":
              visible = String(depValue) === field.conditionalOn.value;
              break;
            case "not_equals":
              visible = String(depValue) !== field.conditionalOn.value;
              break;
            case "contains":
              visible = String(depValue || "").includes(field.conditionalOn.value || "");
              break;
            case "is_not_empty":
              visible = depValue !== undefined && depValue !== null && depValue !== "";
              break;
          }
          if (!visible) continue;
        }

        total++;
        const val = values[field.id];
        if (val !== undefined && val !== null && val !== "" && !(Array.isArray(val) && val.length === 0)) {
          filled++;
        }
      }
    }

    return { filledCount: filled, totalCount: total };
  }, [sectionGroups, values]);

  const completionPercent = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>Review Your Application</DialogTitle>
              <DialogDescription>
                {competitionName
                  ? `Review your answers for ${competitionName} before submitting.`
                  : "Review all your answers carefully before submitting."}
              </DialogDescription>
            </div>
          </div>

          {/* Completion indicator */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  completionPercent === 100 ? "bg-green-500" : "bg-primary"
                )}
                initial={{ width: 0 }}
                animate={{ width: `${completionPercent}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground shrink-0">
              {filledCount}/{totalCount} fields
            </span>
            {completionPercent === 100 && (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            )}
          </div>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-8">
            {sectionGroups.map((group, sectionIdx) => (
              <PreviewSection
                key={group.id}
                group={group}
                sectionIndex={sectionIdx}
                values={values}
                fields={fields}
              />
            ))}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border shrink-0 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onBackToEdit}
            disabled={isSubmitting}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Back to Edit
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            loading={isSubmitting}
          >
            <Send className="mr-2 h-4 w-4" />
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Section Renderer ─────────────────────────────────────

function PreviewSection({
  group,
  sectionIndex,
  values,
  fields,
}: {
  group: SectionGroup;
  sectionIndex: number;
  values: Record<string, unknown>;
  fields: FormField[];
}) {
  // Filter out conditionally-hidden fields
  const visibleFields = group.fields.filter((field) => {
    if (!field.conditionalOn) return true;
    const depValue = values[field.conditionalOn.fieldId];
    switch (field.conditionalOn.operator) {
      case "equals":
        return String(depValue) === field.conditionalOn.value;
      case "not_equals":
        return String(depValue) !== field.conditionalOn.value;
      case "contains":
        return String(depValue || "").includes(field.conditionalOn.value || "");
      case "is_not_empty":
        return depValue !== undefined && depValue !== null && depValue !== "";
      default:
        return true;
    }
  });

  if (visibleFields.length === 0) return null;

  // Suppress unused variable warning
  void fields;

  return (
    <motion.div
      custom={sectionIndex}
      initial="hidden"
      animate="visible"
      variants={sectionVariants}
    >
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {sectionIndex + 1}
        </div>
        <h3 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider">
          {group.title}
        </h3>
      </div>
      {group.description && (
        <p className="text-xs text-muted-foreground mb-3">{group.description}</p>
      )}

      {/* Fields */}
      <div className="rounded-xl border border-border bg-card/50 divide-y divide-border">
        {visibleFields.map((field, fieldIdx) => (
          <PreviewField
            key={field.id}
            field={field}
            value={values[field.id]}
            fieldIndex={fieldIdx}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ── Field Renderer ───────────────────────────────────────

function PreviewField({
  field,
  value,
  fieldIndex,
}: {
  field: FormField;
  value: unknown;
  fieldIndex: number;
}) {
  const isEmpty =
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);

  const displayValue = React.useMemo(() => {
    if (isEmpty) {
      return (
        <span className="inline-flex items-center gap-1 text-muted-foreground italic text-sm">
          <AlertCircle className="h-3 w-3" />
          Not provided
        </span>
      );
    }

    // File upload
    if (field.type === "file") {
      const file = value as UploadedFileValue | string | null;
      if (!file) {
        return (
          <span className="text-muted-foreground italic text-sm">No file uploaded</span>
        );
      }

      // Handle object with url/filename
      if (typeof file === "object" && file.url) {
        return (
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline transition-colors"
          >
            <Badge variant="secondary" className="gap-1.5 font-normal">
              <FileText className="h-3 w-3" />
              {file.originalFilename || "Uploaded file"}
              {file.format && (
                <span className="text-[10px] opacity-60 uppercase">.{file.format}</span>
              )}
            </Badge>
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      }

      // Handle string URL
      if (typeof file === "string") {
        return (
          <a
            href={file}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <FileText className="h-3.5 w-3.5" />
            Uploaded file
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      }

      return <span className="text-muted-foreground italic text-sm">No file</span>;
    }

    // Checkbox
    if (field.type === "checkbox") {
      return (
        <Badge
          variant={value ? "default" : "secondary"}
          className={cn(
            "text-xs",
            value
              ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
              : "bg-muted text-muted-foreground"
          )}
        >
          {value ? "Yes" : "No"}
        </Badge>
      );
    }

    // Multi-select
    if (field.type === "multi_select" && Array.isArray(value)) {
      const selectedValues = value as string[];
      if (selectedValues.length === 0) {
        return <span className="text-muted-foreground italic text-sm">None selected</span>;
      }
      return (
        <div className="flex flex-wrap gap-1.5">
          {selectedValues.map((v) => {
            const opt = field.options?.find((o) => o.value === v);
            return (
              <Badge key={v} variant="secondary" className="text-xs font-normal">
                {opt?.label || v}
              </Badge>
            );
          })}
        </div>
      );
    }

    // Select / Radio - show label not raw value
    if ((field.type === "select" || field.type === "radio") && field.options) {
      const opt = field.options.find((o) => o.value === String(value));
      return <span className="text-sm">{opt?.label || String(value)}</span>;
    }

    // Date
    if (field.type === "date" && value) {
      try {
        const dateStr = String(value);
        const date = new Date(dateStr + "T00:00:00");
        if (!isNaN(date.getTime())) {
          return (
            <span className="text-sm">
              {date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          );
        }
      } catch {
        // fallthrough to default
      }
      return <span className="text-sm">{String(value)}</span>;
    }

    // URL
    if (field.type === "url" && value) {
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          {String(value)}
          <ExternalLink className="h-3 w-3" />
        </a>
      );
    }

    // Email
    if (field.type === "email" && value) {
      return (
        <a
          href={`mailto:${String(value)}`}
          className="text-sm text-primary hover:underline"
        >
          {String(value)}
        </a>
      );
    }

    // Phone
    if (field.type === "phone" && value) {
      return (
        <a
          href={`tel:${String(value)}`}
          className="text-sm text-primary hover:underline"
        >
          {String(value)}
        </a>
      );
    }

    // Textarea - preserve line breaks
    if (field.type === "textarea" && value) {
      const text = String(value);
      return (
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{text}</p>
      );
    }

    // Default: text, number
    return <span className="text-sm">{String(value)}</span>;
  }, [field, value, isEmpty]);

  return (
    <motion.div
      custom={fieldIndex}
      initial="hidden"
      animate="visible"
      variants={fieldVariants}
      className="px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4"
    >
      <div className="sm:w-2/5 shrink-0 flex items-center gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">
          {field.label}
        </span>
        {field.required && (
          <span className="text-destructive text-xs">*</span>
        )}
      </div>
      <div className="sm:w-3/5">{displayValue}</div>
    </motion.div>
  );
}
