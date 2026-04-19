"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  ArrowRight,
  Sparkles,
  HelpCircle,
  ChevronDown,
  Zap,
  Shield,
  Globe,
  Users,
  BarChart3,
  Video,
  Trophy,
  Calendar,
  Ticket,
  MessageSquare,
  Palette,
  Code2,
  Headphones,
  CreditCard,
  Star,
  Infinity,
  Lock,
  Rocket,
  Heart,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PRICING_TIERS } from "@/lib/constants";
import { useTestimonials } from "@/hooks/use-testimonials";
import { usePlatformStats } from "@/hooks/use-stats";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

/* ——— Feature comparison, grouped by category ——— */
interface ComparisonRow {
  feature: string;
  free: string | boolean;
  enterprise: string | boolean;
  tooltip?: string;
}

interface ComparisonCategory {
  name: string;
  icon: React.ReactNode;
  rows: ComparisonRow[];
}

const comparisonCategories: ComparisonCategory[] = [
  {
    name: "Events & Hosting",
    icon: <Calendar className="h-4 w-4" />,
    rows: [
      { feature: "Events per month", free: "3", enterprise: "Unlimited" },
      { feature: "Attendees per event", free: "100", enterprise: "Unlimited" },
      { feature: "Event page builder", free: "Basic", enterprise: "Custom" },
      { feature: "Custom domains", free: false, enterprise: true },
      { feature: "Multi-session events", free: false, enterprise: true },
      { feature: "Recurring events", free: false, enterprise: true },
      { feature: "Event templates", free: "3", enterprise: "Unlimited" },
    ],
  },
  {
    name: "Ticketing & Payments",
    icon: <Ticket className="h-4 w-4" />,
    rows: [
      { feature: "Free ticket types", free: true, enterprise: true },
      { feature: "Paid ticket types", free: false, enterprise: true },
      { feature: "Promo codes & discounts", free: false, enterprise: true },
      { feature: "Group registrations", free: false, enterprise: true },
      { feature: "Waitlist management", free: false, enterprise: true },
      { feature: "Refund automation", free: false, enterprise: true },
      { feature: "Platform fee", free: "0%", enterprise: "0%" },
      { feature: "Payment processing", free: false, enterprise: true },
    ],
  },
  {
    name: "Competition Management",
    icon: <Trophy className="h-4 w-4" />,
    rows: [
      { feature: "Competitions per month", free: "1", enterprise: "Unlimited" },
      { feature: "Team formation", free: true, enterprise: true },
      { feature: "Submission portal", free: true, enterprise: true },
      { feature: "Judging workflows", free: "Basic", enterprise: "Custom" },
      { feature: "Live leaderboard", free: false, enterprise: true },
      { feature: "Mentor matching", free: false, enterprise: true },
      { feature: "Multi-track competitions", free: false, enterprise: true },
      { feature: "Sponsor portal", free: false, enterprise: true },
      { feature: "Prize disbursement", free: false, enterprise: true },
    ],
  },
  {
    name: "Branding & Design",
    icon: <Palette className="h-4 w-4" />,
    rows: [
      { feature: "CloudHub branding removed", free: false, enterprise: true },
      { feature: "Custom colors & fonts", free: false, enterprise: true },
      { feature: "Custom email templates", free: false, enterprise: true },
      { feature: "Custom registration forms", free: false, enterprise: true },
      { feature: "White-label experience", free: false, enterprise: true },
      { feature: "Custom CSS/JS injection", free: false, enterprise: true },
    ],
  },
  {
    name: "Engagement & Community",
    icon: <Users className="h-4 w-4" />,
    rows: [
      { feature: "Attendee messaging", free: true, enterprise: true },
      { feature: "Email campaigns", free: "100/mo", enterprise: "Unlimited" },
      { feature: "Community spaces", free: "1", enterprise: "Unlimited" },
      { feature: "Live chat during events", free: false, enterprise: true },
      { feature: "Polls & Q&A", free: false, enterprise: true },
      { feature: "Networking AI matchmaking", free: false, enterprise: true },
      { feature: "Gamification & badges", free: false, enterprise: true },
    ],
  },
  {
    name: "Streaming & Content",
    icon: <Video className="h-4 w-4" />,
    rows: [
      { feature: "Embedded video player", free: true, enterprise: true },
      { feature: "Live streaming (RTMP)", free: false, enterprise: true },
      { feature: "Multi-stream support", free: false, enterprise: "Unlimited" },
      { feature: "Recordings & replays", free: false, enterprise: true },
      { feature: "Speaker green rooms", free: false, enterprise: true },
      { feature: "CDN delivery", free: false, enterprise: true },
    ],
  },
  {
    name: "Analytics & Insights",
    icon: <BarChart3 className="h-4 w-4" />,
    rows: [
      { feature: "Basic dashboard", free: true, enterprise: true },
      { feature: "Real-time analytics", free: false, enterprise: true },
      { feature: "Attendee demographics", free: false, enterprise: true },
      { feature: "Revenue reports", free: false, enterprise: true },
      { feature: "Funnel analytics", free: false, enterprise: true },
      { feature: "Custom report builder", free: false, enterprise: true },
      { feature: "Data export (CSV/PDF)", free: false, enterprise: true },
      { feature: "Google Analytics integration", free: false, enterprise: true },
    ],
  },
  {
    name: "Integrations & API",
    icon: <Code2 className="h-4 w-4" />,
    rows: [
      { feature: "Zapier integration", free: false, enterprise: true },
      { feature: "Slack notifications", free: false, enterprise: true },
      { feature: "Google Calendar sync", free: true, enterprise: true },
      { feature: "CRM integrations", free: false, enterprise: true },
      { feature: "REST API access", free: false, enterprise: "Unlimited" },
      { feature: "Webhooks", free: false, enterprise: true },
      { feature: "GraphQL API", free: false, enterprise: true },
      { feature: "Custom OAuth apps", free: false, enterprise: true },
    ],
  },
  {
    name: "Security & Compliance",
    icon: <Shield className="h-4 w-4" />,
    rows: [
      { feature: "SSL encryption", free: true, enterprise: true },
      { feature: "Two-factor authentication", free: true, enterprise: true },
      { feature: "SSO (SAML/OIDC)", free: false, enterprise: true },
      { feature: "Role-based access control", free: false, enterprise: true },
      { feature: "Audit logs", free: false, enterprise: true },
      { feature: "GDPR tools", free: true, enterprise: true },
      { feature: "SOC 2 compliance", free: false, enterprise: true },
      { feature: "Data residency options", free: false, enterprise: true },
    ],
  },
  {
    name: "Support",
    icon: <Headphones className="h-4 w-4" />,
    rows: [
      { feature: "Community forum", free: true, enterprise: true },
      { feature: "Email support", free: true, enterprise: true },
      { feature: "Response time SLA", free: "72h", enterprise: "4h" },
      { feature: "Live chat support", free: false, enterprise: true },
      { feature: "Phone support", free: false, enterprise: true },
      { feature: "Dedicated account manager", free: false, enterprise: true },
      { feature: "Onboarding assistance", free: false, enterprise: true },
      { feature: "99.9% uptime SLA", free: false, enterprise: true },
    ],
  },
];

