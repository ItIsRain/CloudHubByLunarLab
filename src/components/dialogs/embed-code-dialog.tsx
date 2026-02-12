"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Code, Copy, Check, Monitor } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EmbedCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  url: string;
}

const sizeOptions = [
  { label: "Small", width: 400, height: 300 },
  { label: "Medium", width: 600, height: 400 },
  { label: "Large", width: 800, height: 600 },
] as const;

export function EmbedCodeDialog({
  open,
  onOpenChange,
  title,
  url,
}: EmbedCodeDialogProps) {
  const [selectedSize, setSelectedSize] = useState(1);
  const [copied, setCopied] = useState(false);

  const { width, height } = sizeOptions[selectedSize];

  const embedCode = `<iframe src="${url}" width="${width}" height="${height}" frameborder="0" title="${title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media" allowfullscreen></iframe>`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success("Embed code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5 text-primary" />
            Embed Code
          </DialogTitle>
          <DialogDescription>
            Copy the embed code to add &ldquo;{title}&rdquo; to your website.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Size options */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Size</label>
            <div className="flex gap-2">
              {sizeOptions.map((option, index) => (
                <Button
                  key={option.label}
                  type="button"
                  variant={selectedSize === index ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSize(index)}
                  className="flex-1"
                >
                  <Monitor className="mr-1.5 h-3.5 w-3.5" />
                  {option.label}
                  <span className="ml-1 text-xs opacity-70">
                    {option.width}x{option.height}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Embed code preview */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Embed Code</label>
            <div className="relative">
              <pre
                className={cn(
                  "overflow-x-auto rounded-xl border bg-muted p-4",
                  "font-mono text-xs leading-relaxed text-foreground",
                  "max-h-32 scrollbar-thin"
                )}
              >
                <code className="break-all whitespace-pre-wrap">
                  {embedCode}
                </code>
              </pre>
            </div>
          </div>

          {/* Copy button */}
          <Button
            type="button"
            onClick={handleCopy}
            className="w-full"
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Embed Code
              </>
            )}
          </Button>

          {/* Preview area */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Preview</label>
            <div
              className={cn(
                "flex items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/20 transition-all"
              )}
              style={{
                height: Math.min(height * 0.5, 200),
              }}
            >
              <div className="text-center">
                <div
                  className="mx-auto mb-2 rounded-lg border bg-background shadow-sm"
                  style={{
                    width: width * 0.3,
                    height: height * 0.3,
                    maxWidth: "100%",
                    maxHeight: 120,
                  }}
                >
                  <div className="flex h-full flex-col items-center justify-center gap-1 p-2">
                    <Code className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      {width} x {height}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Embed preview at {width}x{height}px
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
