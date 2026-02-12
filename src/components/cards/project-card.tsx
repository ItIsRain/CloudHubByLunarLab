"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Submission } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface ProjectCardProps {
  submission: Submission;
  className?: string;
}

const statusVariant: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "muted"
> = {
  draft: "muted",
  submitted: "secondary",
  "under-review": "warning",
  scored: "default",
  winner: "success",
};

export function ProjectCard({ submission, className }: ProjectCardProps) {
  const displayedTech = submission.techStack.slice(0, 3);
  const remainingTech = submission.techStack.length - 3;

  return (
    <Link href={`/dashboard/submissions/${submission.id}`}>
      <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
        <Card
          className={cn(
            "overflow-hidden transition-shadow duration-300 hover:shadow-lg",
            className
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-display font-bold text-lg truncate">
                  {submission.projectName}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                  {submission.tagline}
                </p>
              </div>
              <Badge variant={statusVariant[submission.status] ?? "muted"}>
                {submission.status}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Team name */}
            <p className="text-sm text-muted-foreground">
              by{" "}
              <span className="font-medium text-foreground">
                {submission.team.name}
              </span>
            </p>

            {/* Tech stack badges */}
            <div className="flex flex-wrap gap-1.5">
              {displayedTech.map((tech) => (
                <Badge key={tech} variant="outline" className="text-xs">
                  {tech}
                </Badge>
              ))}
              {remainingTech > 0 && (
                <Badge variant="muted" className="text-xs">
                  +{remainingTech}
                </Badge>
              )}
            </div>

            {/* Upvotes */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground pt-1">
              <ThumbsUp
                className={cn(
                  "h-4 w-4",
                  submission.isUpvoted && "fill-primary text-primary"
                )}
              />
              <span className="font-medium">{submission.upvotes}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}
