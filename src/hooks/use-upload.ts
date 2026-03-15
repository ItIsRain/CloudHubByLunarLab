import * as React from "react";

interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  resourceType: string;
  bytes: number;
  width?: number;
  height?: number;
  originalFilename: string;
}

interface UseUploadOptions {
  folder?: string;
  context?: string;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: string) => void;
}

export function useUpload(options: UseUploadOptions = {}) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const upload = React.useCallback(
    async (file: File): Promise<UploadResult | null> => {
      setIsUploading(true);
      setProgress(0);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        if (options.folder) formData.append("folder", options.folder);
        if (options.context) formData.append("context", options.context);

        // Use XMLHttpRequest for progress tracking
        const result = await new Promise<UploadResult>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/upload");

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded / e.total) * 100));
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } else {
              const errData = JSON.parse(xhr.responseText).error || "Upload failed";
              reject(new Error(errData));
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Network error during upload"));
          });

          xhr.send(formData);
        });

        setProgress(100);
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        options.onError?.(message);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [options]
  );

  return { upload, isUploading, progress, error };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
