"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Send,
  Mail,
  Eye,
  Clock,
  BarChart3,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";

const pastNewsletters = [
  {
    id: "nl-1",
    subject: "January Event Roundup - 5 New Events This Month!",
    sentDate: "2025-01-15",
    recipients: 5420,
    openRate: 42.3,
    clickRate: 12.8,
  },
  {
    id: "nl-2",
    subject: "BuildAI 2024 - Registration Now Open",
    sentDate: "2024-12-20",
    recipients: 5100,
    openRate: 56.7,
    clickRate: 23.4,
  },
  {
    id: "nl-3",
    subject: "Year in Review: Our Community's Best Moments",
    sentDate: "2024-12-01",
    recipients: 4900,
    openRate: 38.9,
    clickRate: 8.5,
  },
];

export default function NewsletterPage() {
  const [subject, setSubject] = React.useState("");
  const [content, setContent] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error("Please enter a subject line.");
      return;
    }
    if (!content.trim()) {
      toast.error("Please enter newsletter content.");
      return;
    }

    setSending(true);
    // Simulate sending delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSending(false);

    toast.success("Newsletter sent successfully to 5,420 subscribers!");
    setSubject("");
    setContent("");
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <Link
              href="/dashboard/community"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Community
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-8"
          >
            <h1 className="font-display text-3xl font-bold">Newsletter</h1>
            <p className="text-muted-foreground mt-1">
              Compose and send newsletters to your community
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Composer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Compose Newsletter
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Recipient Count */}
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Sending to{" "}
                      <span className="font-bold text-foreground">5,420</span>{" "}
                      subscribers
                    </span>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Subject
                    </label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Enter your newsletter subject..."
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Content
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Write your newsletter content here..."
                      rows={12}
                      className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                    />
                  </div>

                  {/* Send Button */}
                  <div className="flex justify-end pt-2">
                    <Button
                      size="lg"
                      onClick={handleSend}
                      disabled={sending}
                    >
                      {sending ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Newsletter
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Past Newsletters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="lg:col-span-1"
            >
              <h2 className="font-display text-lg font-bold mb-4">
                Past Newsletters
              </h2>
              <div className="space-y-3">
                {pastNewsletters.map((newsletter, i) => (
                  <motion.div
                    key={newsletter.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                  >
                    <Card hover className="cursor-pointer">
                      <CardContent className="p-4">
                        <h3 className="font-medium text-sm mb-2 line-clamp-2">
                          {newsletter.subject}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                          <Clock className="h-3 w-3" />
                          {formatDate(newsletter.sentDate)}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-medium">
                              {newsletter.openRate}%
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-medium">
                              {newsletter.clickRate}%
                            </span>
                          </div>
                          <Badge variant="secondary" className="text-xs ml-auto">
                            {newsletter.recipients.toLocaleString()} sent
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </>
  );
}
