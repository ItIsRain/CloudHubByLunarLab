"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Calendar,
  Users,
  Trophy,
  Ticket,
  BarChart3,
  Globe,
  Shield,
  Zap,
  Palette,
  Bell,
  GitBranch,
  MessageSquare,
  Award,
  Layers,
  MonitorPlay,
  Search,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const featureCategories = [
  {
    title: "Event Management",
    description: "Everything you need to create, manage, and grow world-class events.",
    features: [
      {
        icon: Calendar,
        title: "Event Pages",
        description: "Beautiful, customizable event pages with schedule, speakers, gallery, and live streaming support.",
      },
      {
        icon: Ticket,
        title: "Ticketing & Registration",
        description: "Integrated ticketing with multiple tiers, promo codes, early-bird pricing, and Stripe payments.",
      },
      {
        icon: Users,
        title: "Attendee Management",
        description: "Track registrations, manage check-ins with QR codes, and communicate with attendees at scale.",
      },
      {
        icon: MonitorPlay,
        title: "Live Streaming",
        description: "Built-in live streaming support for hybrid and virtual events with real-time chat.",
      },
    ],
  },
  {
    title: "Hackathon Platform",
    description: "The complete toolkit for organizing hackathons from start to finish.",
    features: [
      {
        icon: Trophy,
        title: "Judging System",
        description: "Multi-criteria scoring with weighted rubrics, judge assignment, and conflict-of-interest management.",
      },
      {
        icon: GitBranch,
        title: "Team Formation",
        description: "Smart team matching based on skills and interests. Team management with invites and role assignment.",
      },
      {
        icon: Layers,
        title: "Tracks & Challenges",
        description: "Define multiple tracks with separate prizes, sponsors, and judging criteria.",
      },
      {
        icon: Award,
        title: "Submissions & Leaderboard",
        description: "Project submission portal with demos, repos, and media. Real-time leaderboard updates.",
      },
    ],
  },
  {
    title: "Community & Growth",
    description: "Build lasting communities around your events and hackathons.",
    features: [
      {
        icon: Globe,
        title: "Discovery & Explore",
        description: "Powerful search and filtering so attendees find your events by category, location, date, and tags.",
      },
      {
        icon: MessageSquare,
        title: "Messaging",
        description: "Built-in messaging between organizers, teams, mentors, and participants.",
      },
      {
        icon: Bell,
        title: "Notifications",
        description: "Real-time notifications for registrations, team invites, judging updates, and announcements.",
      },
      {
        icon: Search,
        title: "Public Profiles",
        description: "Participant profiles showcasing events attended, hackathons won, skills, and certifications.",
      },
    ],
  },
  {
    title: "Platform & Infrastructure",
    description: "Enterprise-grade infrastructure that scales with you.",
    features: [
      {
        icon: BarChart3,
        title: "Analytics Dashboard",
        description: "Real-time insights into registrations, revenue, engagement, and attendee demographics.",
      },
      {
        icon: Shield,
        title: "Security & Permissions",
        description: "Role-based access control for organizers, judges, mentors, and admins. Row-level security on all data.",
      },
      {
        icon: Zap,
        title: "Performance",
        description: "Built on Next.js 16 with edge rendering, optimized images, and sub-second page loads.",
      },
      {
        icon: Palette,
        title: "Design System",
        description: "Premium design with dark mode, motion animations, glassmorphism, and responsive layouts on every page.",
      },
    ],
  },
];

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
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
              <Zap className="h-3.5 w-3.5 mr-1.5 text-primary" />
              Platform Features
            </Badge>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Everything you need to{" "}
              <span className="gradient-text">run amazing events</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              From intimate meetups to global hackathons, CloudHub gives you the tools to create
              unforgettable experiences — all in one platform.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Button size="lg" variant="gradient" asChild>
                <Link href="/explore">Explore Events</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Categories */}
      {featureCategories.map((category, catIdx) => (
        <section
          key={category.title}
          className={cn("py-20", catIdx % 2 === 1 && "bg-muted/30")}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
                {category.title}
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                {category.description}
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {category.features.map((feature) => (
                <motion.div key={feature.title} variants={staggerItem}>
                  <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="pt-6 pb-6">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-display text-lg font-bold mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-background to-accent/10 border p-12 text-center"
          >
            <div className="absolute inset-0 grid-bg opacity-30" />
            <div className="relative z-10">
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
                Ready to get started?
              </h2>
              <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-8">
                Join thousands of organizers who trust CloudHub to power their events and hackathons.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Button size="lg" variant="gradient" asChild>
                  <Link href="/register">Create Free Account</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/contact">Talk to Sales</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
