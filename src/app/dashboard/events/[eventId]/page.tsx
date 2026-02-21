"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ExternalLink,
  Share2,
  LayoutDashboard,
  Edit,
  UserCheck,
  Ticket,
  ScanLine,
  Mail,
  BarChart3,
  Settings,
  FileText,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEvent } from "@/hooks/use-events";
import { toast } from "sonner";

import { OverviewTab } from "./_components/overview-tab";
import { EditTab } from "./_components/edit-tab";
import { GuestsTab } from "./_components/guests-tab";
import { TicketsTab } from "./_components/tickets-tab";
import { CheckInTab } from "./_components/check-in-tab";
import { EmailsTab } from "./_components/emails-tab";
import { AnalyticsTab } from "./_components/analytics-tab";
import { SettingsTab } from "./_components/settings-tab";

const statusConfig: Record<
  string,
  { label: string; variant: "muted" | "success" | "destructive" | "secondary" }
> = {
  draft: { label: "Draft", variant: "muted" },
  published: { label: "Published", variant: "success" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  completed: { label: "Completed", variant: "secondary" },
};

const tabs = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "edit", label: "Edit", icon: Edit },
  { value: "guests", label: "Guests", icon: UserCheck },
  { value: "tickets", label: "Tickets", icon: Ticket },
  { value: "check-in", label: "Check-In", icon: ScanLine },
  { value: "emails", label: "Emails", icon: Mail },
  { value: "analytics", label: "Analytics", icon: BarChart3 },
  { value: "settings", label: "Settings", icon: Settings },
];

function EventDashboardContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const { data: eventData, isLoading } = useEvent(eventId);
  const event = eventData?.data;

  const currentTab = searchParams.get("tab") || "overview";

  const handleTabChange = (value: string) => {
    const url = new URL(window.location.href);
    if (value === "overview") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", value);
    }
    router.replace(url.pathname + url.search, { scroll: false });
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="space-y-4">
            <div className="shimmer rounded-xl h-12 w-64" />
            <div className="shimmer rounded-xl h-8 w-96" />
            <div className="shimmer rounded-xl h-12 w-full" />
            <div className="shimmer rounded-xl h-96 w-full" />
          </div>
        </main>
      </>
    );
  }

  if (!event) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">
              Event Not Found
            </h2>
            <p className="text-muted-foreground mb-6">
              The event you are looking for does not exist or has been removed.
            </p>
            <Link href="/dashboard/events">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Back to My Events
              </Button>
            </Link>
          </motion.div>
        </main>
      </>
    );
  }

  const status = statusConfig[event.status] || {
    label: event.status,
    variant: "muted" as const,
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link
            href="/dashboard/events"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Events
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-3xl font-bold">
                {event.title}
              </h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            {event.tagline && (
              <p className="text-muted-foreground">{event.tagline}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/events/${event.slug}`} target="_blank">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" />
                View Public Page
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/events/${event.slug}`
                );
                toast.success("Link copied to clipboard!");
              }}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </motion.div>

        {/* Tabbed Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={currentTab} onValueChange={handleTabChange}>
            <TabsList className="flex flex-wrap h-auto w-full gap-1 bg-muted/50 p-1.5 rounded-xl mb-6">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-1.5 px-3 py-2 text-xs sm:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <tab.icon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab event={event} eventId={eventId} />
            </TabsContent>
            <TabsContent value="edit">
              <EditTab event={event} eventId={eventId} />
            </TabsContent>
            <TabsContent value="guests">
              <GuestsTab event={event} eventId={eventId} />
            </TabsContent>
            <TabsContent value="tickets">
              <TicketsTab event={event} eventId={eventId} />
            </TabsContent>
            <TabsContent value="check-in">
              <CheckInTab event={event} eventId={eventId} />
            </TabsContent>
            <TabsContent value="emails">
              <EmailsTab event={event} eventId={eventId} />
            </TabsContent>
            <TabsContent value="analytics">
              <AnalyticsTab event={event} eventId={eventId} />
            </TabsContent>
            <TabsContent value="settings">
              <SettingsTab event={event} eventId={eventId} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </>
  );
}

export default function EventManagementPage() {
  return (
    <React.Suspense
      fallback={
        <>
          <Navbar />
          <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
            <div className="space-y-4">
              <div className="shimmer rounded-xl h-12 w-64" />
              <div className="shimmer rounded-xl h-8 w-96" />
              <div className="shimmer rounded-xl h-12 w-full" />
              <div className="shimmer rounded-xl h-96 w-full" />
            </div>
          </main>
        </>
      }
    >
      <EventDashboardContent />
    </React.Suspense>
  );
}
