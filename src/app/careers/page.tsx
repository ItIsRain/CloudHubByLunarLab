"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Globe,
  Heart,
  BookOpen,
  TrendingUp,
  Clock,
  Plane,
  MapPin,
  Briefcase,
  ArrowRight,
  Users,
  Building2,
  Rocket,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const stats = [
  { label: "Team Size", value: "25+", icon: Users },
  { label: "Countries", value: "8", icon: Globe },
  { label: "Funding Stage", value: "Series A", icon: Rocket },
];

const perks = [
  {
    title: "Remote First",
    description:
      "Work from anywhere in the world. We believe great work happens where you are most comfortable.",
    icon: Globe,
    color: "text-blue-500 bg-blue-500/10",
  },
  {
    title: "Health & Wellness",
    description:
      "Comprehensive health, dental, and vision coverage plus a monthly wellness stipend.",
    icon: Heart,
    color: "text-rose-500 bg-rose-500/10",
  },
  {
    title: "Learning Budget",
    description:
      "$2,000 annual budget for conferences, courses, books, and professional development.",
    icon: BookOpen,
    color: "text-amber-500 bg-amber-500/10",
  },
  {
    title: "Equity",
    description:
      "Meaningful equity package so everyone shares in the success we build together.",
    icon: TrendingUp,
    color: "text-green-500 bg-green-500/10",
  },
  {
    title: "Flexible Hours",
    description:
      "Set your own schedule. We care about outcomes, not when you sit at your desk.",
    icon: Clock,
    color: "text-purple-500 bg-purple-500/10",
  },
  {
    title: "Team Retreats",
    description:
      "Twice-a-year all-company offsites in amazing locations to connect and recharge.",
    icon: Plane,
    color: "text-cyan-500 bg-cyan-500/10",
  },
];

interface JobListing {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  departmentColor: string;
}

const jobs: JobListing[] = [
  {
    id: "job-1",
    title: "Senior Frontend Engineer",
    department: "Engineering",
    location: "Remote (US/EU)",
    type: "Full-time",
    departmentColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  {
    id: "job-2",
    title: "Backend Engineer",
    department: "Engineering",
    location: "Remote (US/EU)",
    type: "Full-time",
    departmentColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  {
    id: "job-3",
    title: "Product Designer",
    department: "Design",
    location: "Remote (Global)",
    type: "Full-time",
    departmentColor: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  },
  {
    id: "job-4",
    title: "Product Manager",
    department: "Product",
    location: "San Francisco, CA",
    type: "Full-time",
    departmentColor: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  {
    id: "job-5",
    title: "Content Lead",
    department: "Marketing",
    location: "Remote (US)",
    type: "Full-time",
    departmentColor: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  },
  {
    id: "job-6",
    title: "DevOps Engineer",
    department: "Engineering",
    location: "Remote (US/EU)",
    type: "Full-time",
    departmentColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
];

export default function CareersPage() {
  const handleApply = (job: JobListing) => {
    toast.success(`Application started for ${job.title}! Redirecting to application form...`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 dot-bg opacity-30" />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Badge variant="gradient" className="mb-4 text-sm px-4 py-1">
              We&apos;re Hiring
            </Badge>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Join the{" "}
              <span className="gradient-text">CloudHub</span>{" "}
              Team
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              We&apos;re on a mission to make events and hackathons effortless for organizers
              and unforgettable for participants. Help us build the future of community-driven innovation.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex flex-wrap justify-center gap-6 mt-12"
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-3 rounded-2xl border bg-card px-6 py-4 shadow-sm"
              >
                <div className="p-2 rounded-lg bg-primary/10">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Perks & Benefits */}
      <section className="py-20 bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-3">
              Perks & Benefits
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              We take care of our team so they can focus on doing their best work.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {perks.map((perk, i) => (
              <motion.div
                key={perk.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card hover className="h-full">
                  <CardContent className="p-6">
                    <div
                      className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center mb-4",
                        perk.color
                      )}
                    >
                      <perk.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-display font-semibold text-lg mb-2">
                      {perk.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {perk.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-3">
              Open Positions
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Find the role that fits your skills and passion. We&apos;d love to hear from you.
            </p>
          </motion.div>

          <div className="space-y-4">
            {jobs.map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card hover>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-semibold text-lg mb-2">
                          {job.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge className={cn("border", job.departmentColor)}>
                            {job.department}
                          </Badge>
                          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {job.location}
                          </span>
                          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                            <Briefcase className="h-3.5 w-3.5" />
                            {job.type}
                          </span>
                        </div>
                      </div>
                      <Button
                        className="shrink-0"
                        onClick={() => handleApply(job)}
                      >
                        Apply Now
                        <ArrowRight className="h-4 w-4 ml-1.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card glass>
              <CardContent className="p-10 sm:p-14 text-center">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3">
                  Don&apos;t see your role?
                </h2>
                <p className="text-muted-foreground max-w-lg mx-auto mb-6 leading-relaxed">
                  We&apos;re always looking for talented people. Send us your resume and tell us
                  how you can contribute to CloudHub&apos;s mission.
                </p>
                <Button
                  size="lg"
                  variant="gradient"
                  onClick={() =>
                    toast.success(
                      "Thanks for your interest! Redirecting to general application..."
                    )
                  }
                >
                  Send General Application
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
