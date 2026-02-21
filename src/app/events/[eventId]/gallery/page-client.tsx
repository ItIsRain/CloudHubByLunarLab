"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  X,
  ChevronLeft,
  ChevronRight,
  Upload,
  ImageIcon,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEvent } from "@/hooks/use-events";

const galleryImages = Array.from({ length: 12 }, (_, i) => ({
  id: `img-${i + 1}`,
  src: `https://images.unsplash.com/photo-${1540575467063 + (i + 1) * 37000}-178a50c2df87?w=600&h=${400 + (i % 3) * 100}&fit=crop`,
  alt: `Event photo ${i + 1}`,
  width: 600,
  height: 400 + (i % 3) * 100,
}));

export default function GalleryPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const { data: eventData, isLoading } = useEvent(eventId);
  const event = eventData?.data;

  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="h-8 w-48 rounded shimmer" />
            <div className="h-10 w-64 rounded shimmer" />
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 rounded-2xl shimmer break-inside-avoid" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!event) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-24"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
              </div>
              <h1 className="font-display text-3xl font-bold mb-4">Event Not Found</h1>
              <p className="text-muted-foreground mb-8">
                The event you are looking for does not exist or has been removed.
              </p>
              <Button asChild>
                <Link href="/explore">Browse Events</Link>
              </Button>
            </motion.div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const goNext = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % galleryImages.length);
    }
  };

  const goPrev = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex(
        (lightboxIndex - 1 + galleryImages.length) % galleryImages.length
      );
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <Link
              href={`/events/${event.slug}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {event.title}
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10"
          >
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">
                Photo Gallery
              </h1>
              <p className="text-muted-foreground">
                {galleryImages.length} photos from {event.title}
              </p>
            </div>
            <Button
              onClick={() =>
                toast.success("Upload feature coming soon! Thanks for contributing.")
              }
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Photo
            </Button>
          </motion.div>

          {/* Masonry Grid */}
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {galleryImages.map((image, i) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="break-inside-avoid"
              >
                <div
                  className="group relative overflow-hidden rounded-2xl border bg-muted cursor-pointer"
                  onClick={() => openLightbox(i)}
                  style={{
                    aspectRatio: `${image.width} / ${image.height}`,
                  }}
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                    <Camera className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
      <Footer />

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={closeLightbox}
          >
            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>

            {/* Navigation */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-4 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-4 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </button>

            {/* Image */}
            <motion.div
              key={lightboxIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-[80vh] w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={galleryImages[lightboxIndex].src}
                alt={galleryImages[lightboxIndex].alt}
                width={1200}
                height={800}
                className="object-contain w-full h-full rounded-xl"
              />
              <p className="text-center text-white/60 text-sm mt-4">
                {lightboxIndex + 1} / {galleryImages.length}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
