"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Send,
  Mail,
  Clock,
  Users,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type { Event } from "@/lib/types";
import {
  useEventEmails,
  useSendEventEmail,
} from "@/hooks/use-event-guests";
import { toast } from "sonner";

interface EmailsTabProps {
  event: Event;
  eventId: string;
}

const selectClasses =
  "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary appearance-none";

const templates = [
  {
    name: "Welcome",
    subject: "Welcome to {event}!",
    body: "Thank you for registering for {event}! We're excited to have you join us.\n\nHere are the details:\n- Date: {date}\n- Location: {location}\n\nSee you there!",
  },
  {
    name: "Reminder",
    subject: "Reminder: {event} is coming up!",
    body: "This is a friendly reminder that {event} is just around the corner!\n\nMake sure you have everything ready. Check-in will open 30 minutes before the event starts.\n\nWe look forward to seeing you!",
  },
  {
    name: "Thank You",
    subject: "Thank you for attending {event}!",
    body: "Thank you for attending {event}! We hope you had a great time.\n\nWe'd love to hear your feedback. If you have any thoughts or suggestions, please don't hesitate to reach out.\n\nSee you at the next event!",
  },
];

export function EmailsTab({ event, eventId }: EmailsTabProps) {
  const { data: emailsData, isLoading } = useEventEmails(eventId);
  const sendEmail = useSendEventEmail();

  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [recipientFilter, setRecipientFilter] = React.useState("all");

  const emails = emailsData?.data ?? [];

  const interpolate = (text: string) =>
    text
      .replace(/\{event\}/g, event.title)
      .replace(/\{date\}/g, formatDate(event.startDate))
      .replace(
        /\{location\}/g,
        event.location.city || event.location.address || "Online"
      );

  const handleApplyTemplate = (template: (typeof templates)[0]) => {
    setSubject(interpolate(template.subject));
    setBody(interpolate(template.body));
  };

  const handleSend = async () => {
    if (!subject || !body) {
      toast.error("Subject and message are required.");
      return;
    }
    try {
      const result = await sendEmail.mutateAsync({
        eventId,
        subject,
        body,
        recipientFilter,
      });
      toast.success(`Email sent to ${result.sent} recipient(s)!`);
      setSubject("");
      setBody("");
    } catch {
      toast.error("Failed to send email.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="font-display text-2xl font-bold">Emails</h2>
        <p className="text-sm text-muted-foreground">
          Send emails to your event attendees
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Compose Email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Recipients
                </label>
                <select
                  value={recipientFilter}
                  onChange={(e) => setRecipientFilter(e.target.value)}
                  className={selectClasses}
                >
                  <option value="all">All Registrants</option>
                  <option value="confirmed">Confirmed Only</option>
                  <option value="checked-in">Checked-In Only</option>
                  <option value="pending">Pending Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Subject
                </label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject line"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Message
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  placeholder="Write your message..."
                  className="flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>

              <Button
                onClick={handleSend}
                disabled={sendEmail.isPending || !subject || !body}
              >
                <Send className="h-4 w-4" />
                {sendEmail.isPending ? "Sending..." : "Send Email"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Templates */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {templates.map((template) => (
                <button
                  key={template.name}
                  type="button"
                  onClick={() => handleApplyTemplate(template)}
                  className="w-full text-left p-3 rounded-xl border hover:bg-muted/50 transition-colors"
                >
                  <p className="text-sm font-medium">{template.name}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {interpolate(template.subject)}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Sent History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sent Emails</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="shimmer rounded-lg h-12 w-full" />
                ))}
              </div>
            ) : emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-display text-lg font-bold mb-1">
                  No emails sent yet
                </h3>
                <p className="text-sm text-muted-foreground">
                  Compose your first email above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                        Subject
                      </th>
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground hidden md:table-cell">
                        Recipients
                      </th>
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground hidden md:table-cell">
                        Filter
                      </th>
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                        Sent
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {emails.map((email, i) => (
                      <motion.tr
                        key={email.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + i * 0.03 }}
                        className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-3">
                          <p className="text-sm font-medium">{email.subject}</p>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {email.recipientCount}
                          </div>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <Badge variant="muted" className="capitalize">
                            {email.recipientFilter}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(email.createdAt)}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