/* ——— "Why CloudHub" highlights ——— */
const highlights = [
  {
    icon: Rocket,
    title: "Launch in Minutes",
    description: "Go from zero to published event page in under 5 minutes with our drag-and-drop builder.",
  },
  {
    icon: Globe,
    title: "Built for Global Scale",
    description: "Multi-language, multi-currency, multi-timezone. Host events for audiences anywhere.",
  },
  {
    icon: Shield,
    title: "Enterprise-Grade Security",
    description: "SOC 2, GDPR, end-to-end encryption. Your data and your attendees' data are always safe.",
  },
  {
    icon: Zap,
    title: "99.9% Uptime Guarantee",
    description: "We've never missed an event. Redundant infrastructure across 3 continents.",
  },
  {
    icon: Heart,
    title: "Loved by Organizers",
    description: "Organizers rate us highly for ease of use, reliability, and all-in-one convenience.",
  },
  {
    icon: CreditCard,
    title: "No Surprise Fees",
    description: "Transparent pricing. No setup fees, no hidden charges, no per-attendee surcharges.",
  },
];


/* ——— FAQs ——— */
const faqs = [
  {
    question: "Can I try CloudHub before committing?",
    answer:
      "Absolutely. Our Free plan is not a trial — it is a fully functional tier with no time limit. You can host up to 3 events per month with up to 100 attendees each at zero cost, forever. You also get competition management, team formation, and all core features.",
  },
  {
    question: "How do I get an Enterprise plan?",
    answer:
      "Contact our sales team via the contact form or email hello@lnr.ae. We will work with you to understand your needs and put together a custom plan with tailored pricing, features, and support.",
  },
  {
    question: "What happens if I exceed my free plan limits?",
    answer:
      "We will notify you as you approach your plan limits. Your events will never be interrupted — we believe in never ruining your event. We will reach out to help you find the right plan. There are no surprise overage charges.",
  },
  {
    question: "Can I use CloudHub for both events and competitions?",
    answer:
      "Yes! CloudHub is the only platform that natively combines event management with full competition lifecycle support. Every plan includes both capabilities — team formation, project submissions, judging workflows, and live leaderboards alongside ticketing, streaming, and attendee management.",
  },
  {
    question: "Do you offer discounts for nonprofits or education?",
    answer:
      "Yes. Verified nonprofits, educational institutions, and open-source projects can receive special pricing. Contact our team with proof of status and we will work out a plan that fits your needs.",
  },
];

