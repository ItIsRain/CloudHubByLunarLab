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
import { Input } from "@/components/ui/input";
import { Megaphone, Bell, Clock, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface AnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (title: string, message: string, sendPush: boolean) => void;
}

export function AnnouncementDialog({
  open,
  onOpenChange,
  onSend,
}: AnnouncementDialogProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sendPush, setSendPush] = useState(false);
  const [scheduleForLater, setScheduleForLater] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [isSending, setIsSending] = useState(false);

  const isValid =
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    (!scheduleForLater || (scheduleDate.length > 0 && scheduleTime.length > 0));

  const handleSend = async () => {
    if (!isValid) return;
    setIsSending(true);
    await new Promise((r) => setTimeout(r, 1200));
    onSend(title, message, sendPush);
    setIsSending(false);
    toast.success(
      scheduleForLater ? "Announcement scheduled!" : "Announcement sent!",
      {
        description: scheduleForLater
          ? `Scheduled for ${scheduleDate} at ${scheduleTime}`
          : "All attendees have been notified.",
      }
    );
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setSendPush(false);
    setScheduleForLater(false);
    setScheduleDate("");
    setScheduleTime("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetForm();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Send Announcement
          </DialogTitle>
          <DialogDescription>
            Notify all attendees with an announcement
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              placeholder="Announcement title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <textarea
              className="flex min-h-[120px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder="Write your announcement message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/2000
            </p>
          </div>

          {/* Push notification checkbox */}
          <label className="flex items-center gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="checkbox"
              checked={sendPush}
              onChange={(e) => setSendPush(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary accent-[hsl(12,100%,55%)]"
            />
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                Send push notification
              </span>
            </div>
          </label>

          {/* Schedule for later */}
          <label className="flex items-center gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="checkbox"
              checked={scheduleForLater}
              onChange={(e) => setScheduleForLater(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary accent-[hsl(12,100%,55%)]"
            />
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                Schedule for later
              </span>
            </div>
          </label>

          {/* Schedule inputs */}
          {scheduleForLater && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Date</label>
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Time</label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Send button */}
          <Button
            className="w-full"
            disabled={!isValid || isSending}
            onClick={handleSend}
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {scheduleForLater ? "Scheduling..." : "Sending..."}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {scheduleForLater ? "Schedule Announcement" : "Send Now"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
