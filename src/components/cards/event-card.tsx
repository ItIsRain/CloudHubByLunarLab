"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Calendar, MapPin, Users, Bookmark, BookmarkCheck, Globe } from "lucide-react";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { Event } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup } from "@/components/ui/avatar";
import { useBookmarkIds, useToggleBookmark } from "@/hooks/use-bookmarks";

interface EventCardProps {
  event: Event;
  variant?: "default" | "compact" | "featured";
  className?: string;
}

export function EventCard({
  event,
  variant = "default",
  className,
}: EventCardProps) {
  const { bookmarkIds } = useBookmarkIds("event");
  const toggleBookmark = useToggleBookmark();
  const isBookmarked = bookmarkIds.has(event.id);

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleBookmark.mutate({ entityType: "event", entityId: event.id });
  };

  const isFree = event.tickets.length === 0 || event.tickets.every((t) => t.price === 0);
  const lowestPrice = event.tickets.length > 0 ? Math.min(...event.tickets.map((t) => t.price)) : 0;

  if (variant === "compact") {
    return (
      <Link href={`/events/${event.slug}`}>
        <motion.div
          whileHover={{ x: 4 }}
          className={cn(
            "flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors",
            className
          )}
        >
          <div className="relative h-16 w-16 rounded-lg overflow-hidden flex-shrink-0">
            <Image
              src={event.coverImage || "/placeholder-event.svg"}
              alt={event.title}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{event.title}</h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(event.startDate)}</span>
            </div>
          </div>
          <Badge variant={isFree ? "success" : "secondary"}>
            {isFree ? "Free" : formatCurrency(lowestPrice)}
          </Badge>
        </motion.div>
      </Link>
    );
  }

  if (variant === "featured") {
    return (
      <Link href={`/events/${event.slug}`}>
        <motion.div
          whileHover={{ y: -8 }}
          className={cn(
            "group relative rounded-3xl overflow-hidden h-[400px]",
            className
          )}
        >
          {/* Background Image */}
          <Image
            src={event.coverImage || "/placeholder-event.svg"}
            alt={event.title}
            fill
            unoptimized
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

          {/* Bookmark Button */}
          <button
            onClick={handleBookmark}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors z-10"
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-5 w-5 fill-current" />
            ) : (
              <Bookmark className="h-5 w-5" />
            )}
          </button>

          {/* Featured Badge */}
          {event.isFeatured && (
            <Badge className="absolute top-4 left-4 bg-primary/90 backdrop-blur-sm">
              Featured
            </Badge>
          )}

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="bg-white/20 text-white border-none">
                {event.category}
              </Badge>
              <Badge
                variant="secondary"
                className="bg-white/20 text-white border-none"
              >
                {event.type === "online" ? (
                  <>
                    <Globe className="h-3 w-3 mr-1" />
                    Online
                  </>
                ) : (
                  event.location.city
                )}
              </Badge>
            </div>

            <h3 className="font-display text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
              {event.title}
            </h3>

            <p className="text-white/80 text-sm mb-4 line-clamp-2">
              {event.tagline}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-white/80">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(event.startDate)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>{event.registrationCount} going</span>
                </div>
              </div>

              <Badge
                variant={isFree ? "success" : "default"}
                className="text-sm px-3 py-1"
              >
                {isFree ? "Free" : formatCurrency(lowestPrice)}
              </Badge>
            </div>
          </div>
        </motion.div>
      </Link>
    );
  }

  // Default variant
  return (
    <Link href={`/events/${event.slug}`}>
      <motion.div
        whileHover={{ y: -4 }}
        className={cn(
          "group relative rounded-2xl border bg-card overflow-hidden transition-all duration-300 hover:shadow-lg",
          className
        )}
      >
        {/* Cover Image */}
        <div className="relative h-48 overflow-hidden">
          <Image
            src={event.coverImage || "/placeholder-event.svg"}
            alt={event.title}
            fill
            unoptimized
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Bookmark Button */}
          <button
            onClick={handleBookmark}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-4 w-4 fill-current" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>

          {/* Price Badge */}
          <Badge
            variant={isFree ? "success" : "default"}
            className="absolute bottom-3 right-3"
          >
            {isFree ? "Free" : formatCurrency(lowestPrice)}
          </Badge>

          {/* Date Badge */}
          <div className="absolute bottom-3 left-3 text-white">
            <div className="text-xs uppercase font-medium opacity-80">
              {new Date(event.startDate).toLocaleDateString("en-US", { month: "short" })}
            </div>
            <div className="text-2xl font-display font-bold leading-none">
              {new Date(event.startDate).getDate()}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              {event.category}
            </Badge>
            {event.type !== "in-person" && (
              <Badge variant="muted" className="text-xs">
                <Globe className="h-3 w-3 mr-1" />
                {event.type}
              </Badge>
            )}
          </div>

          <h3 className="font-display font-bold text-lg mb-1 line-clamp-2 group-hover:text-primary transition-colors">
            {event.title}
          </h3>

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
            {event.type === "online" ? (
              <>
                <Globe className="h-3.5 w-3.5" />
                <span>Online Event</span>
              </>
            ) : (
              <>
                <MapPin className="h-3.5 w-3.5" />
                <span>
                  {event.location.city}, {event.location.country}
                </span>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-2">
              <Avatar size="xs">
                <AvatarImage src={event.organizer.avatar} />
                <AvatarFallback>
                  {event.organizer.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                {event.organizer.name}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>{event.registrationCount}</span>
            </div>
          </div>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </motion.div>
    </Link>
  );
}
