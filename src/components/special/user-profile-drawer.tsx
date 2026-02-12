"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  MessageSquare,
  ExternalLink,
  Calendar,
  Trophy,
  User,
} from "lucide-react";
import { cn, getInitials, getAvatarUrl } from "@/lib/utils";
import { toast } from "sonner";

interface UserProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    name: string;
    username: string;
    avatar?: string;
    headline?: string;
    skills: string[];
  };
}

export function UserProfileDrawer({
  open,
  onOpenChange,
  user,
}: UserProfileDrawerProps) {
  const handleSendMessage = () => {
    toast.success(`Message dialog opened for ${user.name}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed right-0 top-0 z-50 h-full w-full max-w-sm",
              "border-l bg-background shadow-2xl"
            )}
          >
            {/* Close button */}
            <div className="flex justify-end px-4 pt-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Profile content */}
            <div className="flex flex-col items-center px-6 pb-6">
              {/* Avatar */}
              <div className="relative mb-4">
                <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-primary/20 shadow-lg">
                  {user.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={user.name}
                      width={96}
                      height={96}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-accent">
                      <span className="font-display text-2xl font-bold text-white">
                        {getInitials(user.name)}
                      </span>
                    </div>
                  )}
                </div>
                {/* Online indicator */}
                <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-background bg-success" />
              </div>

              {/* Name and username */}
              <h3 className="font-display text-xl font-bold">{user.name}</h3>
              <p className="text-sm text-muted-foreground">@{user.username}</p>

              {/* Headline */}
              {user.headline && (
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  {user.headline}
                </p>
              )}

              {/* Stats */}
              <div className="mt-5 flex w-full gap-3">
                <div className="flex flex-1 flex-col items-center rounded-xl border bg-muted/20 py-3">
                  <Calendar className="mb-1 h-4 w-4 text-primary" />
                  <span className="font-display text-lg font-bold">5</span>
                  <span className="text-xs text-muted-foreground">Events</span>
                </div>
                <div className="flex flex-1 flex-col items-center rounded-xl border bg-muted/20 py-3">
                  <Trophy className="mb-1 h-4 w-4 text-primary" />
                  <span className="font-display text-lg font-bold">3</span>
                  <span className="text-xs text-muted-foreground">
                    Hackathons
                  </span>
                </div>
              </div>

              {/* Skills */}
              {user.skills.length > 0 && (
                <div className="mt-5 w-full space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {user.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="text-xs"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex w-full flex-col gap-2">
                <Button
                  type="button"
                  onClick={handleSendMessage}
                  className="w-full"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  asChild
                  className="w-full"
                >
                  <Link
                    href={`/profile/${user.username}`}
                    onClick={() => onOpenChange(false)}
                  >
                    <User className="mr-2 h-4 w-4" />
                    View Full Profile
                    <ExternalLink className="ml-auto h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
