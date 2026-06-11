"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileText, Upload, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, safeHref } from "@/lib/utils";
import type { FormField } from "@/lib/types";

interface UploadedFile {
  url: string;
  publicId: string;
  originalFilename?: string;
  format?: string;
  bytes?: number;
}

function formatBytes(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Map the MIME types organizers pick to their file extensions, so we can
// validate a chosen file even when the browser reports a missing or generic
// type (common for .pptx / .docx / .xlsx).
const MIME_TO_EXT: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "text/plain": [".txt"],
  "text/csv": [".csv"],
  "application/zip": [".zip"],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
};

/**
 * Robustly decide whether a file satisfies the field's allowed types. Handles
 * exact MIME matches, "image/*"-style wildcards, bare extension entries
 * (".pptx"), and — crucially — falls back to the file extension when the
 * browser reports an empty or generic MIME type.
 */
function fileMatchesAllowed(file: File, allowed?: string[]): boolean {
  if (!allowed?.length) return true;
  const name = file.name.toLowerCase();
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot) : "";
  const type = (file.type || "").toLowerCase();

  return allowed.some((raw) => {
    const t = raw.toLowerCase().trim();
    if (!t) return false;
    if (t.startsWith(".")) return ext === t; // bare extension entry
    if (t.endsWith("/*")) {
      const prefix = t.slice(0, t.indexOf("/") + 1); // e.g. "image/"
      if (type.startsWith(prefix)) return true;
      const exts = Object.entries(MIME_TO_EXT)
        .filter(([m]) => m.startsWith(prefix))
        .flatMap(([, e]) => e);
      return exts.includes(ext);
    }
    if (type === t) return true; // exact MIME match
    return (MIME_TO_EXT[t] || []).includes(ext); // MIME → extension fallback
  });
}

function formatFileTypes(types: string[]): string {
  return types
    .map((t) => {
      if (t === "application/pdf") return "PDF";
      if (t === "image/*") return "Images";
      if (t.includes("wordprocessingml")) return "DOCX";
      if (t.includes("presentationml")) return "PPTX";
      return t;
    })
    .join(", ");
}

const inputClasses =
  "flex w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

// ── File upload sub-field ──────────────────────────────────────────

