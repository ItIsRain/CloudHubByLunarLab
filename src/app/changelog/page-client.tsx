"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Tag,
  Bug,
  Wrench,
  Rocket,
  History,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ChangeCategory = "feature" | "fix" | "improvement";

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: {
    text: string;
    category: ChangeCategory;
  }[];
}

const categoryConfig: Record<
  ChangeCategory,
  { label: string; variant: "default" | "success" | "warning" | "muted"; icon: React.ElementType }
> = {
  feature: { label: "Feature", variant: "default", icon: Sparkles },
  fix: { label: "Fix", variant: "success", icon: Bug },
  improvement: { label: "Improvement", variant: "warning", icon: Wrench },
};

const changelogEntries: ChangelogEntry[] = [
  {
    version: "2.4.0",
    date: "February 5, 2026",
    title: "AI-Powered Team Matching",
    changes: [
      { text: "Introduced AI-based team matching for hackathons using skill and interest analysis", category: "feature" },
      { text: "Added smart recommendations for tracks based on participant profiles", category: "feature" },
      { text: "Improved team formation flow with drag-and-drop member reordering", category: "improvement" },
      { text: "Fixed edge case where team invites expired prematurely on timezone boundaries", category: "fix" },
    ],
  },
  {
    version: "2.3.0",
    date: "January 18, 2026",
    title: "Advanced Analytics Dashboard",
    changes: [
      { text: "Launched real-time analytics dashboard with revenue, registration, and engagement charts", category: "feature" },
      { text: "Added exportable CSV and PDF reports for event organizers", category: "feature" },
      { text: "Improved chart rendering performance for large datasets", category: "improvement" },
      { text: "Fixed analytics date range picker not respecting user timezone", category: "fix" },
    ],
  },
  {
    version: "2.2.1",
    date: "December 30, 2025",
    title: "Bug Fixes & Polish",
    changes: [
      { text: "Fixed registration form not validating custom fields correctly on mobile", category: "fix" },
      { text: "Resolved intermittent SSO login failures for Enterprise users", category: "fix" },
      { text: "Improved loading states with skeleton shimmer across all pages", category: "improvement" },
      { text: "Optimized image loading for event cover photos", category: "improvement" },
    ],
  },
  {
    version: "2.2.0",
    date: "December 12, 2025",
    title: "Hackathon Judging Workflow",
    changes: [
      { text: "Added multi-criteria judging system with weighted scoring", category: "feature" },
      { text: "Introduced live leaderboard with real-time score updates", category: "feature" },
      { text: "Added judge assignment and conflict-of-interest management", category: "feature" },
      { text: "Improved submission gallery with filtering and search", category: "improvement" },
      { text: "Fixed scoring rounding errors when averaging across multiple judges", category: "fix" },
    ],
  },
  {
    version: "2.1.0",
    date: "November 22, 2025",
    title: "Event Page Builder",
    changes: [
      { text: "Launched drag-and-drop event page builder with live preview", category: "feature" },
      { text: "Added 12 customizable event page templates", category: "feature" },
      { text: "Improved rich text editor with Markdown support and media embeds", category: "improvement" },
      { text: "Fixed event page SEO metadata not updating after edits", category: "fix" },
    ],
  },
  {
    version: "2.0.0",
    date: "October 30, 2025",
    title: "CloudHub 2.0 -- Major Redesign",
    changes: [
      { text: "Complete UI redesign with new design system (Electric Coral theme)", category: "feature" },
      { text: "Rebuilt navigation with responsive mega-menu and command palette", category: "feature" },
      { text: "Introduced dark mode with full theme support across all pages", category: "feature" },
      { text: "Improved page load performance by 40% with optimized bundling", category: "improvement" },
      { text: "Migrated to Next.js App Router for improved routing and layouts", category: "improvement" },
      { text: "Fixed over 50 accessibility issues identified in WCAG audit", category: "fix" },
    ],
  },
  {
    version: "1.9.0",
    date: "September 15, 2025",
    title: "Community Spaces",
    changes: [
      { text: "Added Community Spaces for organizers to build persistent communities", category: "feature" },
      { text: "Introduced community-scoped events and shared member directories", category: "feature" },
      { text: "Improved notification preferences with granular channel controls", category: "improvement" },
      { text: "Fixed email notification delivery delays during high-traffic events", category: "fix" },
    ],
  },
  {
    version: "1.8.0",
    date: "August 1, 2025",
    title: "Ticketing & Payments",
    changes: [
      { text: "Launched integrated ticketing with Stripe-powered payments", category: "feature" },
      { text: "Added promo codes, early-bird pricing, and group discounts", category: "feature" },
      { text: "Introduced QR code check-in for in-person events", category: "feature" },
      { text: "Improved checkout flow with fewer steps and better error handling", category: "improvement" },
    ],
  },
];

const filterOptions: { label: string; value: ChangeCategory | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Features", value: "feature" },
  { label: "Fixes", value: "fix" },
  { label: "Improvements", value: "improvement" },
];

export default function ChangelogPage() {
  const [activeFilter, setActiveFilter] = React.useState<ChangeCategory | "all">("all");

  const filteredEntries = changelogEntries
    .map((entry) => ({
      ...entry,
      changes:
        activeFilter === "all"
          ? entry.changes
          : entry.changes.filter((c) => c.category === activeFilter),
    }))
    .filter((entry) => entry.changes.length > 0);

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-16">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-background to-fuchsia-500/5" />
          <div className="absolute inset-0 grid-bg opacity-40" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm">
              <History className="h-3.5 w-3.5 mr-1.5 text-primary" />
              What&apos;s New
            </Badge>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="gradient-text">Changelog</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Follow our journey as we ship new features, squash bugs, and continuously improve CloudHub.
            </p>

            {/* Filter Buttons */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setActiveFilter(option.value)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                    activeFilter === option.value
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Timeline */}
      <section className="pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border hidden sm:block" />

            <div className="space-y-8">
              {filteredEntries.map((entry, i) => (
                <motion.div
                  key={entry.version}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="relative sm:pl-14"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-2.5 top-8 h-[14px] w-[14px] rounded-full border-2 border-primary bg-background hidden sm:block" />

                  <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                    <CardContent className="pt-6 pb-6">
                      {/* Header */}
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <Badge variant="gradient" className="font-mono text-xs px-3">
                          <Tag className="h-3 w-3 mr-1" />
                          v{entry.version}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {entry.date}
                        </span>
                      </div>

                      <h3 className="font-display text-xl font-bold mb-4">
                        {entry.title}
                      </h3>

                      {/* Changes */}
                      <ul className="space-y-3">
                        {entry.changes.map((change, j) => {
                          const config = categoryConfig[change.category];
                          return (
                            <li key={j} className="flex items-start gap-3">
                              <Badge
                                variant={config.variant}
                                className="text-[10px] px-2 py-0.5 shrink-0 mt-0.5"
                              >
                                <config.icon className="h-2.5 w-2.5 mr-0.5" />
                                {config.label}
                              </Badge>
                              <span className="text-sm text-muted-foreground leading-relaxed">
                                {change.text}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Empty state */}
            {filteredEntries.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16"
              >
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Rocket className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">
                  No entries found
                </h3>
                <p className="text-sm text-muted-foreground">
                  No changelog entries match the selected filter. Try a different category.
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
