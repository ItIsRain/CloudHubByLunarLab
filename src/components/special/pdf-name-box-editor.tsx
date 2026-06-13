"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { CertNameBox } from "@/hooks/use-certificate-templates";

interface PdfNameBoxEditorProps {
  /** Cloudinary (or any) URL of the PDF. */
  pdfUrl: string;
  /**
   * Current name box in PDF points (origin top-left). Provide a default the
   * first time a template is being created (e.g. centered on the page).
   */
  value: CertNameBox;
  onChange: (next: CertNameBox) => void;
  /** Sample text to render inside the box so the user can preview alignment. */
  sampleText?: string;
  /**
   * Called once with the rendered page's natural PDF size so the parent can
   * persist it on the template (the server validates name_box against it).
   */
  onPageSize?: (size: { width: number; height: number }) => void;
}

type Loaded = {
  pageWidth: number;   // PDF points
  pageHeight: number;
  renderScale: number; // canvas px per PDF pt
};

/**
 * Render the first page of a PDF and overlay a draggable / resizable
 * "name box" on top of it. Box coordinates are stored in PDF points with
 * origin at the top-left so they map 1:1 to the server-side renderer.
 *
 * pdf.js is loaded dynamically (heavy + WASM-y) so this component only
 * pulls it in on demand when the dialog opens.
 */
