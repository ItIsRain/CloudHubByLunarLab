"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Users,
  Calendar,
  Mail,
  Settings,
  Plus,
  TrendingUp,
  ArrowRight,
  BarChart3,
  UserPlus,
  Globe,
  Lock,
  Loader2,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatDate, formatNumber, safeHref } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useMyCommunities } from "@/hooks/use-communities";
import { useEvents } from "@/hooks/use-events";
import type { Community } from "@/lib/types";

const quickActions = [
  {
    label: "Create Event",
    description: "Host a new event for your community",
    icon: Plus,
    href: "/events/create",
    color: "bg-primary/10 text-primary",
  },
  {
    label: "Send Newsletter",
    description: "Send updates to your subscribers",
    icon: Mail,
    href: "/dashboard/community/newsletter",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    label: "Manage Members",
    description: "View and manage community members",
    icon: UserPlus,
    href: "/dashboard/community/members",
    color: "bg-green-500/10 text-green-600",
  },
];

export default function CommunityDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: communitiesData, isLoading } = useMyCommunities();
  const communities = communitiesData?.data || [];
  const community = communities[0]; // Primary community

  const { data: eventsData } = useEvents(
    community ? { organizerId: user?.id, pageSize: 3 } : undefined
  );
  const recentEvents = eventsData?.data || [];

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
        </main>
      </>
    );
  }

  // Empty state: no communities yet
  if (!community) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Users className="h-12 w-12 text-primary" />
              </div>
              <h1 className="font-display text-3xl font-bold mb-3">
                Create Your Community
              </h1>
              <p className="text-muted-foreground text-lg max-w-md mb-8">
                Build and grow a community of like-minded people. Create events,
                manage members, and share knowledge together.
              </p>
              <div className="flex gap-3">
                <Button asChild>
                  <Link href="/explore/communities">
                    Browse Communities
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="font-display text-3xl font-bold">My Community</h1>
              <p className="text-muted-foreground mt-1">
                Manage your community, events, and members
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/dashboard/community/settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </Button>
          </motion.div>

          {/* Community Overview Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-8"
          >
            <Card className="overflow-hidden">
              <div className="h-32 relative">
                {community.coverImage ? (
                  <Image
                    src={community.coverImage}
                    alt={community.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full bg-gradient-to-r from-primary to-accent" />
                )}
              </div>
              <CardContent className="p-6 -mt-10 relative">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="h-20 w-20 rounded-2xl bg-card border-4 border-card shadow-lg flex items-center justify-center overflow-hidden">
                    {community.logo ? (
                      <Image
                        src={community.logo}
                        alt={community.name}
                        width={80}
                        height={80}
                        className="object-cover"
                      />
                    ) : (
                      <span className="font-display text-2xl font-bold text-primary">
                        {community.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-2xl font-bold">
                        {community.name}
                      </h2>
                      <Badge variant="secondary" className="text-xs">
                        {community.visibility === "public" ? (
                          <Globe className="h-3 w-3 mr-1" />
                        ) : (
                          <Lock className="h-3 w-3 mr-1" />
                        )}
                        {community.visibility}
                      </Badge>
                    </div>
                    {community.description && (
                      <p className="text-muted-foreground text-sm mt-1">
                        {community.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t">
                  <div>
                    <p className="text-2xl font-bold font-display">
                      {formatNumber(community.memberCount)}
                    </p>
                    <p className="text-sm text-muted-foreground">Members</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display">
                      {community.eventCount}
                    </p>
                    <p className="text-sm text-muted-foreground">Events</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display">
                      {community.tags.length}
                    </p>
                    <p className="text-sm text-muted-foreground">Tags</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display capitalize">
                      {community.status}
                    </p>
                    <p className="text-sm text-muted-foreground">Status</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="font-display text-xl font-bold mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {quickActions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                  >
                    <Link href={action.href}>
                      <Card hover className="h-full">
                        <CardContent className="p-5">
                          <div
                            className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center mb-3",
                              action.color
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <h3 className="font-display font-bold mb-1">
                            {action.label}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {action.description}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Events */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold">
                  Recent Events
                </h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/events">
                    View All <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
              <div className="space-y-3">
                {recentEvents.length > 0 ? (
                  recentEvents.map((event, i) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.05 }}
                    >
                      <Card hover>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <Calendar className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm truncate">
                                {event.title}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(event.startDate)}
                              </p>
                            </div>
                            <Badge
                              variant="secondary"
                              className="text-xs shrink-0"
                            >
                              {event.registrationCount} registered
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No events yet.{" "}
                        <Link
                          href="/events/create"
                          className="text-primary hover:underline"
                        >
                          Create one
                        </Link>
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </motion.div>

            {/* Community Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold">
                  Community Info
                </h2>
              </div>
              <Card className="p-6">
                <div className="space-y-4">
                  {community.website && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Website
                      </p>
                      <a
                        href={safeHref(community.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {community.website}
                      </a>
                    </div>
                  )}
                  {community.tags.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Tags
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {community.tags.map((tag) => (
                          <Badge key={tag} variant="muted" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {Object.keys(community.socials).length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Social Links
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(community.socials).map(
                          ([platform, url]) => (
                            <a
                              key={platform}
                              href={safeHref(url)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Badge
                                variant="outline"
                                className="text-xs capitalize hover:bg-muted"
                              >
                                {platform}
                              </Badge>
                            </a>
                          )
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Created
                    </p>
                    <p className="text-sm">{formatDate(community.createdAt)}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Links to Sub-Pages */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {[
              {
                label: "Members",
                href: "/dashboard/community/members",
                icon: Users,
              },
              {
                label: "Newsletter",
                href: "/dashboard/community/newsletter",
                icon: Mail,
              },
              {
                label: "Settings",
                href: "/dashboard/community/settings",
                icon: Settings,
              },
              {
                label: "Analytics",
                href: "/dashboard",
                icon: BarChart3,
              },
            ].map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.label} href={link.href}>
                  <Card hover className="p-4 text-center">
                    <Icon className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">{link.label}</p>
                  </Card>
                </Link>
              );
            })}
          </motion.div>

          {/* Other Communities */}
          {communities.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-10"
            >
              <h2 className="font-display text-xl font-bold mb-4">
                My Other Communities
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {communities.slice(1).map((c) => (
                  <Card key={c.id} hover>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="font-display font-bold text-primary">
                            {c.name.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">
                            {c.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(c.memberCount)} members
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </>
  );
}
