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
import { Send, Clock, Eye, EyeOff, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NewsletterComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityName: string;
  onSend: (subject: string, content: string) => void;
}

export function NewsletterComposeDialog({
  open,
  onOpenChange,
  communityName,
  onSend,
}: NewsletterComposeDialogProps) {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const handleSendNow = () => {
    if (!subject.trim()) {
      toast.error("Please enter a subject line");
      return;
    }
    if (!content.trim()) {
      toast.error("Please enter newsletter content");
      return;
    }
    onSend(subject.trim(), content.trim());
    toast.success("Newsletter sent successfully!");
    setSubject("");
    setContent("");
    onOpenChange(false);
  };

  const handleSchedule = () => {
    if (!subject.trim() || !content.trim()) {
      toast.error("Please fill in all fields before scheduling");
      return;
    }
    toast.success("Newsletter scheduled for later!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Compose Newsletter
          </DialogTitle>
          <DialogDescription>
            Send a newsletter to the {communityName} community.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient info */}
          <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Sending to{" "}
              <span className="font-semibold text-foreground">
                5,420 subscribers
              </span>
            </span>
          </div>

          {/* Preview toggle */}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? (
                <>
                  <EyeOff className="mr-1.5 h-4 w-4" />
                  Edit
                </>
              ) : (
                <>
                  <Eye className="mr-1.5 h-4 w-4" />
                  Preview
                </>
              )}
            </Button>
          </div>

          {showPreview ? (
            /* Preview mode */
            <div className="space-y-3 rounded-xl border bg-background p-6">
              <div className="border-b pb-3">
                <p className="text-xs text-muted-foreground">Subject</p>
                <h3 className="font-display text-lg font-bold">
                  {subject || "(No subject)"}
                </h3>
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {content || "(No content)"}
                </p>
              </div>
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground">
                  Sent by {communityName} via CloudHub
                </p>
              </div>
            </div>
          ) : (
            /* Edit mode */
            <>
              {/* Subject */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Input
                  placeholder="Enter newsletter subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your newsletter content here..."
                  rows={8}
                  className={cn(
                    "flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm",
                    "ring-offset-background transition-all duration-200 resize-y",
                    "placeholder:text-muted-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  )}
                />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSchedule}
              className="flex-1"
            >
              <Clock className="mr-2 h-4 w-4" />
              Schedule
            </Button>
            <Button
              type="button"
              onClick={handleSendNow}
              className="flex-1"
            >
              <Send className="mr-2 h-4 w-4" />
              Send Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
