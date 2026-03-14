"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, FileText, ChevronLeft, ChevronRight, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FormField, FormSection, FormFieldValidation } from "@/lib/types";

interface DynamicFormRendererProps {
  fields: FormField[];
  sections: FormSection[];
  values: Record<string, unknown>;
  onChange: (fieldId: string, value: unknown) => void;
  onFileUpload?: (fieldId: string, file: File) => Promise<string>;
  errors?: Record<string, string>;
  readOnly?: boolean;
  className?: string;
}

export function DynamicFormRenderer({
  fields,
  sections,
  values,
  onChange,
  onFileUpload,
  errors = {},
  readOnly = false,
  className,
}: DynamicFormRendererProps) {
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  const [currentStep, setCurrentStep] = React.useState(0);

  const hasSteps = sortedSections.length > 1;
  const currentSection = hasSteps ? sortedSections[currentStep] : null;

  // Filter fields for current section (or show all if no sections)
  const visibleFields = fields
    .filter((f) => {
      if (currentSection) return f.sectionId === currentSection.id;
      return true;
    })
    .filter((f) => {
      // Conditional visibility
      if (!f.conditionalOn) return true;
      const depValue = values[f.conditionalOn.fieldId];
      switch (f.conditionalOn.operator) {
        case "equals":
          return String(depValue) === f.conditionalOn.value;
        case "not_equals":
          return String(depValue) !== f.conditionalOn.value;
        case "is_not_empty":
          return depValue !== undefined && depValue !== null && depValue !== "";
        case "contains":
          return String(depValue || "").includes(f.conditionalOn.value || "");
        default:
          return true;
      }
    })
    .sort((a, b) => a.order - b.order);

  // Validate current step fields
  const currentStepValid = visibleFields.every((f) => {
    if (!f.required) return true;
    const val = values[f.id];
    return val !== undefined && val !== null && val !== "";
  });

  const canGoNext = currentStep < sortedSections.length - 1;
  const canGoPrev = currentStep > 0;
  const isLastStep = !hasSteps || currentStep === sortedSections.length - 1;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Step indicator */}
      {hasSteps && (
        <div className="flex items-center gap-2 mb-8">
          {sortedSections.map((section, i) => (
            <React.Fragment key={section.id}>
              <button
                type="button"
                onClick={() => i <= currentStep && setCurrentStep(i)}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors",
                  i === currentStep
                    ? "text-primary"
                    : i < currentStep
                      ? "text-foreground cursor-pointer hover:text-primary"
                      : "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border-2 transition-colors",
                    i === currentStep
                      ? "border-primary bg-primary text-primary-foreground"
                      : i < currentStep
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                  )}
                >
                  {i < currentStep ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className="hidden sm:inline">{section.title}</span>
              </button>
              {i < sortedSections.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 rounded-full transition-colors",
                    i < currentStep ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Section header */}
      {currentSection && (
        <motion.div
          key={currentSection.id}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <h3 className="font-display text-xl font-bold">{currentSection.title}</h3>
          {currentSection.description && (
            <p className="text-sm text-muted-foreground mt-1">{currentSection.description}</p>
          )}
        </motion.div>
      )}

      {/* Fields */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSection?.id || "all"}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-5"
        >
          {visibleFields.map((field) => (
            <FieldRenderer
              key={field.id}
              field={field}
              value={values[field.id]}
              onChange={(val) => onChange(field.id, val)}
              onFileUpload={onFileUpload}
              error={errors[field.id]}
              readOnly={readOnly}
            />
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Step navigation */}
      {hasSteps && (
        <div className="flex items-center justify-between pt-6 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentStep((p) => p - 1)}
            disabled={!canGoPrev}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <span className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {sortedSections.length}
          </span>

          {!isLastStep && (
            <Button
              type="button"
              onClick={() => setCurrentStep((p) => p + 1)}
              disabled={!canGoNext || !currentStepValid}
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Individual Field Renderer ───────────────────────────

interface FieldRendererProps {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  onFileUpload?: (fieldId: string, file: File) => Promise<string>;
  error?: string;
  readOnly?: boolean;
}

function FieldRenderer({ field, value, onChange, onFileUpload, error, readOnly }: FieldRendererProps) {
  // Heading/paragraph are display-only
  if (field.type === "heading") {
    return (
      <div className="pt-4 pb-1">
        <h4 className="font-display text-lg font-semibold">{field.label}</h4>
        {field.description && (
          <p className="text-sm text-muted-foreground">{field.description}</p>
        )}
      </div>
    );
  }

  if (field.type === "paragraph") {
    return (
      <p className="text-sm text-muted-foreground leading-relaxed">
        {field.description || field.label}
      </p>
    );
  }

  const inputClasses = cn(
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm",
    "placeholder:text-muted-foreground/60",
    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "transition-colors",
    error && "border-destructive focus:ring-destructive/30 focus:border-destructive"
  );

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-sm font-medium">
        {field.label}
        {field.required && <span className="text-destructive">*</span>}
      </label>
      {field.description && field.type !== "checkbox" && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}

      {/* Text input */}
      {(field.type === "text" || field.type === "email" || field.type === "phone" || field.type === "url") && (
        <input
          type={field.type === "phone" ? "tel" : field.type === "url" ? "url" : field.type}
          value={String(value || "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={readOnly}
          className={inputClasses}
          maxLength={field.validation?.maxLength}
        />
      )}

      {/* Number input */}
      {field.type === "number" && (
        <input
          type="number"
          value={value !== undefined && value !== null ? String(value) : ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          placeholder={field.placeholder}
          disabled={readOnly}
          min={field.validation?.min}
          max={field.validation?.max}
          className={inputClasses}
        />
      )}

      {/* Date input */}
      {field.type === "date" && (
        <input
          type="date"
          value={String(value || "")}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          className={inputClasses}
        />
      )}

      {/* Textarea */}
      {field.type === "textarea" && (
        <textarea
          value={String(value || "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={readOnly}
          rows={4}
          maxLength={field.validation?.maxLength}
          className={cn(inputClasses, "resize-y min-h-[100px]")}
        />
      )}

      {/* Select */}
      {field.type === "select" && (
        <select
          value={String(value || "")}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          className={inputClasses}
        >
          <option value="">{field.placeholder || "Select..."}</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {/* Multi-select */}
      {field.type === "multi_select" && (
        <div className="flex flex-wrap gap-2">
          {field.options?.map((opt) => {
            const selected = Array.isArray(value) && value.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                disabled={readOnly}
                onClick={() => {
                  const current = Array.isArray(value) ? [...value] : [];
                  if (selected) {
                    onChange(current.filter((v) => v !== opt.value));
                  } else {
                    onChange([...current, opt.value]);
                  }
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Radio */}
      {field.type === "radio" && (
        <div className="space-y-2">
          {field.options?.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name={field.id}
                value={opt.value}
                checked={value === opt.value}
                onChange={(e) => onChange(e.target.value)}
                disabled={readOnly}
                className="h-4 w-4 text-primary accent-primary"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      )}

      {/* Checkbox */}
      {field.type === "checkbox" && (
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            disabled={readOnly}
            className="mt-0.5 h-4 w-4 rounded accent-primary"
          />
          <span className="text-sm">{field.description || field.label}</span>
        </label>
      )}

      {/* File upload */}
      {field.type === "file" && (
        <FileUploadField
          field={field}
          value={value}
          onChange={onChange}
          onFileUpload={onFileUpload}
          readOnly={readOnly}
        />
      )}

      {/* Error message */}
      {error && (
        <p className="flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

// ── File Upload Field ───────────────────────────────────

function FileUploadField({
  field,
  value,
  onChange,
  onFileUpload,
  readOnly,
}: {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  onFileUpload?: (fieldId: string, file: File) => Promise<string>;
  readOnly?: boolean;
}) {
  const [uploading, setUploading] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const maxSize = field.validation?.maxFileSize || 10 * 1024 * 1024;
  const allowedTypes = field.validation?.allowedFileTypes || [
    "application/pdf",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSize) {
      alert(`File too large. Max size: ${Math.round(maxSize / 1024 / 1024)}MB`);
      return;
    }

    if (onFileUpload) {
      setUploading(true);
      try {
        const url = await onFileUpload(field.id, file);
        onChange(url);
        setFileName(file.name);
      } catch {
        alert("File upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    } else {
      // Store as data URL for preview (development fallback)
      const reader = new FileReader();
      reader.onload = () => {
        onChange(reader.result);
        setFileName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  if (value && typeof value === "string") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border p-3">
        <FileText className="h-5 w-5 text-primary flex-shrink-0" />
        <span className="text-sm truncate flex-1">{fileName || "Uploaded file"}</span>
        {!readOnly && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange(undefined);
              setFileName(null);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        onChange={handleFileChange}
        accept={allowedTypes.join(",")}
        disabled={readOnly || uploading}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={readOnly || uploading}
        className={cn(
          "w-full rounded-lg border-2 border-dashed border-border p-6",
          "flex flex-col items-center gap-2 text-center",
          "hover:border-primary/50 hover:bg-muted/50 transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <Upload className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium">
          {uploading ? "Uploading..." : "Click to upload"}
        </p>
        <p className="text-xs text-muted-foreground">
          PDF, PPT, DOC up to {Math.round(maxSize / 1024 / 1024)}MB
        </p>
      </button>
    </div>
  );
}

// ── Export step info for parent forms ────────────────────
export function useFormSteps(sections: FormSection[]) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const sorted = [...sections].sort((a, b) => a.order - b.order);
  return {
    currentStep,
    setCurrentStep,
    totalSteps: sorted.length,
    isLastStep: currentStep === sorted.length - 1,
    currentSection: sorted[currentStep],
  };
}
