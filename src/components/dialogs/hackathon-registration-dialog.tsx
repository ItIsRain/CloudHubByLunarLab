"use client";

import * as React from "react";
import { Loader2, ClipboardList, ChevronLeft, ChevronRight, Upload, X, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { FormField, FormSection } from "@/lib/types";

/** Convert raw MIME types to human-readable labels */
const MIME_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "application/vnd.ms-powerpoint": "PPT",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.ms-excel": "XLS",
  "image/*": "Images",
  "video/*": "Videos",
  "audio/*": "Audio",
  "text/plain": "TXT",
  "text/csv": "CSV",
};

function formatFileTypes(types: string[]): string {
  return types.map((t) => MIME_LABELS[t] || t.replace("application/", "")).join(", ");
}

interface QuotaStatus {
  quotaFieldId: string | null;
  quotas: Record<string, number>;
  fills: Record<string, number>;
  rejected: Record<string, boolean>;
  quotaEnforcement?: string;
}

interface HackathonRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hackathonId: string;
  hackathonName: string;
  registrationFields: FormField[];
  registrationSections?: FormSection[];
  isSubmitting: boolean;
  onSubmit: (formData: Record<string, unknown>) => void;
}

export function HackathonRegistrationDialog({
  open,
  onOpenChange,
  hackathonId,
  hackathonName,
  registrationFields,
  registrationSections,
  isSubmitting,
  onSubmit,
}: HackathonRegistrationDialogProps) {
  const [formData, setFormData] = React.useState<Record<string, unknown>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = React.useState(0);
  const [quotaStatus, setQuotaStatus] = React.useState<QuotaStatus | null>(null);

  // Fetch quota status when dialog opens
  React.useEffect(() => {
    if (open && hackathonId) {
      fetch(`/api/hackathons/${hackathonId}/quota-status`)
        .then((res) => res.json())
        .then((data) => setQuotaStatus(data))
        .catch(() => setQuotaStatus(null));
    }
  }, [open, hackathonId]);

  // Build a lookup from sectionId → section metadata
  const sectionMeta = React.useMemo(() => {
    const map = new Map<string, { title: string; description?: string }>();
    if (registrationSections) {
      for (const s of registrationSections) {
        map.set(s.id, { title: s.title, description: s.description });
      }
    }
    return map;
  }, [registrationSections]);

  // Group fields into pages by sectionId
  const pages = React.useMemo(() => {
    const sectionIds = new Set<string>();
    const sections: { id: string; title: string; description?: string; fields: FormField[] }[] = [];

    for (const field of registrationFields) {
      const sid = field.sectionId || "__default__";
      if (!sectionIds.has(sid)) {
        sectionIds.add(sid);
        // Use section metadata if available, otherwise fallback to heading or generic name
        const meta = sectionMeta.get(sid);
        const isHeading = field.type === "heading";
        sections.push({
          id: sid,
          title: meta?.title || (isHeading ? field.label : (sid === "__default__" ? "Application" : `Page ${sections.length + 1}`)),
          description: meta?.description || (isHeading ? field.description : undefined),
          fields: isHeading && !meta ? [] : [field],
        });
      } else {
        const section = sections.find((s) => s.id === sid);
        if (section) section.fields.push(field);
      }
    }

    if (sections.length === 0) return [{ id: "__default__", title: "Application", fields: registrationFields }];
    return sections;
  }, [registrationFields, sectionMeta]);

  const isMultiPage = pages.length > 1;
  const currentFields = pages[currentPage]?.fields || [];
  const currentPageTitle = pages[currentPage]?.title;
  const currentPageDescription = pages[currentPage]?.description;

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setFormData({});
      setErrors({});
      setCurrentPage(0);
    }
  }, [open]);

  const updateField = (fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const validatePage = (pageFields: FormField[]): boolean => {
    const newErrors: Record<string, string> = {};
    for (const field of pageFields) {
      if (field.type === "heading" || field.type === "paragraph") continue;
      // Check conditional visibility
      if (field.conditionalOn) {
        const depValue = formData[field.conditionalOn.fieldId];
        let visible = false;
        switch (field.conditionalOn.operator) {
          case "equals": visible = String(depValue) === field.conditionalOn.value; break;
          case "not_equals": visible = String(depValue) !== field.conditionalOn.value; break;
          case "contains": visible = String(depValue || "").includes(field.conditionalOn.value || ""); break;
          case "is_not_empty": visible = depValue !== undefined && depValue !== null && depValue !== ""; break;
        }
        if (!visible) continue; // Skip validation for hidden fields
      }
      if (field.required) {
        const val = formData[field.id];
        if (val === undefined || val === null || val === "") {
          newErrors[field.id] = `${field.label} is required`;
        }
      }
      if (field.validation?.minLength) {
        const val = String(formData[field.id] || "");
        if (val.length > 0 && val.length < field.validation.minLength) {
          newErrors[field.id] = `Minimum ${field.validation.minLength} characters`;
        }
      }
      if (field.validation?.maxLength) {
        const val = String(formData[field.id] || "");
        if (val.length > field.validation.maxLength) {
          newErrors[field.id] = `Maximum ${field.validation.maxLength} characters`;
        }
      }
    }
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validateAll = (): boolean => {
    const allFields = pages.flatMap((p) => p.fields);
    return validatePage(allFields);
  };

  const handleNext = () => {
    if (validatePage(currentFields)) {
      setCurrentPage((p) => Math.min(p + 1, pages.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentPage((p) => Math.max(p - 1, 0));
  };

  const handleSubmit = () => {
    if (!validateAll()) {
      // Find first page with errors and navigate to it
      for (let i = 0; i < pages.length; i++) {
        const pageFieldIds = pages[i].fields.map((f) => f.id);
        const hasError = pageFieldIds.some((id) => errors[id]);
        if (hasError) { setCurrentPage(i); break; }
      }
      return;
    }
    onSubmit(formData);
  };

  const isLastPage = currentPage === pages.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Register for {hackathonName}</DialogTitle>
          <DialogDescription>
            Please fill in the required information to complete your registration.
          </DialogDescription>
          {isMultiPage && (
            <div className="flex items-center gap-2 pt-2">
              {pages.map((page, i) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setCurrentPage(i)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    i === currentPage
                      ? "bg-primary text-primary-foreground"
                      : i < currentPage
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold">
                    {i + 1}
                  </span>
                  <span className="hidden sm:inline">{page.title}</span>
                </button>
              ))}
            </div>
          )}
        </DialogHeader>

        {/* Page title */}
        {isMultiPage && currentPageTitle && (
          <div className="border-b pb-3 mb-2">
            <h3 className="font-display text-base font-bold">{currentPageTitle}</h3>
            {currentPageDescription && (
              <p className="text-xs text-muted-foreground mt-0.5">{currentPageDescription}</p>
            )}
          </div>
        )}

        <div className="space-y-4 py-2">
          {currentFields.map((field) => {
            // Check conditional visibility
            if (field.conditionalOn) {
              const depValue = formData[field.conditionalOn.fieldId];
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
              if (!visible) return null;
            }

            return (
              <RegistrationField
                key={field.id}
                field={field}
                value={formData[field.id]}
                error={errors[field.id]}
                onChange={(val) => updateField(field.id, val)}
                quotaStatus={quotaStatus}
              />
            );
          })}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2 mr-auto">
            {isMultiPage && currentPage > 0 && (
              <Button type="button" variant="outline" onClick={handlePrev} disabled={isSubmitting}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            {isMultiPage && !isLastPage ? (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ClipboardList className="h-4 w-4 mr-2" />
                )}
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Individual Field Renderer ────────────────────────────

function RegistrationField({
  field,
  value,
  error,
  onChange,
  quotaStatus,
}: {
  field: FormField;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
  quotaStatus: QuotaStatus | null;
}) {
  // Check if this field is the quota-linked field
  const isQuotaField = quotaStatus?.quotaFieldId === field.id;
  const inputClasses =
    "flex w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  if (field.type === "heading") {
    return (
      <h3 className="font-display text-base font-bold pt-2">
        {field.label}
      </h3>
    );
  }

  if (field.type === "paragraph") {
    return (
      <p className="text-sm text-muted-foreground">
        {field.description || field.label}
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium flex items-center gap-1.5">
        {field.label}
        {field.required && <span className="text-destructive">*</span>}
      </label>
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}

      {/* Text / Email / Phone / URL */}
      {(field.type === "text" || field.type === "email" || field.type === "phone" || field.type === "url") && (
        <Input
          type={field.type === "phone" ? "tel" : field.type === "url" ? "url" : field.type === "email" ? "email" : "text"}
          value={String(value || "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ""}
          className={cn(error && "border-destructive")}
        />
      )}

      {/* Textarea */}
      {field.type === "textarea" && (
        <textarea
          value={String(value || "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ""}
          rows={3}
          className={cn(inputClasses, "min-h-[80px] resize-y", error && "border-destructive")}
        />
      )}

      {/* Number */}
      {field.type === "number" && (
        <Input
          type="number"
          value={value !== undefined && value !== null ? String(value) : ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
          placeholder={field.placeholder || ""}
          min={field.validation?.min}
          max={field.validation?.max}
          className={cn(error && "border-destructive")}
        />
      )}

      {/* Date */}
      {field.type === "date" && (
        <Input
          type="date"
          value={String(value || "")}
          onChange={(e) => onChange(e.target.value)}
          className={cn(error && "border-destructive")}
        />
      )}

      {/* Select */}
      {field.type === "select" && (
        <select
          value={String(value || "")}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputClasses, "appearance-none", error && "border-destructive")}
        >
          <option value="">{field.placeholder || "Select..."}</option>
          {(field.options || []).map((opt) => {
            const showFills = isQuotaField && quotaStatus?.quotaEnforcement === "registration";
            const optRejected = isQuotaField && quotaStatus?.rejected?.[opt.value];
            const optFull = showFills && !optRejected &&
              quotaStatus &&
              quotaStatus.quotas[opt.value] !== undefined &&
              (quotaStatus.fills[opt.value] || 0) >= quotaStatus.quotas[opt.value];
            const disabled = !!optRejected;
            const suffix = optRejected ? " (Not applicable)" : optFull ? " (Waitlisted)" : "";
            return (
              <option key={opt.value} value={opt.value} disabled={disabled}>
                {opt.label}{suffix}
              </option>
            );
          })}
        </select>
      )}

      {/* Multi Select */}
      {field.type === "multi_select" && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {(field.options || []).map((opt) => {
              const selected = Array.isArray(value) && (value as string[]).includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    const current = Array.isArray(value) ? (value as string[]) : [];
                    if (selected) {
                      onChange(current.filter((v) => v !== opt.value));
                    } else {
                      onChange([...current, opt.value]);
                    }
                  }}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Radio */}
      {field.type === "radio" && (
        <div className="space-y-2">
          {(field.options || []).map((opt) => {
            const showFills = isQuotaField && quotaStatus?.quotaEnforcement === "registration";
            const optRejected = isQuotaField && quotaStatus?.rejected?.[opt.value];
            const optFull = showFills && !optRejected &&
              quotaStatus &&
              quotaStatus.quotas[opt.value] !== undefined &&
              (quotaStatus.fills[opt.value] || 0) >= quotaStatus.quotas[opt.value];
            const disabled = !!optRejected;

            return (
              <label
                key={opt.value}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-all",
                  disabled
                    ? "opacity-60 cursor-not-allowed border-border bg-muted/30"
                    : "cursor-pointer hover:border-primary/30",
                  value === opt.value && !disabled && "border-primary bg-primary/5",
                  optFull && !disabled && "border-yellow-300 dark:border-yellow-800"
                )}
              >
                <input
                  type="radio"
                  name={field.id}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={(e) => onChange(e.target.value)}
                  disabled={disabled}
                  className="h-4 w-4 text-primary border-input"
                />
                <div className="flex-1 min-w-0">
                  <span className={cn("text-sm", disabled && "text-muted-foreground")}>
                    {opt.label}
                  </span>
                  {optFull && value === opt.value && (
                    <p className="text-[11px] text-yellow-600 dark:text-yellow-400 mt-0.5">
                      This option is at capacity — you will be placed on the waitlist
                    </p>
                  )}
                </div>
                {optRejected && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">
                    Not applicable
                  </Badge>
                )}
                {optFull && (
                  <Badge variant="warning" className="text-[10px] px-1.5 py-0 shrink-0">
                    Waitlisted
                  </Badge>
                )}
                {showFills && quotaStatus && quotaStatus.quotas[opt.value] !== undefined && !disabled && (
                  <span className={cn(
                    "text-[10px] font-mono shrink-0",
                    optFull ? "text-yellow-600 dark:text-yellow-400" : "text-muted-foreground"
                  )}>
                    {quotaStatus.fills[opt.value] || 0}/{quotaStatus.quotas[opt.value]}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}

      {/* Checkbox */}
      {field.type === "checkbox" && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          <span className="text-sm">{field.placeholder || field.label}</span>
        </label>
      )}

      {/* File Upload */}
      {field.type === "file" && (
        <FileUploadField
          field={field}
          value={value}
          error={error}
          onChange={onChange}
        />
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── File Upload Field ────────────────────────────────────

interface UploadedFile {
  url: string;
  publicId: string;
  originalFilename: string;
  format: string;
  bytes: number;
}

function FileUploadField({
  field,
  value,
  error,
  onChange,
}: {
  field: FormField;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const uploaded = value as UploadedFile | null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    if (field.validation?.maxFileSize && file.size > field.validation.maxFileSize) {
      toast.error(`File too large. Maximum size is ${Math.round(field.validation.maxFileSize / 1048576)}MB`);
      return;
    }

    if (field.validation?.allowedFileTypes && field.validation.allowedFileTypes.length > 0) {
      const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
      if (!field.validation.allowedFileTypes.some((t) => t.toLowerCase() === ext || file.type.includes(t.replace(".", "")))) {
        toast.error(`File type not allowed. Accepted: ${formatFileTypes(field.validation.allowedFileTypes)}`);
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "cloudhub/applications");

      const result = await new Promise<UploadedFile>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");

        xhr.upload.addEventListener("progress", (ev) => {
          if (ev.lengthComputable) {
            setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            const errMsg = JSON.parse(xhr.responseText).error || "Upload failed";
            reject(new Error(errMsg));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.send(formData);
      });

      onChange({
        url: result.url,
        publicId: result.publicId,
        originalFilename: result.originalFilename || file.name,
        format: result.format,
        bytes: result.bytes,
      });
      toast.success("File uploaded successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    onChange(null);
  };

  const acceptTypes = field.validation?.allowedFileTypes?.join(",") || undefined;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={acceptTypes}
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      {uploaded?.url ? (
        <div className={cn(
          "border rounded-xl p-3 transition-all",
          error ? "border-destructive" : "border-border"
        )}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {uploaded.format && ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(uploaded.format) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={uploaded.url} alt="" className="w-10 h-10 rounded-lg object-cover" />
              ) : (
                <FileText className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{uploaded.originalFilename}</p>
              <p className="text-xs text-muted-foreground">
                {uploaded.format?.toUpperCase()} &middot; {formatBytes(uploaded.bytes)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <a href={uploaded.url} target="_blank" rel="noopener noreferrer">
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={handleRemove}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            "w-full border border-dashed rounded-xl p-4 text-center transition-all cursor-pointer",
            "hover:border-primary/30 hover:bg-muted/30",
            error ? "border-destructive" : "border-border",
            isUploading && "opacity-60 cursor-wait"
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-6 w-6 mx-auto text-primary mb-2 animate-spin" />
              <p className="text-sm text-muted-foreground">
                Uploading... {uploadProgress}%
              </p>
              <div className="w-full max-w-xs mx-auto mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Click to upload a file
              </p>
              {field.validation?.allowedFileTypes && (
                <p className="text-xs text-muted-foreground mt-1">
                  Accepted: {formatFileTypes(field.validation.allowedFileTypes)}
                </p>
              )}
              {field.validation?.maxFileSize && (
                <p className="text-xs text-muted-foreground">
                  Max size: {Math.round(field.validation.maxFileSize / 1048576)}MB
                </p>
              )}
            </>
          )}
        </button>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
