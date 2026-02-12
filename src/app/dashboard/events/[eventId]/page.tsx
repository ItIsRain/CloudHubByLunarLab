"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  DollarSign,
  Eye,
  Settings,
  Edit,
  UserCheck,
  Ticket,
  ScanLine,
  Mail,
  BarChart3,
  ExternalLink,
  Share2,
  Clock,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { mockEvents } from "@/lib/mock-data";
import { toast } from "sonner";

const navItems = [
  { label: "Overview", href: "", icon: BarChart3 },
  { label: "Edit", href: "/edit", icon: Edit },
  { label: "Guests", href: "/guests", icon: UserCheck },
  { label: "Tickets", href: "/tickets", icon: Ticket },
  { label: "Check-in", href: "/check-in", icon: ScanLine },
  { label: "Emails", href: "/emails", icon: Mail },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

const stats = [
  {
    label: "Registrations",
    value: "156",
    icon: Users,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    label: "Check-ins",
    value: "89",
    icon: CheckCircle2,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    label: "Revenue",
    value: "$2,340",
    icon: DollarSign,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    label: "Page Views",
    value: "1,234",
    icon: Eye,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

const recentActivity = [
  {
    id: 1,
    message: "Sarah Kim registered for VIP Pass",
    time: "2 minutes ago",
    type: "registration",
  },
  {
    id: 2,
    message: "Marcus Johnson checked in",
    time: "15 minutes ago",
    type: "check-in",
  },
  {
    id: 3,
    message: "Emma Wilson purchased 2 General Admission tickets",
    time: "1 hour ago",
    type: "purchase",
  },
  {
    id: 4,
    message: "David Park cancelled their registration",
    time: "3 hours ago",
    type: "cancellation",
  },
  {
    id: 5,
    message: "New promo code EARLYBIRD applied 12 times",
    time: "5 hours ago",
    type: "promo",
  },
];

export default function EventManagementPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const event = mockEvents.find((e) => e.id === eventId);

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
              <h2 className="font-display text-2xl font-bold mb-2">
                Event not found
              </h2>
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

  const statusColor: Record<string, string> = {
    draft: "secondary",
    published: "success",
    cancelled: "destructive",
    completed: "muted",
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
              <Link href="/dashboard/events">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to My Events
              </Link>
            </Button>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6"
          >
            <div className="flex items-center gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold">
                  {event.title}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {formatDate(event.startDate)} &mdash;{" "}
                  {formatDate(event.endDate)}
                </p>
              </div>
              <Badge
                variant={
                  statusColor[event.status] as
                    | "secondary"
                    | "success"
                    | "destructive"
                    | "muted"
                }
              >
                {event.status}
              </Badge>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href={`/events/${event.slug}`} target="_blank">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Public Page
                </Link>
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/events/${event.slug}`
                  );
                  toast.success("Event link copied to clipboard!");
                }}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Event
              </Button>
            </div>
          </motion.div>

          {/* Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex gap-1 overflow-x-auto mb-8 pb-1"
          >
            {navItems.map((item) => (
              <Button
                key={item.label}
                variant={item.href === "" ? "default" : "ghost"}
                size="sm"
                asChild
              >
                <Link
                  href={`/dashboard/events/${eventId}${item.href}`}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Link>
              </Button>
            ))}
          </motion.div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {stat.label}
                        </p>
                        <p className="font-display text-3xl font-bold">
                          {stat.value}
                        </p>
                      </div>
                      <div className={cn("p-3 rounded-xl", stat.bgColor)}>
                        <stat.icon className={cn("h-6 w-6", stat.color)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, i) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0"
                    >
                      <div
                        className={cn(
                          "mt-1 w-2 h-2 rounded-full flex-shrink-0",
                          activity.type === "registration" && "bg-blue-500",
                          activity.type === "check-in" && "bg-green-500",
                          activity.type === "purchase" && "bg-yellow-500",
                          activity.type === "cancellation" && "bg-red-500",
                          activity.type === "promo" && "bg-purple-500"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{activity.message}</p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {activity.time}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
