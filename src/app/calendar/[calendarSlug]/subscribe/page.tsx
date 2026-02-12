"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Copy,
  Check,
  ExternalLink,
  CalendarDays,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { mockCommunities } from "@/lib/mock-data";

interface CalendarOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const calendarOptions: CalendarOption[] = [
  {
    id: "google",
    name: "Google Calendar",
    description: "Add events directly to your Google Calendar",
    icon: "G",
    color: "bg-blue-500/10 text-blue-600 border-blue-200",
  },
  {
    id: "apple",
    name: "Apple Calendar",
    description: "Subscribe via iCal on macOS and iOS",
    icon: "A",
    color: "bg-gray-500/10 text-gray-600 border-gray-200",
  },
  {
    id: "outlook",
    name: "Outlook Calendar",
    description: "Add to Microsoft Outlook or Office 365",
    icon: "O",
    color: "bg-cyan-500/10 text-cyan-600 border-cyan-200",
  },
  {
    id: "ical",
    name: "iCal / Other",
    description: "Copy the iCal URL to use with any calendar app",
    icon: "i",
    color: "bg-purple-500/10 text-purple-600 border-purple-200",
  },
];

export default function CalendarSubscribePage() {
  const params = useParams();
  const calendarSlug = params.calendarSlug as string;
  const community = mockCommunities.find((c) => c.slug === calendarSlug);

  const [copied, setCopied] = React.useState(false);

  const calendarUrl = `https://cloudhub.dev/api/calendars/${calendarSlug}/feed.ics`;

  if (!community) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-24"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
                <CalendarDays className="h-10 w-10 text-muted-foreground" />
              </div>
              <h1 className="font-display text-3xl font-bold mb-4">
                Community Not Found
              </h1>
              <p className="text-muted-foreground mb-8">
                The community you are looking for does not exist.
              </p>
              <Button asChild>
                <Link href="/explore">Browse Communities</Link>
              </Button>
            </motion.div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(calendarUrl);
    setCopied(true);
    toast.success("Calendar URL copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddToCalendar = (optionId: string) => {
    const option = calendarOptions.find((o) => o.id === optionId);
    toast.success(`Opening ${option?.name}... (mock)`);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <Link
              href={`/calendar/${calendarSlug}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Calendar
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold mb-2">
              Subscribe to Calendar
            </h1>
            <p className="text-muted-foreground">
              Stay up to date with events from{" "}
              <span className="font-medium text-foreground">
                {community.name}
              </span>
            </p>
          </motion.div>

          {/* Calendar Options */}
          <div className="space-y-4 mb-8">
            {calendarOptions.map((option, i) => (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <Card hover>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center font-display font-bold text-lg border",
                          option.color
                        )}
                      >
                        {option.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-bold">
                          {option.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleAddToCalendar(option.id)}
                      >
                        Add to {option.name.split(" ")[0]}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Calendar URL */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6">
              <h3 className="font-display font-bold mb-2 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Calendar Feed URL
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Use this URL to subscribe from any calendar application that
                supports iCal feeds.
              </p>
              <div className="flex gap-2">
                <Input
                  value={calendarUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  onClick={handleCopyUrl}
                  className="shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