export function PdfNameBoxEditor({
  pdfUrl,
  value,
  onChange,
  sampleText = "Jane Doe",
  onPageSize,
}: PdfNameBoxEditorProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [drag, setDrag] = React.useState<null | {
    mode: "move" | "resize-br" | "resize-tl" | "resize-tr" | "resize-bl";
    startPx: { x: number; y: number };
    startBox: CertNameBox;
  }>(null);

  // Notify parent ONCE per pdfUrl so it can save page size on initial upload.
  const onPageSizeRef = React.useRef(onPageSize);
  React.useEffect(() => {
    onPageSizeRef.current = onPageSize;
  }, [onPageSize]);

  // Load + render the PDF.
  React.useEffect(() => {
    let cancelled = false;
    setLoaded(null);
    setError(null);

    async function render() {
      try {
        // Dynamic import — pdf.js is ~250kb and shouldn't ship in the bundle
        // for users who never open this dialog.
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        // Serve the worker from /public so we don't depend on a CDN that
        // may lag the installed pdfjs version (cdnjs frequently 404s the
        // newest minor/patch releases). The file is copied from
        // node_modules by the `postinstall` script in package.json — so a
        // version bump of pdfjs-dist automatically refreshes the worker.
        (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
          "/pdfjs/pdf.worker.min.mjs";

        const loadingTask = pdfjs.getDocument({ url: pdfUrl, withCredentials: false });
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        const page = await pdf.getPage(1);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: 1 });
        const pageWidth = viewport.width;
        const pageHeight = viewport.height;

        // Fit the canvas to the wrapper's width while honoring devicePixelRatio.
        const wrapper = wrapperRef.current;
        if (!wrapper) return;
        const wrapperWidth = wrapper.clientWidth || 700;
        const displayScale = Math.min(2.5, Math.max(0.5, wrapperWidth / pageWidth));
        const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
        const renderScale = displayScale * dpr;
        const renderViewport = page.getViewport({ scale: renderScale });

        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = renderViewport.width;
        canvas.height = renderViewport.height;
        canvas.style.width = `${renderViewport.width / dpr}px`;
        canvas.style.height = `${renderViewport.height / dpr}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Canvas 2D context unavailable");
        }

        await page.render({
          canvas,
          canvasContext: ctx,
          viewport: renderViewport,
        } as Parameters<typeof page.render>[0]).promise;

        if (cancelled) return;

        setLoaded({ pageWidth, pageHeight, renderScale: displayScale });
        onPageSizeRef.current?.({ width: pageWidth, height: pageHeight });
      } catch (err) {
        if (!cancelled) {
          console.error("PDF render failed:", err);
          setError(
            err instanceof Error
              ? `Couldn't render preview: ${err.message}`
              : "Couldn't render the PDF preview."
          );
        }
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  // Convert helpers — display px <-> PDF points
  const ptToPx = (pt: number) => pt * (loaded?.renderScale ?? 1);
  const pxToPt = (px: number) => px / (loaded?.renderScale ?? 1);

  // Drag handling
  const onPointerDown = (
    e: React.PointerEvent,
    mode: "move" | "resize-br" | "resize-tl" | "resize-tr" | "resize-bl"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({
      mode,
      startPx: { x: e.clientX, y: e.clientY },
      startBox: { ...value },
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag || !loaded) return;
    const dxPx = e.clientX - drag.startPx.x;
    const dyPx = e.clientY - drag.startPx.y;
    const dxPt = pxToPt(dxPx);
    const dyPt = pxToPt(dyPx);
    const next: CertNameBox = { ...drag.startBox };

    if (drag.mode === "move") {
      next.x = drag.startBox.x + dxPt;
      next.y = drag.startBox.y + dyPt;
    } else if (drag.mode === "resize-br") {
      next.width = drag.startBox.width + dxPt;
      next.height = drag.startBox.height + dyPt;
    } else if (drag.mode === "resize-tl") {
      next.x = drag.startBox.x + dxPt;
      next.y = drag.startBox.y + dyPt;
      next.width = drag.startBox.width - dxPt;
      next.height = drag.startBox.height - dyPt;
    } else if (drag.mode === "resize-tr") {
      next.y = drag.startBox.y + dyPt;
      next.width = drag.startBox.width + dxPt;
      next.height = drag.startBox.height - dyPt;
    } else if (drag.mode === "resize-bl") {
      next.x = drag.startBox.x + dxPt;
      next.width = drag.startBox.width - dxPt;
      next.height = drag.startBox.height + dyPt;
    }

    // Clamp inside the page
    if (next.width < 30) next.width = 30;
    if (next.height < 12) next.height = 12;
    if (next.x < 0) next.x = 0;
    if (next.y < 0) next.y = 0;
    if (next.x + next.width > loaded.pageWidth) {
      next.x = Math.max(0, loaded.pageWidth - next.width);
    }
    if (next.y + next.height > loaded.pageHeight) {
      next.y = Math.max(0, loaded.pageHeight - next.height);
    }

    onChange(next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).releasePointerCapture) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
    setDrag(null);
  };

  return (
    <div className="w-full">
      <div
        ref={wrapperRef}
        className="relative w-full overflow-hidden rounded-xl border border-input bg-muted/30"
        style={{ minHeight: 200 }}
      >
        {!loaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground gap-2 z-10">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading preview…</span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-destructive text-sm p-4 text-center z-10">
            {error}
          </div>
        )}

        <canvas ref={canvasRef} className="block select-none" />

        {loaded && (
          <div
            className={cn(
              "absolute border-2 border-primary bg-primary/10 cursor-move",
              "transition-shadow",
              drag ? "shadow-lg" : "hover:shadow-md"
            )}
            style={{
              left: ptToPx(value.x),
              top: ptToPx(value.y),
              width: ptToPx(value.width),
              height: ptToPx(value.height),
              touchAction: "none",
            }}
            onPointerDown={(e) => onPointerDown(e, "move")}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* Sample text preview, matching alignment */}
            <div
              className="absolute inset-0 flex items-center pointer-events-none px-1"
              style={{
                justifyContent:
                  value.alignment === "left"
                    ? "flex-start"
                    : value.alignment === "right"
                      ? "flex-end"
                      : "center",
              }}
            >
              <span
                style={{
                  color: value.fontColor,
                  fontSize: ptToPx(value.fontSize),
                  fontWeight: value.fontWeight === "bold" ? 700 : 400,
                  fontFamily:
                    value.fontFamily === "TimesRoman"
                      ? "Times, serif"
                      : value.fontFamily === "Courier"
                        ? "Courier, monospace"
                        : "Helvetica, Arial, sans-serif",
                  whiteSpace: "nowrap",
                  textShadow: "0 0 8px rgba(255,255,255,0.6)",
                }}
              >
                {sampleText}
              </span>
            </div>

            {/* Resize handles */}
            {(["resize-tl", "resize-tr", "resize-bl", "resize-br"] as const).map((h) => (
              <div
                key={h}
                className={cn(
                  "absolute h-3 w-3 bg-primary border-2 border-background rounded-sm",
                  h === "resize-tl" && "-left-1.5 -top-1.5 cursor-nwse-resize",
                  h === "resize-tr" && "-right-1.5 -top-1.5 cursor-nesw-resize",
                  h === "resize-bl" && "-left-1.5 -bottom-1.5 cursor-nesw-resize",
                  h === "resize-br" && "-right-1.5 -bottom-1.5 cursor-nwse-resize"
                )}
                style={{ touchAction: "none" }}
                onPointerDown={(e) => onPointerDown(e, h)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              />
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Drag the box to position the name. Drag the corners to resize.
      </p>
    </div>
  );
}
