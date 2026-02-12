"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Trophy,
  FileText,
  DollarSign,
  ExternalLink,
  Share2,
  LayoutDashboard,
  Edit,
  UserCheck,
  UsersRound,
  Inbox,
  Scale,
  GraduationCap,
  Handshake,
  Gift,
  Megaphone,
  BarChart3,
  Settings,
  Clock,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { mockHackathons } from "@/lib/mock-data";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; variant: "muted" | "success" | "warning" | "gradient" | "secondary" }> = {
  "draft": { label: "Draft", variant: "muted" },
  "registration-open": { label: "Registration Open", variant: "success" },
  "registration-closed": { label: "Registration Closed", variant: "warning" },
  "hacking": { label: "Hacking in Progress", variant: "gradient" },
  "submission": { label: "Submissions Open", variant: "warning" },
  "judging": { label: "Judging", variant: "secondary" },
  "completed": { label: "Completed", variant: "muted" },
};

const recentActivity = [
  { id: 1, action: "New team registered", detail: "Code Crusaders joined the hackathon", time: "2 hours ago", icon: UsersRound },
  { id: 2, action: "Submission received", detail: "Team AI Pioneers submitted their project", time: "5 hours ago", icon: Inbox },
  { id: 3, action: "Mentor session booked", detail: "Sarah Kim booked a session with Team Byte Builders", time: "8 hours ago", icon: GraduationCap },
  { id: 4, action: "New participant", detail: "Emma Wilson registered for the hackathon", time: "12 hours ago", icon: UserCheck },
  { id: 5, action: "Sponsor update", detail: "TechGiant increased their prize contribution", time: "1 day ago", icon: Handshake },
];

const navLinks = [
  { label: "Overview", icon: LayoutDashboard, path: "" },
  { label: "Edit", icon: Edit, path: "/edit" },
  { label: "Participants", icon: UserCheck, path: "/participants" },
  { label: "Teams", icon: UsersRound, path: "/teams" },
  { label: "Submissions", icon: Inbox, path: "/submissions" },
  { label: "Judging", icon: Scale, path: "/judging" },
  { label: "Mentors", icon: GraduationCap, path: "/mentors" },
  { label: "Sponsors", icon: Handshake, path: "/sponsors" },
  { label: "Prizes", icon: Gift, path: "/prizes" },
  { label: "Announcements", icon: Megaphone, path: "/announcements" },
  { label: "Analytics", icon: BarChart3, path: "/analytics" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export default function HackathonManagementPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;
  const hackathon = mockHackathons.find((h) => h.id === hackathonId);

  if (!hackathon) {
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
              Hackathon Not Found
            </h2>
            <p className="text-muted-foreground mb-6">
              The hackathon you are looking for does not exist.
            </p>
            <Link href="/dashboard/hackathons">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Back to My Hackathons
              </Button>
            </Link>
          </motion.div>
        </main>
      </>
    );
  }

  const status = statusConfig[hackathon.status] || { label: hackathon.status, variant: "muted" as const };

  const stats = [
    { label: "Participants", value: "245", icon: Users, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { label: "Teams", value: "52", icon: UsersRound, color: "text-green-500", bgColor: "bg-green-500/10" },
    { label: "Submissions", value: "38", icon: FileText, color: "text-purple-500", bgColor: "bg-purple-500/10" },
    { label: "Prize Pool", value: formatCurrency(hackathon.totalPrizePool), icon: DollarSign, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
  ];

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
            href="/dashboard/hackathons"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Hackathons
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-display text-3xl font-bold">
                  {hackathon.name}
                </h1>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <p className="text-muted-foreground">{hackathon.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/hackathons/${hackathon.slug}`} target="_blank">
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
                  `${window.location.origin}/hackathons/${hackathon.slug}`
                );
                toast.success("Link copied to clipboard!");
              }}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        stat.bgColor
                      )}
                    >
                      <stat.icon className={cn("h-5 w-5", stat.color)} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-display">
                        {stat.value}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {stat.label}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Navigation Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={`/dashboard/hackathons/${hackathonId}${link.path}`}
                  >
                    <Button
                      variant={link.path === "" ? "default" : "ghost"}
                      size="sm"
                      className="gap-2"
                    >
                      <link.icon className="h-4 w-4" />
                      {link.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
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
                    transition={{ delay: 0.35 + i * 0.05 }}
                    className="flex items-start gap-3 pb-4 last:pb-0 border-b last:border-b-0"
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <activity.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.detail}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Clock className="h-3 w-3" />
                      {activity.time}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </>
  );
}