function formatStatValue(value: number, prefix = ""): string {
  if (value >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(1)}M+`;
  if (value >= 1_000) return `${prefix}${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K+`;
  return `${prefix}${value.toLocaleString()}`;
}

export default function PricingPage() {
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(
    new Set(["Events & Hosting"])
  );

  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentTier = user?.subscriptionTier || "free";
  const { data: testimonialsData, isLoading: testimonialsLoading } = useTestimonials(6);
  const { data: statsData } = usePlatformStats();
  const testimonials = testimonialsData?.data || [];
  const platformStats = statsData?.data;

  const trustStats = [
    { value: formatStatValue(platformStats?.eventsHosted || 0), label: "Events Hosted" },
    { value: formatStatValue(platformStats?.totalAttendees || 0), label: "Attendees Served" },
    { value: "99.9%", label: "Uptime" },
    { value: formatStatValue(platformStats?.hackathonsHosted || 0), label: "Hackathons" },
  ];

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

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
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
              Start Free — Upgrade When You're Ready
            </Badge>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              One Platform,{" "}
              <span className="gradient-text">Infinite Possibilities</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
              Everything you need to host world-class events and hackathons — event pages, ticketing, streaming, team formation, judging, analytics, and more.
            </p>
            <p className="text-base text-muted-foreground/80 max-w-xl mx-auto mb-10">
              No credit card required. No hidden fees. Free forever on the Starter plan.
            </p>

            {/* Trust stats bar */}
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mb-12">
              {trustStats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="font-display text-2xl font-bold text-foreground">
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>

          </motion.div>
        </div>
      </section>

      {/* ————— Pricing Cards ————— */}
      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
            {PRICING_TIERS.map((tier, i) => {
              const descriptions: Record<string, string> = {
                Free: "Perfect for getting started. Host events and competitions with zero cost — forever.",
                Enterprise: "For organizations that demand custom solutions, security, and scale.",
              };

              const isCurrentPlan = isAuthenticated && currentTier === tier.id;

              const ctaLabel = isCurrentPlan
                ? "Current Plan"
                : tier.isContactSales
                  ? "Talk to Sales"
                  : "Get Started Free";

              return (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className={cn(
                    "relative",
                    tier.isPopular && "md:-mt-4 md:mb-[-1rem]"
                  )}
                >
                  {tier.isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <Badge variant="gradient" className="px-4 py-1">
                        <Zap className="h-3 w-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <Card
                    className={cn(
                      "h-full transition-all duration-300 hover:-translate-y-1",
                      tier.isPopular
                        ? "border-primary/50 shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/15"
                        : "hover:shadow-lg"
                    )}
                  >
                    <CardContent className="pt-8 pb-8">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display text-xl font-bold">
                          {tier.name}
                        </h3>
                        {isCurrentPlan && (
                          <Badge variant="outline" className="text-xs">Current</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-5">
                        {descriptions[tier.name]}
                      </p>

                      <div className="mb-6">
                        <div className="flex items-baseline gap-1">
                          {tier.isContactSales ? (
                            <span className="font-display text-5xl font-bold">Custom</span>
                          ) : (
                            <span className="font-display text-5xl font-bold">Free</span>
                          )}
                        </div>
                        {tier.isContactSales ? (
                          <p className="text-xs text-muted-foreground mt-1">
                            Tailored to your needs
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">
                            No credit card required
                          </p>
                        )}
                      </div>

                      <Button
                        className="w-full mb-6"
                        variant={tier.isContactSales ? "default" : "outline"}
                        size="lg"
                        disabled={isCurrentPlan}
                        asChild={!isCurrentPlan}
                      >
                        {isCurrentPlan ? (
                          <span>{ctaLabel}</span>
                        ) : (
                          <Link href={tier.isContactSales ? "/contact" : "/register"}>
                            {ctaLabel}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        )}
                      </Button>

                      {/* Feature list */}
                      <div className="space-y-3">
                        {tier.id === "enterprise" && (
                          <FeatureLine highlight>Everything in Free, plus:</FeatureLine>
                        )}
                        {tier.features.map((f) => (
                          <FeatureLine key={f}>{f}</FeatureLine>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* 30-day guarantee callout */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10 text-center"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4 text-primary" />
              <span>Free forever — no credit card needed</span>
            </div>
            <span className="hidden sm:inline text-muted-foreground/40">|</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span>Enterprise-grade security</span>
            </div>
            <span className="hidden sm:inline text-muted-foreground/40">|</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Infinity className="h-4 w-4 text-primary" />
              <span>No hidden fees or lock-in</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ————— Why CloudHub Highlights ————— */}
      <section className="py-20 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <Badge variant="outline" className="mb-4">
              <Star className="h-3.5 w-3.5 mr-1.5 fill-yellow-400 text-yellow-400" />
              Why CloudHub
            </Badge>
            <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4">
              More Than Just a{" "}
              <span className="gradient-text">Pricing Plan</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every plan includes the foundation that makes CloudHub the #1 rated event and hackathon platform.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {highlights.map((h, i) => (
              <motion.div
                key={h.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <Card hover className="h-full">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <h.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-display text-lg font-bold mb-2">{h.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {h.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ————— Social Proof ————— */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Organizers Love{" "}
              <span className="gradient-text">CloudHub</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Hear from teams who switched to CloudHub and never looked back.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonialsLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border p-6 space-y-4">
                    <div className="shimmer h-5 w-28 rounded" />
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, j) => (
                        <div key={j} className="shimmer h-4 w-4 rounded" />
                      ))}
                    </div>
                    <div className="shimmer h-4 w-full rounded" />
                    <div className="shimmer h-4 w-3/4 rounded" />
                    <div className="flex items-center gap-3 pt-2">
                      <div className="shimmer h-8 w-8 rounded-full" />
                      <div className="space-y-2">
                        <div className="shimmer h-3 w-20 rounded" />
                        <div className="shimmer h-3 w-28 rounded" />
                      </div>
                    </div>
                  </div>
                ))
              : testimonials.length > 0
                ? testimonials.slice(0, 3).map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                    >
                      <Card className="h-full">
                        <CardContent className="p-6">
                          {item.highlightStat && (
                            <Badge variant="outline" className="mb-4 text-xs font-semibold text-primary border-primary/30">
                              {item.highlightStat}
                            </Badge>
                          )}
                          <div className="flex gap-0.5 mb-3">
                            {Array.from({ length: 5 }).map((_, j) => (
                              <Star
                                key={j}
                                className={`h-4 w-4 ${
                                  j < item.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                          <blockquote className="text-sm leading-relaxed mb-5">
                            &ldquo;{item.quote}&rdquo;
                          </blockquote>
                          <div className="flex items-center gap-3">
                            <Avatar size="sm">
                              <AvatarImage src={item.user.avatar} />
                              <AvatarFallback>{item.user.name?.charAt(0) || "?"}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-semibold">{item.user.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.role}, {item.company}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                : (
                    <div className="col-span-full text-center py-12">
                      <Star className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground">Testimonials coming soon from our organizers.</p>
                    </div>
                  )}
          </div>
        </div>
      </section>

      {/* ————— Feature Comparison Table (collapsible categories) ————— */}
      <section className="py-20 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge variant="outline" className="mb-4">
              <BarChart3 className="h-3.5 w-3.5 mr-1.5 text-primary" />
              Full Comparison
            </Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Compare Every Feature
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              10 categories, 75+ features. Everything you need to make the right choice.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <Card className="overflow-hidden">
              {/* Sticky header */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px]">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-6 py-4 text-sm font-semibold w-[55%]">
                        Feature
                      </th>
                      <th className="text-center px-4 py-4 text-sm font-semibold w-[22%]">
                        Free
                      </th>
                      <th className="text-center px-4 py-4 text-sm font-semibold w-[22%]">
                        <span className="text-primary">Enterprise</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonCategories.map((category) => {
                      const isExpanded = expandedCategories.has(category.name);
                      return (
                        <React.Fragment key={category.name}>
                          {/* Category header row */}
                          <tr
                            className="border-b bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                            onClick={() => toggleCategory(category.name)}
                          >
                            <td
                              colSpan={3}
                              className="px-6 py-3"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                  {category.icon}
                                </div>
                                <span className="font-display font-semibold text-sm">
                                  {category.name}
                                </span>
                                <Badge variant="muted" className="text-[10px] ml-1">
                                  {category.rows.length}
                                </Badge>
                                <ChevronDown
                                  className={cn(
                                    "h-4 w-4 ml-auto text-muted-foreground transition-transform duration-200",
                                    isExpanded && "rotate-180"
                                  )}
                                />
                              </div>
                            </td>
                          </tr>
                          {/* Feature rows */}
                          <AnimatePresence>
                            {isExpanded &&
                              category.rows.map((row, ri) => (
                                <motion.tr
                                  key={row.feature}
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.15, delay: ri * 0.02 }}
                                  className={cn(
                                    "border-b last:border-b-0 transition-colors hover:bg-muted/30",
                                    ri % 2 === 0 ? "bg-background" : "bg-muted/10"
                                  )}
                                >
                                  <td className="px-6 py-3 text-sm pl-16">
                                    {row.feature}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <CellValue value={row.free} />
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <CellValue value={row.enterprise} highlight />
                                  </td>
                                </motion.tr>
                              ))}
                          </AnimatePresence>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="flex justify-center mt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const allNames = comparisonCategories.map((c) => c.name);
                  const allExpanded = allNames.every((n) => expandedCategories.has(n));
                  setExpandedCategories(allExpanded ? new Set() : new Set(allNames));
                }}
              >
                {comparisonCategories.every((c) => expandedCategories.has(c.name))
                  ? "Collapse All"
                  : "Expand All Categories"}
                <ChevronDown className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ————— FAQ ————— */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge variant="outline" className="mb-4 px-4 py-1.5 text-sm">
              <HelpCircle className="h-3.5 w-3.5 mr-1.5 text-primary" />
              FAQ
            </Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Got Questions?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about pricing, billing, and getting started.
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.04 }}
              >
                <Card
                  className={cn(
                    "transition-all duration-200 cursor-pointer",
                    openFaq === i ? "shadow-md border-primary/30" : "hover:shadow-sm"
                  )}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <CardContent className="py-4 px-6">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-medium text-sm sm:text-base">
                        {faq.question}
                      </h3>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                          openFaq === i && "rotate-180"
                        )}
                      />
                    </div>
                    <AnimatePresence>
                      {openFaq === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                            {faq.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ————— Final CTA ————— */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-background" />
              <div className="absolute inset-0 dot-bg opacity-30" />
              <CardContent className="relative py-20 text-center">
                <Badge variant="gradient" className="mb-6">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Ready to Launch?
                </Badge>
                <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4">
                  Your Next Event{" "}
                  <span className="gradient-text">Starts Here</span>
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Join organizers who chose CloudHub to host their events and hackathons.
                  Start free, scale infinitely.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button size="xl" asChild>
                    <Link href="/register">
                      Get Started Free
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button size="xl" variant="outline" asChild>
                    <Link href="/contact">Talk to Sales</Link>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-6">
                  No credit card required. Free forever on the Starter plan.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ——— Small helper components ——— */

function FeatureLine({
  children,
  highlight,
}: {
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0",
          highlight ? "bg-primary/20" : "bg-primary/10"
        )}
      >
        <Check className="h-3 w-3 text-primary" />
      </div>
      <span
        className={cn(
          "text-sm",
          highlight
            ? "font-semibold text-foreground"
            : "text-muted-foreground"
        )}
      >
        {children}
      </span>
    </div>
  );
}

function CellValue({
  value,
  highlight,
}: {
  value: string | boolean;
  highlight?: boolean;
}) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="h-4 w-4 text-primary mx-auto" />
    ) : (
      <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />
    );
  }
  return (
    <span
      className={cn(
        "text-sm",
        highlight ? "font-medium text-primary" : "text-muted-foreground"
      )}
    >
      {value}
    </span>
  );
}
