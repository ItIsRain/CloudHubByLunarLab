"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Trophy, Users, Clock, Bookmark, BookmarkCheck, Globe, Zap } from "lucide-react";
import { cn, formatCurrency, getTimeRemaining } from "@/lib/utils";
import { Hackathon } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface HackathonCardProps {
  hackathon: Hackathon;
  variant?: "default" | "compact" | "featured";
  onBookmark?: (id: string) => void;
  className?: string;
}

const statusConfig: Record<string, { label: string; variant: "muted" | "success" | "warning" | "gradient" | "secondary"; dot?: boolean; pulse?: boolean }> = {
  "draft": { label: "Draft", variant: "muted" },
  "registration-open": { label: "Registration Open", variant: "success", dot: true },
  "registration-closed": { label: "Registration Closed", variant: "warning" },
  "hacking": { label: "Hacking in Progress", variant: "gradient", dot: true, pulse: true },
  "submission": { label: "Submissions Open", variant: "warning", dot: true },
  "judging": { label: "Judging", variant: "secondary" },
  "completed": { label: "Completed", variant: "muted" },
};

function CountdownTimer({ deadline }: { deadline: string }) {
  const [mounted, setMounted] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });

  React.useEffect(() => {
    setMounted(true);
    setTimeLeft(getTimeRemaining(deadline));

    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining(deadline));
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (!mounted) {
    return (
      <div className="flex items-center gap-1 text-sm font-mono">
        <span className="bg-black/20 px-1.5 py-0.5 rounded">--h</span>
        <span className="bg-black/20 px-1.5 py-0.5 rounded">--m</span>
      </div>
    );
  }

  if (timeLeft.total <= 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-sm font-mono">
      {timeLeft.days > 0 && (
        <span className="bg-black/20 px-1.5 py-0.5 rounded">{timeLeft.days}d</span>
      )}
      <span className="bg-black/20 px-1.5 py-0.5 rounded">
        {String(timeLeft.hours).padStart(2, "0")}h
      </span>
      <span className="bg-black/20 px-1.5 py-0.5 rounded">
        {String(timeLeft.minutes).padStart(2, "0")}m
      </span>
      {timeLeft.days === 0 && (
        <span className="bg-black/20 px-1.5 py-0.5 rounded">
          {String(timeLeft.seconds).padStart(2, "0")}s
        </span>
      )}
    </div>
  );
}

export function HackathonCard({
  hackathon,
  variant = "default",
  onBookmark,
  className,
}: HackathonCardProps) {
  const [isBookmarked, setIsBookmarked] = React.useState(hackathon.isBookmarked);
  const status = statusConfig[hackathon.status];

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsBookmarked(!isBookmarked);
    onBookmark?.(hackathon.id);
  };

  const getDeadline = () => {
    switch (hackathon.status) {
      case "registration-open":
        return hackathon.registrationEnd;
      case "hacking":
      case "submission":
        return hackathon.submissionDeadline;
      default:
        return null;
    }
  };

  const deadline = getDeadline();

  if (variant === "featured") {
    return (
      <Link href={`/hackathons/${hackathon.slug}`}>
        <motion.div
          whileHover={{ y: -8 }}
          className={cn(
            "group relative rounded-3xl overflow-hidden h-[450px]",
            className
          )}
        >
          {/* Background Image */}
          <Image
            src={hackathon.coverImage || "/placeholder-hackathon.jpg"}
            alt={hackathon.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/20" />

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

          {/* Status Badge */}
          <div className="absolute top-4 left-4">
            <Badge
              variant={status.variant}
              dot={status.dot}
              pulse={status.pulse}
              className="text-sm"
            >
              {status.label}
            </Badge>
          </div>

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            {/* Logo */}
            {hackathon.logo && (
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4 overflow-hidden">
                <Image
                  src={hackathon.logo}
                  alt={hackathon.name}
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </div>
            )}

            <h3 className="font-display text-3xl font-bold mb-2 group-hover:text-primary transition-colors">
              {hackathon.name}
            </h3>

            <p className="text-white/80 text-sm mb-4 line-clamp-2">
              {hackathon.tagline}
            </p>

            {/* Stats Row */}
            <div className="flex items-center gap-6 text-sm text-white/80 mb-4">
              <div className="flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-yellow-400" />
                <span className="font-semibold text-white">
                  {formatCurrency(hackathon.totalPrizePool)}
                </span>
                <span>in prizes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>{hackathon.participantCount} participants</span>
              </div>
            </div>

            {/* Countdown or CTA */}
            <div className="flex items-center justify-between">
              {deadline && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <CountdownTimer deadline={deadline} />
                </div>
              )}

              <div className="flex -space-x-2">
                {hackathon.sponsors.slice(0, 4).map((sponsor) => (
                  <div
                    key={sponsor.id}
                    className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30"
                  >
                    <Image
                      src={sponsor.logo}
                      alt={sponsor.name}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  </div>
                ))}
                {hackathon.sponsors.length > 4 && (
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 text-xs font-semibold">
                    +{hackathon.sponsors.length - 4}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Animated glow effect for active hackathons */}
          {hackathon.status === "hacking" && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary via-accent to-primary animate-pulse" />
            </div>
          )}
        </motion.div>
      </Link>
    );
  }

  // Default variant
  return (
    <Link href={`/hackathons/${hackathon.slug}`}>
      <motion.div
        whileHover={{ y: -4 }}
        className={cn(
          "group relative rounded-2xl border bg-card overflow-hidden transition-all duration-300 hover:shadow-lg",
          className
        )}
      >
        {/* Cover Image */}
        <div className="relative h-44 overflow-hidden">
          <Image
            src={hackathon.coverImage || "/placeholder-hackathon.jpg"}
            alt={hackathon.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

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

          {/* Status Badge */}
          <Badge
            variant={status.variant}
            dot={status.dot}
            pulse={status.pulse}
            className="absolute top-3 left-3"
          >
            {status.label}
          </Badge>

          {/* Prize Pool */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white">
            <Trophy className="h-4 w-4 text-yellow-400" />
            <span className="font-display font-bold">
              {formatCurrency(hackathon.totalPrizePool)}
            </span>
          </div>

          {/* Countdown */}
          {deadline && (
            <div className="absolute bottom-3 right-3 text-white">
              <CountdownTimer deadline={deadline} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              {hackathon.category}
            </Badge>
            <Badge variant="muted" className="text-xs">
              <Globe className="h-3 w-3 mr-1" />
              {hackathon.type}
            </Badge>
          </div>

          <h3 className="font-display font-bold text-lg mb-1 line-clamp-1 group-hover:text-primary transition-colors">
            {hackathon.name}
          </h3>

          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {hackathon.tagline}
          </p>

          {/* Tech Tags */}
          <div className="flex flex-wrap gap-1 mb-3">
            {hackathon.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {hackathon.tags.length > 3 && (
              <span className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground">
                +{hackathon.tags.length - 3}
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>{hackathon.participantCount} participants</span>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Zap className="h-3.5 w-3.5" />
              <span>{hackathon.teamCount} teams</span>
            </div>
          </div>
        </div>

        {/* Active indicator */}
        {hackathon.status === "hacking" && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent" />
        )}
      </motion.div>
    </Link>
  );
}
