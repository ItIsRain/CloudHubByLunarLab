"use client";

import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MentorCardProps {
  mentor: {
    id: string;
    name: string;
    avatar?: string;
    headline?: string;
    expertise: string[];
    availability?: { id: string }[];
  };
  onBook?: () => void;
  className?: string;
}

export function MentorCard({ mentor, onBook, className }: MentorCardProps) {
  const hasAvailability =
    mentor.availability && mentor.availability.length > 0;

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Card
        className={cn(
          "overflow-hidden transition-shadow duration-300 hover:shadow-lg",
          className
        )}
      >
        <CardHeader className="flex flex-row items-center gap-4 pb-3">
          <Avatar size="lg">
            <AvatarImage src={mentor.avatar} alt={mentor.name} />
            <AvatarFallback>{getInitials(mentor.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-bold text-lg truncate">
              {mentor.name}
            </h3>
            {mentor.headline && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {mentor.headline}
              </p>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Expertise badges */}
          <div className="flex flex-wrap gap-1.5">
            {mentor.expertise.map((skill) => (
              <Badge key={skill} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>

          {/* Availability indicator */}
          <div className="flex items-center gap-1.5 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {hasAvailability ? (
              <span className="text-emerald-500 font-medium">
                {mentor.availability!.length} slot{mentor.availability!.length !== 1 ? "s" : ""} available
              </span>
            ) : (
              <span className="text-muted-foreground">No slots available</span>
            )}
          </div>
        </CardContent>

        <CardFooter>
          <Button
            size="sm"
            className="w-full"
            disabled={!hasAvailability}
            onClick={onBook}
          >
            Book Session
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
