"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  label?: string;
  description?: string;
  accept?: Record<string, string[]>;
  maxSize?: number;
  aspectRatio?: "square" | "video" | "banner";
  className?: string;
  /**
   * When set, uploads the selected file to Cloudinary via /api/upload and
   * stores the resulting secure URL. The folder must be one of the server's
   * ALLOWED_FOLDERS (e.g. "cloudhub/uploads", "cloudhub/hackathons"). When
   * omitted, the component falls back to embedding a data URL — keeping
   * legacy behavior for callers that haven't opted into CDN upload.
   */
  folder?: string;
}

const defaultDescriptions: Record<string, string> = {
  square: "Recommended: 512 × 512px. PNG, JPG or WebP, max 5MB.",
  video: "Recommended: 1920 × 1080px (16:9). PNG, JPG or WebP, max 5MB.",
  banner: "Recommended: 1920 × 640px (3:1). PNG, JPG or WebP, max 5MB.",
};

export function ImageUpload({
  value,
  onChange,
  onRemove,
  label = "Upload Image",
  description,
  maxSize = 5 * 1024 * 1024,
  aspectRatio = "banner",
  className,
  folder,
}: ImageUploadProps) {
  const resolvedDescription = description || defaultDescriptions[aspectRatio] || defaultDescriptions.banner;
  const [preview, setPreview] = useState<string | null>(value || null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Sync preview when value changes externally (e.g. switching to edit mode)
  useEffect(() => {
    setPreview(value || null);
  }, [value]);

  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    banner: "aspect-[3/1]",
  };

  const uploadToCdn = useCallback(
    (file: File, localPreview: string) =>
      new Promise<string>((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file);
        if (folder) formData.append("folder", folder);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");

        xhr.upload.addEventListener("progress", (ev) => {
          if (ev.lengthComputable) {
            setProgress(Math.round((ev.loaded / ev.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data?.url) {
                resolve(data.url as string);
              } else {
                reject(new Error("Upload response missing URL"));
              }
            } catch {
              reject(new Error("Invalid upload response"));
            }
          } else {
            let message = "Upload failed";
            try {
              const data = JSON.parse(xhr.responseText);
              if (data?.error) message = data.error;
            } catch {
              // Response wasn't JSON — use generic message. We void the
              // fallback preview to let the caller re-pick the file.
              void localPreview;
            }
            reject(new Error(message));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network error during upload"));
        });

        xhr.send(formData);
      }),
    [folder]
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError(null);
      const file = acceptedFiles[0];
      if (!file) return;

      if (file.size > maxSize) {
        setError(`File too large. Max size is ${Math.round(maxSize / 1024 / 1024)}MB.`);
        return;
      }

      // Show a local preview immediately using a data URL so the user sees
      // the image while the CDN upload runs in the background.
      const reader = new FileReader();
      const localPreview = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      }).catch((err: Error) => {
        setError(err.message);
        return "";
      });

      if (!localPreview) return;
      setPreview(localPreview);

      // Legacy behavior: no folder prop → stash the data URL directly.
      if (!folder) {
        onChange(localPreview);
        return;
      }

      setIsUploading(true);
      setProgress(0);
      try {
        const url = await uploadToCdn(file, localPreview);
        setPreview(url);
        onChange(url);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        // Roll back the preview so the user can retry.
        setPreview(null);
        onChange("");
      } finally {
        setIsUploading(false);
        setProgress(0);
      }
    },
    [folder, maxSize, onChange, uploadToCdn]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 1,
    multiple: false,
    disabled: isUploading,
  });

  const handleRemove = useCallback(() => {
    setPreview(null);
    setError(null);
    onRemove?.();
    onChange("");
  }, [onChange, onRemove]);

  return (
    <div className={cn("space-y-2", className)}>
      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "relative rounded-xl overflow-hidden border border-border",
              aspectClasses[aspectRatio]
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Preview"
              className="h-full w-full object-cover"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 text-white">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p className="text-xs font-medium">Uploading… {progress}%</p>
              </div>
            )}
            {!isUploading && (
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Remove
                </Button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              {...getRootProps()}
              className={cn(
                "relative rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200",
                aspectClasses[aspectRatio],
                "flex flex-col items-center justify-center gap-3 p-6",
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50",
                isUploading && "cursor-not-allowed opacity-70"
              )}
            >
              <input {...getInputProps()} />
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                  isDragActive
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : isDragActive ? (
                  <Upload className="h-6 w-6" />
                ) : (
                  <ImageIcon className="h-6 w-6" />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">
                  {isUploading ? `Uploading… ${progress}%` : label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {resolvedDescription}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
