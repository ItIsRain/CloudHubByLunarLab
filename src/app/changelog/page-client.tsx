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
    version: "0.6.0",
    date: "February 21, 2026",
    title: "Search Engine Optimization",
    changes: [
      { text: "Events and hackathons now appear in Google with rich snippets (dates, location, prices)", category: "feature" },
      { text: "Shared links on social media now show proper titles, descriptions, and cover images", category: "feature" },
      { text: "Added dynamic sitemap covering all public events, hackathons, and user profiles", category: "feature" },
      { text: "Private pages (dashboard, admin panel) are now properly excluded from search engines", category: "improvement" },
      { text: "Fixed share links in event and hackathon pages pointing to incorrect URLs", category: "fix" },
    ],
  },
  {
    version: "0.5.0",
    date: "February 21, 2026",
    title: "Live Backend & Real-Time Data",
    changes: [
      { text: "Events, hackathons, teams, and notifications are now powered by a live database", category: "feature" },
      { text: "Added secure authentication with email/password login, session management, and email verification", category: "feature" },
      { text: "Bookmarks now persist across sessions and devices", category: "feature" },
      { text: "Landing page stats and testimonials now update in real-time", category: "improvement" },
      { text: "Data loading is now significantly faster with intelligent caching and background refreshing", category: "improvement" },
      { text: "All user data is protected with granular access control — users can only access their own data", category: "improvement" },
    ],
  },
  {
    version: "0.4.0",
    date: "February 21, 2026",
    title: "Branding & Pricing Refresh",
    changes: [
      { text: "New CloudHub branding with refreshed logos and favicon", category: "feature" },
      { text: "Completely redesigned pricing page with tier comparison table, FAQ, and social proof", category: "improvement" },
      { text: "Fixed dark mode inconsistencies across navigation, footer, and all pages", category: "fix" },
      { text: "Improved theme-aware brand assets for light and dark modes", category: "improvement" },
    ],
  },
  {
    version: "0.3.0",
    date: "February 12, 2026",
    title: "Full Platform Launch",
    changes: [
      { text: "Launched complete event experience: schedule, speakers, tickets, gallery, recap, and live streaming pages", category: "feature" },
      { text: "Launched complete hackathon experience: overview, tracks, schedule, teams, submissions, mentors, sponsors, FAQ, leaderboard, and resources", category: "feature" },
      { text: "Added organizer dashboard with event management, hackathon management, team tools, notifications, bookmarks, certificates, and messaging", category: "feature" },
      { text: "Added admin panel with user management, analytics, reports, featured content curation, and platform settings", category: "feature" },
      { text: "Added judge and mentor portals with dedicated scoring, session booking, and review workflows", category: "feature" },
      { text: "Added sharing and calendar integration dialogs across all event and hackathon pages", category: "feature" },
      { text: "Added blog, careers, contact, about, and legal pages", category: "feature" },
      { text: "Added calendar feed pages with ICS subscription support", category: "feature" },
    ],
  },
  {
    version: "0.2.0",
    date: "February 12, 2026",
    title: "Core Experience",
    changes: [
      { text: "Launched explore page with event and hackathon discovery, filtering by category, date, type, and tags", category: "feature" },
      { text: "Added authentication pages with animated split-screen layout (login, register, forgot password, verify email)", category: "feature" },
      { text: "Launched landing page with hero section, feature highlights, pricing overview, and testimonials", category: "feature" },
      { text: "Introduced CloudHub design system with Electric Coral theme, full dark mode support, and motion throughout", category: "improvement" },
      { text: "Improved overall performance with optimized loading states and skeleton animations", category: "improvement" },
    ],
  },
  {
    version: "0.1.0",
    date: "February 12, 2026",
    title: "Initial Release",
    changes: [
      { text: "CloudHub platform goes live with foundational infrastructure and core routing", category: "feature" },
      { text: "Responsive design across mobile, tablet, and desktop breakpoints", category: "feature" },
      { text: "Premium typography with Outfit, Space Grotesk, and JetBrains Mono font stack", category: "improvement" },
      { text: "Fixed video playback issues on landing page", category: "fix" },
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
