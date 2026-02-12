"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Send,
  Mail,
  Clock,
  Users,
  Eye,
  FileText,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatDate } from "@/lib/utils";
import { mockEvents } from "@/lib/mock-data";
import { toast } from "sonner";

interface SentEmail {
  id: string;
  subject: string;
  recipientsCount: number;
  date: string;
  openRate: number;
}

const sentEmails: SentEmail[] = [
  {
    id: "e-1",
    subject: "Event Reminder: 3 Days to Go!",
    recipientsCount: 142,
    date: new Date(Date.now() - 86400000 * 3).toISOString(),
    openRate: 68,
  },
  {
    id: "e-2",
    subject: "Important: Venue Change Notification",
    recipientsCount: 156,
    date: new Date(Date.now() - 86400000 * 7).toISOString(),
    openRate: 82,
  },
  {
    id: "e-3",
    subject: "Welcome! Your Registration is Confirmed",
    recipientsCount: 89,
    date: new Date(Date.now() - 86400000 * 14).toISOString(),
    openRate: 91,
  },
  {
    id: "e-4",
    subject: "Early Bird Tickets Now Available",
    recipientsCount: 234,
    date: new Date(Date.now() - 86400000 * 21).toISOString(),
    openRate: 55,
  },
];

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const emailTemplates: EmailTemplate[] = [
  {
    id: "tpl-1",
    name: "Welcome",
    description: "Welcome new registrants with event details and what to expect.",
    icon: "welcome",
  },
  {
    id: "tpl-2",
    name: "Reminder",
    description: "Remind attendees about the upcoming event with date and location.",
    icon: "reminder",
  },
  {
    id: "tpl-3",
    name: "Thank You",
    description: "Thank attendees after the event and share resources or recordings.",
    icon: "thanks",
  },
];

export default function EmailsPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const event = mockEvents.find((e) => e.id === eventId);

  const [subject, setSubject] = React.useState("");
  const [recipientFilter, setRecipientFilter] = React.useState("all");
  const [body, setBody] = React.useState("");

  if (!event) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <h2 className="font-display text-2xl font-bold mb-2">Event not found</h2>
              <p className="text-muted-foreground mb-6">
                The event you are looking for does not exist or has been removed.
              </p>
              <Button asChild>
                <Link href="/dashboard/events">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to My Events
                </Link>
              </Button>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  const handleSend = () => {
    if (!subject.trim()) {
      toast.error("Please enter a subject.");
      return;
    }
    if (!body.trim()) {
      toast.error("Please enter a message body.");
      return;
    }
    toast.success(`Email sent to ${recipientFilter === "all" ? "all guests" : recipientFilter}!`);
    setSubject("");
    setBody("");
  };

  const handleUseTemplate = (template: EmailTemplate) => {
    if (template.id === "tpl-1") {
      setSubject(`Welcome to ${event.title}!`);
      setBody(
        `Hi there!\n\nThank you for registering for ${event.title}. We're excited to have you join us!\n\nHere's what you need to know:\n- Date: ${formatDate(event.startDate)}\n- Location: ${event.location.city || "Online"}\n\nSee you there!`
      );
    } else if (template.id === "tpl-2") {
      setSubject(`Reminder: ${event.title} is coming up!`);
      setBody(
        `Hi there!\n\nThis is a friendly reminder that ${event.title} is just around the corner.\n\nDon't forget to mark your calendar and prepare for an amazing experience!\n\nSee you soon!`
      );
    } else {
      setSubject(`Thank You for Attending ${event.title}!`);
      setBody(
        `Hi there!\n\nThank you for being part of ${event.title}. We hope you had a wonderful experience!\n\nWe'd love to hear your feedback. Stay tuned for recordings and resources from the event.\n\nUntil next time!`
      );
    }
    toast.success(`"${template.name}" template loaded!`);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/events/${eventId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Overview
              </Link>
            </Button>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display text-3xl font-bold">Emails</h1>
            <p className="text-muted-foreground mt-1">{event.title}</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                      Subject
                    </label>
                    <Input
                      placeholder="Enter email subject..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Recipients
                    </label>
                    <select
                      value={recipientFilter}
                      onChange={(e) => setRecipientFilter(e.target.value)}
                      className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="all">All Guests</option>
                      <option value="checked-in">Checked-in Only</option>
                      <option value="not-checked-in">Not Checked-in</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Message
                    </label>
                    <textarea
                      rows={8}
                      placeholder="Write your email message..."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      className="flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    />
                  </div>

                  <Button onClick={handleSend}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Email
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
                  <CardTitle className="text-lg">Email Templates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {emailTemplates.map((template, i) => (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      className="p-4 rounded-xl border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold">{template.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {template.description}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleUseTemplate(template)}
                      >
                        Use Template
                      </Button>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sent Emails History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sent Emails</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left text-sm font-medium text-muted-foreground px-6 py-3">
                          Subject
                        </th>
                        <th className="text-left text-sm font-medium text-muted-foreground px-6 py-3">
                          Recipients
                        </th>
                        <th className="text-left text-sm font-medium text-muted-foreground px-6 py-3">
                          Date
                        </th>
                        <th className="text-left text-sm font-medium text-muted-foreground px-6 py-3">
                          Open Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sentEmails.map((email, i) => (
                        <motion.tr
                          key={email.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 + i * 0.05 }}
                          className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm font-medium">
                                {email.subject}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Users className="h-3.5 w-3.5" />
                              {email.recipientsCount}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {formatDate(email.date)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                    email.openRate >= 70
                                      ? "bg-green-500"
                                      : email.openRate >= 50
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                  )}
                                  style={{ width: `${email.openRate}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">
                                {email.openRate}%
                              </span>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
