"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

interface InviteGuestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventTitle: string;
  onInvite: (emails: string[]) => void;
}

export function InviteGuestDialog({
  open,
  onOpenChange,
  eventTitle,
  onInvite,
}: InviteGuestDialogProps) {
  const [emailText, setEmailText] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const parsedEmails = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailText
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => emailRegex.test(e));
  }, [emailText]);

  const invalidCount = useMemo(() => {
    const lines = emailText
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
    return lines.length - parsedEmails.length;
  }, [emailText, parsedEmails]);

  const handleSend = async () => {
    if (parsedEmails.length === 0) return;
    setIsSending(true);
    await new Promise((r) => setTimeout(r, 1200));
    onInvite(parsedEmails);
    setIsSending(false);
    toast.success(`${parsedEmails.length} invitation(s) sent!`, {
      description: `Guests have been invited to ${eventTitle}`,
    });
    onOpenChange(false);
    setEmailText("");
    setMessage("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setEmailText("");
          setMessage("");
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite Guests
          </DialogTitle>
          <DialogDescription>
            Send invitations to {eventTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Email Addresses
            </label>
            <textarea
              className="flex min-h-[120px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder={"Enter email addresses, one per line:\njohn@example.com\njane@example.com"}
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
            />
            <div className="flex items-center gap-2">
              {parsedEmails.length > 0 && (
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  {parsedEmails.length} valid email{parsedEmails.length !== 1 ? "s" : ""}
                </Badge>
              )}
              {invalidCount > 0 && (
                <Badge variant="destructive">
                  {invalidCount} invalid
                </Badge>
              )}
            </div>
          </div>

          {/* Optional message */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Personal Message <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder="Add a personal message to your invitation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {/* Send button */}
          <Button
            className="w-full"
            disabled={parsedEmails.length === 0 || isSending}
            onClick={handleSend}
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send {parsedEmails.length > 0 ? `${parsedEmails.length} ` : ""}Invite{parsedEmails.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
