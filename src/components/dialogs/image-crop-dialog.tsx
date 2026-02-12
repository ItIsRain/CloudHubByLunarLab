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
import { Crop, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCrop: (croppedData: string) => void;
}

const aspectRatios = [
  { label: "1:1", value: "1/1" },
  { label: "16:9", value: "16/9" },
  { label: "4:3", value: "4/3" },
  { label: "Free", value: "free" },
] as const;

export function ImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  onCrop,
}: ImageCropDialogProps) {
  const [zoom, setZoom] = useState(100);
  const [selectedRatio, setSelectedRatio] = useState<string>("1/1");

  const handleApplyCrop = () => {
    onCrop(imageSrc);
    toast.success("Image cropped successfully!");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setZoom(100);
    setSelectedRatio("1/1");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="h-5 w-5 text-primary" />
            Crop Image
          </DialogTitle>
          <DialogDescription>
            Adjust the crop area and zoom level for your image.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image preview with crop overlay */}
          <div className="relative flex items-center justify-center overflow-hidden rounded-xl border bg-muted/30 p-4">
            <div
              className="relative overflow-hidden rounded-lg"
              style={{
                width: "100%",
                maxHeight: "320px",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt="Crop preview"
                className="h-full w-full object-contain transition-transform duration-200"
                style={{
                  transform: `scale(${zoom / 100})`,
                }}
              />

              {/* Crop overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className={cn(
                    "border-2 border-dashed border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]",
                    selectedRatio === "1/1" && "h-48 w-48",
                    selectedRatio === "16/9" && "h-32 w-56",
                    selectedRatio === "4/3" && "h-40 w-52",
                    selectedRatio === "free" && "h-44 w-56"
                  )}
                >
                  {/* Corner handles */}
                  <div className="absolute -left-1 -top-1 h-3 w-3 border-l-2 border-t-2 border-white" />
                  <div className="absolute -right-1 -top-1 h-3 w-3 border-r-2 border-t-2 border-white" />
                  <div className="absolute -bottom-1 -left-1 h-3 w-3 border-b-2 border-l-2 border-white" />
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 border-b-2 border-r-2 border-white" />

                  {/* Grid lines */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="border border-white/20" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Zoom slider */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Zoom</label>
            <div className="flex items-center gap-3">
              <ZoomOut className="h-4 w-4 text-muted-foreground" />
              <input
                type="range"
                min={50}
                max={200}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
              <span className="min-w-[3rem] text-right text-sm font-mono text-muted-foreground">
                {zoom}%
              </span>
            </div>
          </div>

          {/* Aspect ratio selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Aspect Ratio</label>
            <div className="flex gap-2">
              {aspectRatios.map((ratio) => (
                <Button
                  key={ratio.value}
                  type="button"
                  variant={selectedRatio === ratio.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedRatio(ratio.value)}
                  className="flex-1"
                >
                  {ratio.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApplyCrop}
              className="flex-1"
            >
              <Crop className="mr-2 h-4 w-4" />
              Apply Crop
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
