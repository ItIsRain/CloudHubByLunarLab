"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MediaGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: string[];
  initialIndex?: number;
}

export function MediaGalleryDialog({
  open,
  onOpenChange,
  images,
  initialIndex = 0,
}: MediaGalleryDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Reset index when dialog opens with new initialIndex
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
    }
  }, [open, initialIndex]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onOpenChange(false);
          break;
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange, goToPrevious, goToNext]);

  if (!open || images.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col">
      {/* Dark backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3">
        {/* Image counter */}
        <span className="rounded-lg bg-black/50 px-3 py-1.5 font-mono text-sm text-white/80">
          {currentIndex + 1} / {images.length}
        </span>

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="text-white/80 hover:text-white hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Main image area */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-16">
        {/* Previous button */}
        {images.length > 1 && (
          <button
            onClick={goToPrevious}
            className={cn(
              "absolute left-4 z-20 flex h-12 w-12 items-center justify-center",
              "rounded-full bg-black/40 text-white/80 transition-all",
              "hover:bg-black/60 hover:text-white hover:scale-105",
              "focus:outline-none focus:ring-2 focus:ring-white/30"
            )}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Current image */}
        <div className="relative max-h-[70vh] max-w-full">
          <Image
            src={images[currentIndex]}
            alt={`Image ${currentIndex + 1} of ${images.length}`}
            width={1200}
            height={800}
            className="max-h-[70vh] w-auto rounded-lg object-contain shadow-2xl"
            priority
          />
        </div>

        {/* Next button */}
        {images.length > 1 && (
          <button
            onClick={goToNext}
            className={cn(
              "absolute right-4 z-20 flex h-12 w-12 items-center justify-center",
              "rounded-full bg-black/40 text-white/80 transition-all",
              "hover:bg-black/60 hover:text-white hover:scale-105",
              "focus:outline-none focus:ring-2 focus:ring-white/30"
            )}
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="relative z-10 flex items-center justify-center gap-2 px-4 py-4">
          <div className="flex gap-2 overflow-x-auto rounded-xl bg-black/40 p-2 max-w-[90vw]">
            {images.map((src, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "relative h-14 w-14 shrink-0 overflow-hidden rounded-lg transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-white/30",
                  index === currentIndex
                    ? "ring-2 ring-white opacity-100 scale-105"
                    : "opacity-50 hover:opacity-80"
                )}
                aria-label={`Go to image ${index + 1}`}
              >
                <Image
                  src={src}
                  alt={`Thumbnail ${index + 1}`}
                  width={56}
                  height={56}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
