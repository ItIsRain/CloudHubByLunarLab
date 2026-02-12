"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Lightbulb,
  Users,
  Globe,
  Shield,
  Sparkles,
  Calendar,
  Trophy,
  Twitter,
  Linkedin,
  Github,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const stats = [
  { value: "10,000+", label: "Organizers", icon: Users },
  { value: "50,000+", label: "Events Hosted", icon: Calendar },
  { value: "100+", label: "Countries", icon: Globe },
  { value: "1M+", label: "Attendees", icon: Trophy },
];

const teamMembers = [
  {
    name: "Elena Voss",
    role: "CEO & Co-Founder",
    bio: "Previously VP of Product at EventBrite. Passionate about bringing communities together through technology.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=elena",
    twitter: "elenavoss",
    linkedin: "elenavoss",
  },
  {
    name: "James Nakamura",
    role: "CTO & Co-Founder",
    bio: "Ex-Google engineer with 15+ years building scalable platforms. Obsessed with developer experience.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=james",
    twitter: "jamesnakamura",
    linkedin: "jamesnakamura",
    github: "jamesnakamura",
  },
  {
    name: "Priya Sharma",
    role: "Head of Design",
    bio: "Award-winning designer formerly at Figma. Believes every pixel should spark joy and clarity.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=priya",
    twitter: "priyaDesigns",
    linkedin: "priyasharma",
  },
  {
    name: "Carlos Rivera",
    role: "Head of Growth",
    bio: "Growth veteran who scaled communities at Discord and Notion. Data-driven storyteller.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=carlos",
    twitter: "carlosrivera",
    linkedin: "carlosrivera",
  },
];

const values = [
  {
    icon: Lightbulb,
    title: "Innovation",
    description:
      "We push boundaries to build tools that redefine how communities gather, compete, and collaborate. The future of events is being shaped here.",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    icon: Users,
    title: "Community",
    description:
      "Everything we build starts with the community in mind. We believe the best products emerge from listening, iterating, and growing together.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Globe,
    title: "Accessibility",
    description:
      "Great events should be accessible to everyone, everywhere. We design for inclusivity across devices, geographies, and abilities.",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: Shield,
    title: "Trust",
    description:
      "Your data, your events, your community -- we safeguard them all. Transparency and security are the cornerstones of everything we do.",
    gradient: "from-violet-500 to-purple-500",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-16">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-background to-fuchsia-500/5" />
          <div className="absolute inset-0 dot-bg opacity-40" />
          <motion.div
            className="absolute top-1/3 -left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-orange-500/15 to-rose-500/10 blur-3xl"
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-fuchsia-500/10 to-violet-500/10 blur-3xl"
            animate={{ scale: [1.15, 1, 1.15], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm">
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
              Our Story
            </Badge>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              About{" "}
              <span className="gradient-text">CloudHub</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              We are building the operating system for events and hackathons -- a platform where organizers thrive,
              communities grow, and ideas compete to change the world.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-6">
              Our Mission
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              The world&apos;s most impactful ideas are born when brilliant minds come together. Yet organizing events
              and hackathons remains fragmented across dozens of tools -- ticketing here, team formation there,
              judging somewhere else. CloudHub unifies everything into a single, beautiful platform so organizers
              can focus on what matters: creating unforgettable experiences that spark innovation and build lasting communities.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className="text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="pt-8 pb-8">
                    <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <stat.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="font-display text-3xl sm:text-4xl font-bold gradient-text mb-1">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">
                      {stat.label}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <Badge variant="outline" className="mb-4 px-4 py-1.5 text-sm">
              The Team
            </Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Meet the People Behind{" "}
              <span className="gradient-text">CloudHub</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A passionate team of builders, designers, and community advocates united by a shared vision.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamMembers.map((member, i) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                  <CardContent className="pt-8 pb-6 text-center">
                    <div className="relative mx-auto mb-4">
                      <Avatar className="h-24 w-24 mx-auto ring-4 ring-background shadow-lg">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback>
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <h3 className="font-display text-lg font-bold mb-1">
                      {member.name}
                    </h3>
                    <p className="text-sm text-primary font-medium mb-3">
                      {member.role}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      {member.bio}
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      {member.twitter && (
                        <a
                          href={`https://twitter.com/${member.twitter}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Twitter className="h-4 w-4" />
                        </a>
                      )}
                      {member.linkedin && (
                        <a
                          href={`https://linkedin.com/in/${member.linkedin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Linkedin className="h-4 w-4" />
                        </a>
                      )}
                      {member.github && (
                        <a
                          href={`https://github.com/${member.github}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Github className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <Badge variant="outline" className="mb-4 px-4 py-1.5 text-sm">
              Our Values
            </Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              What Drives Us
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              These principles guide every decision we make, every feature we build, and every community we serve.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, i) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className="h-full group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="pt-8 pb-6">
                    <div
                      className={cn(
                        "mb-4 h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white",
                        value.gradient
                      )}
                    >
                      <value.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-display text-lg font-bold mb-2">
                      {value.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-background" />
              <div className="absolute inset-0 dot-bg opacity-30" />
              <CardContent className="relative py-16 text-center">
                <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
                  Ready to Build Something{" "}
                  <span className="gradient-text">Amazing</span>?
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Join thousands of organizers who trust CloudHub to power their events and hackathons.
                  Start for free -- no credit card required.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button size="lg" asChild>
                    <Link href="/register">
                      Get Started Free
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/contact">
                      Contact Sales
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
