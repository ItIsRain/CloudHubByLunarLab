"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Send, Megaphone, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn, formatDate } from "@/lib/utils";
import type { Hackathon } from "@/lib/types";
import {
  useHackathonAnnouncements,
  useSendAnnouncement,
} from "@/hooks/use-hackathon-announcements";
import { toast } from "sonner";

interface AnnouncementsTabProps {
  hackathon: Hackathon;
  hackathonId: string;
}

const textareaClasses =
  "flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[100px]";

export function AnnouncementsTab({
  hackathon,
  hackathonId,
}: AnnouncementsTabProps) {
  const { data: announcementsData, isLoading } =
    useHackathonAnnouncements(hackathonId);
  const sendAnnouncement = useSendAnnouncement();

  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");

  const announcements = announcementsData?.data ?? [];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required.");
      return;
    }

    try {
      await sendAnnouncement.mutateAsync({
        hackathonId,
        title: title.trim(),
        message: message.trim(),
      });
      toast.success(
        `Announcement sent to ${hackathon.participantCount ?? 0} participants!`
      );
      setTitle("");
      setMessage("");
    } catch {
      toast.error("Failed to send announcement.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="font-display text-2xl font-bold">Announcements</h2>
        <p className="text-sm text-muted-foreground">
          Send updates and announcements to all participants
        </p>
      </motion.div>

      {/* New Announcement Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              New Announcement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Announcement title..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your announcement message..."
                  className={textareaClasses}
                />
              </div>
              <Button
                type="submit"
                variant="gradient"
                disabled={sendAnnouncement.isPending}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {sendAnnouncement.isPending ? "Sending..." : "Send to All"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Past Announcements */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <h3 className="font-display text-lg font-semibold">
          Past Announcements
        </h3>

        {isLoading ? (
          /* Loading shimmer */
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="shimmer rounded-xl h-28 w-full" />
            ))}
          </div>
        ) : announcements.length > 0 ? (
          <div className="space-y-4">
            {announcements.map((announcement, i) => (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
              >
                <Card className="hover:shadow-sm transition-all duration-200">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Megaphone className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                          <h4 className="font-medium truncate">
                            {announcement.title}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {announcement.recipientCount} recipients
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(announcement.sentAt)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {announcement.message}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Empty State for past announcements */
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <Megaphone className="h-6 w-6 text-muted-foreground" />
              </div>
              <h4 className="font-display font-semibold mb-1">
                No Announcements Yet
              </h4>
              <p className="text-sm text-muted-foreground max-w-sm">
                Send your first announcement to keep participants informed about
                important updates.
              </p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