function FileUploadField({
  field,
  value,
  onChange,
  uploadFolder,
}: {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  uploadFolder: string;
}) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const uploaded = value as UploadedFile | null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field.validation?.maxFileSize && file.size > field.validation.maxFileSize) {
      toast.error(
        `File too large. Maximum size is ${Math.round(field.validation.maxFileSize / 1_048_576)}MB`
      );
      return;
    }

    if (field.validation?.allowedFileTypes?.length) {
      if (!fileMatchesAllowed(file, field.validation.allowedFileTypes)) {
        toast.error(
          `File type not allowed. Accepted: ${formatFileTypes(field.validation.allowedFileTypes)}`
        );
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", uploadFolder);

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
            const errMsg =
              JSON.parse(xhr.responseText).error || "Upload failed";
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
      toast.success("File uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = () => onChange(null);
  const acceptTypes = field.validation?.allowedFileTypes?.join(",") || undefined;

  return (
    <div className="space-y-2">
      {uploaded?.url ? (
        <div className="rounded-xl border border-border p-3 flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <a
              href={safeHref(uploaded.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline truncate block"
            >
              {uploaded.originalFilename || "Uploaded file"}
            </a>
            {uploaded.bytes ? (
              <p className="text-xs text-muted-foreground">{formatBytes(uploaded.bytes)}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-muted-foreground hover:text-destructive p-1 shrink-0"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 text-center cursor-pointer hover:border-primary/50 transition-colors",
            isUploading && "pointer-events-none opacity-70"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={acceptTypes}
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
          />
          {isUploading ? (
            <>
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
              <p className="text-sm font-medium">Uploading… {uploadProgress}%</p>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">Click to upload</p>
              {field.validation?.allowedFileTypes?.length ? (
                <p className="text-[11px] text-muted-foreground">
                  {formatFileTypes(field.validation.allowedFileTypes)}
                  {field.validation.maxFileSize
                    ? ` · up to ${Math.round(field.validation.maxFileSize / 1_048_576)}MB`
                    : ""}
                </p>
              ) : field.validation?.maxFileSize ? (
                <p className="text-[11px] text-muted-foreground">
                  Up to {Math.round(field.validation.maxFileSize / 1_048_576)}MB
                </p>
              ) : null}
            </>
          )}
        </label>
      )}
    </div>
  );
}

// ── Main custom field renderer ─────────────────────────────────────

export function CustomFormField({
  field,
  value,
  error,
  onChange,
  uploadFolder = "cloudhub/submissions",
}: {
  field: FormField;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
  /** Cloudinary folder for any file fields. Defaults to submissions. */
  uploadFolder?: string;
}) {
  if (field.type === "heading") {
    return <h3 className="font-display text-base font-bold pt-2">{field.label}</h3>;
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

      {(field.type === "text" ||
        field.type === "email" ||
        field.type === "phone" ||
        field.type === "url") && (
        <Input
          type={
            field.type === "phone"
              ? "tel"
              : field.type === "url"
                ? "url"
                : field.type === "email"
                  ? "email"
                  : "text"
          }
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ""}
          className={cn(error && "border-destructive")}
        />
      )}

      {field.type === "textarea" && (
        <textarea
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ""}
          rows={3}
          className={cn(
            inputClasses,
            "min-h-[80px] resize-y",
            error && "border-destructive"
          )}
        />
      )}

      {field.type === "number" && (
        <Input
          type="number"
          value={value !== undefined && value !== null ? String(value) : ""}
          onChange={(e) =>
            onChange(e.target.value ? Number(e.target.value) : "")
          }
          placeholder={field.placeholder || ""}
          min={field.validation?.min}
          max={field.validation?.max}
          className={cn(error && "border-destructive")}
        />
      )}

      {field.type === "date" && (
        <Input
          type="date"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className={cn(error && "border-destructive")}
        />
      )}

      {field.type === "select" && (
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            inputClasses,
            "appearance-none",
            error && "border-destructive"
          )}
        >
          <option value="">{field.placeholder || "Select..."}</option>
          {(field.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {field.type === "multi_select" && (
        <div className="flex flex-wrap gap-1.5">
          {(field.options || []).map((opt) => {
            const selected =
              Array.isArray(value) && (value as string[]).includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const current = Array.isArray(value)
                    ? (value as string[])
                    : [];
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
      )}

      {field.type === "radio" && (
        <div className="space-y-2">
          {(field.options || []).map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-all hover:border-primary/30",
                value === opt.value && "border-primary bg-primary/5"
              )}
            >
              <input
                type="radio"
                name={field.id}
                value={opt.value}
                checked={value === opt.value}
                onChange={(e) => onChange(e.target.value)}
                className="h-4 w-4 text-primary border-input"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      )}

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

      {field.type === "file" && (
        <FileUploadField
          field={field}
          value={value}
          onChange={onChange}
          uploadFolder={uploadFolder}
        />
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── Group renderer (handles sections + ordered fields) ─────────────

export function CustomFormFields({
  fields,
  values,
  errors,
  onChange,
  uploadFolder,
}: {
  fields: FormField[];
  values: Record<string, unknown>;
  errors?: Record<string, string>;
  onChange: (fieldId: string, value: unknown) => void;
  uploadFolder?: string;
}) {
  // Sort by `order` so rendering matches the form builder's layout
  const sortedFields = React.useMemo(
    () =>
      [...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [fields]
  );

  return (
    <div className="space-y-4">
      {sortedFields.map((field) => (
        <CustomFormField
          key={field.id}
          field={field}
          value={values[field.id]}
          error={errors?.[field.id]}
          onChange={(value) => onChange(field.id, value)}
          uploadFolder={uploadFolder}
        />
      ))}
    </div>
  );
}

// Re-export Badge helper for callers that want a "file uploaded" badge etc.
export { Badge };
