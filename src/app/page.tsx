"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Users,
  Trophy,
  Ticket,
  BarChart3,
  Video,
  Zap,
  ChevronRight,
  Star,
  Play,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EventCard } from "@/components/cards/event-card";
import { HackathonCard } from "@/components/cards/hackathon-card";
import {
  getFeaturedEvents,
  getActiveHackathons,
  mockPricingTiers,
} from "@/lib/mock-data";

const features = [
  {
    icon: Ticket,
    title: "Beautiful Event Pages",
    description:
      "Create stunning event pages in minutes with our drag-and-drop builder. Custom branding, rich media, and seamless ticketing.",
  },
  {
    icon: Trophy,
    title: "Hackathon Management",
    description:
      "End-to-end hackathon platform with team formation, project submissions, judging workflows, and live leaderboards.",
  },
  {
    icon: Users,
    title: "Team Formation",
    description:
      "Smart matching helps participants find the perfect teammates based on skills, interests, and availability.",
  },
  {
    icon: Ticket,
    title: "Ticketing & Payments",
    description:
      "Flexible ticket types, promo codes, group discounts, and seamless Stripe integration for secure payments.",
  },
  {
    icon: Video,
    title: "Live Streaming",
    description:
      "Built-in live streaming, chat, and Q&A for virtual and hybrid events. No external tools needed.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description:
      "Track registrations, engagement, and revenue with real-time dashboards and exportable reports.",
  },
];

const testimonials = [
  {
    quote:
      "CloudHub transformed how we run hackathons. The team formation feature alone saved us hundreds of hours.",
    author: "Sarah Chen",
    role: "Director of Developer Relations",
    company: "TechCorp",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
  },
  {
    quote:
      "The most intuitive event platform I've ever used. Our attendee satisfaction scores have never been higher.",
    author: "Michael Torres",
    role: "Community Manager",
    company: "StartupHub",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=michael",
  },
  {
    quote:
      "From 50 person meetups to 2000+ person conferences, CloudHub scales beautifully with our growing community.",
    author: "Emily Rodriguez",
    role: "Events Lead",
    company: "DevCommunity",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emily",
  },
];

const stats = [
  { value: "10K+", label: "Events Hosted" },
  { value: "500K+", label: "Attendees" },
  { value: "2,500+", label: "Hackathons" },
  { value: "$5M+", label: "Prizes Distributed" },
];

const typewriterTexts = [
  "Hackathons",
  "Conferences",
  "Meetups",
  "Workshops",
  "Webinars",
];

function TypewriterText() {
  const [index, setIndex] = React.useState(0);
  const [text, setText] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    const currentWord = typewriterTexts[index];
    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          setText(currentWord.slice(0, text.length + 1));
          if (text === currentWord) {
            setTimeout(() => setIsDeleting(true), 2000);
          }
        } else {
          setText(currentWord.slice(0, text.length - 1));
          if (text === "") {
            setIsDeleting(false);
            setIndex((prev) => (prev + 1) % typewriterTexts.length);
          }
        }
      },
      isDeleting ? 50 : 100
    );
    return () => clearTimeout(timeout);
  }, [text, isDeleting, index]);

  return (
    <span className="text-primary">
      {text}
      <span className="animate-pulse">|</span>
    </span>
  );
}

function VideoPlayer({ videoId }: { videoId: string }) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  return (
    <div className="relative w-full aspect-video">
      {isPlaying ? (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&showinfo=0`}
          title="CloudHub Platform Demo"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      ) : (
        <button
          onClick={() => setIsPlaying(true)}
          className="absolute inset-0 w-full h-full group cursor-pointer"
        >
          {/* Thumbnail */}
          <Image
            src={thumbnailUrl}
            alt="Video thumbnail"
            fill
            className="object-cover"
            priority
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/95 flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:bg-white transition-all duration-300">
              <Play className="h-8 w-8 text-primary fill-primary ml-1" />
            </div>
          </div>

          {/* Watch label */}
          <div className="absolute bottom-6 left-6 flex items-center gap-2 text-white">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium">Watch Demo</span>
          </div>
        </button>
      )}
    </div>
  );
}

export default function HomePage() {
  const featuredEvents = getFeaturedEvents();
  const activeHackathons = getActiveHackathons();

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-background to-fuchsia-500/5" />
          <div className="absolute inset-0 grid-bg opacity-50" />
          <motion.div
            className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-orange-500/20 to-rose-500/10 blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.4, 0.6, 0.4],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-fuchsia-500/15 to-violet-500/10 blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm">
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
              Trusted by 10,000+ organizers worldwide
            </Badge>

            {/* Headline */}
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Where Ideas Compete
              <br />
              <span className="gradient-text">& Communities Thrive</span>
            </h1>

            {/* Typewriter subtitle */}
            <p className="text-xl sm:text-2xl text-muted-foreground mb-4 max-w-2xl mx-auto">
              The all-in-one platform for hosting <TypewriterText />
            </p>

            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              Create beautiful event pages, manage hackathons end-to-end, and build
              engaged communities. All in one powerful platform.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button size="xl" asChild>
                <Link href="/explore">
                  Explore Events
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="xl" variant="outline" asChild>
                <Link href="/events/create">
                  Host an Event
                  <ChevronRight className="ml-1 h-5 w-5" />
                </Link>
              </Button>
            </div>

            {/* Social Proof Logos */}
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Trusted by teams at
              </p>
              <div className="flex items-center justify-center gap-10 opacity-70">
                {/* Ru'ya Logo */}
                <Image
                  src="/RuYaLogo.svg"
                  alt="Ru'ya Careers UAE"
                  width={120}
                  height={40}
                  className="h-8 w-auto brightness-0 dark:brightness-100"
                />
                {/* ADNOC Logo */}
                <Image
                  src="/AdnocLogo.svg"
                  alt="ADNOC"
                  width={120}
                  height={40}
                  className="h-8 w-auto brightness-0 dark:brightness-100"
                />
              </div>
            </div>
          </motion.div>

          {/* Hero Video */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 relative"
          >
            <div className="relative mx-auto max-w-5xl rounded-2xl border shadow-2xl overflow-hidden">
              <VideoPlayer videoId="93BI3hZzKk4" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center"
              >
                <div className="font-display text-4xl sm:text-5xl font-bold gradient-text mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4">
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              Powerful Features
            </Badge>
            <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4">
              Everything you need to
              <br />
              <span className="gradient-text">host amazing events</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From intimate meetups to massive hackathons, our platform provides
              all the tools you need to create unforgettable experiences.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card hover className="h-full">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-display text-xl font-bold mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-2">
                Upcoming Events
              </h2>
              <p className="text-muted-foreground">
                Discover exciting events happening near you
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/explore/events">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredEvents.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <EventCard event={event} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Active Hackathons */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="font-display text-3xl sm:text-4xl font-bold">
                  Active Hackathons
                </h2>
                <Badge variant="gradient" dot pulse>
                  Live
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Join a hackathon and build something amazing
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/explore/hackathons">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeHackathons.slice(0, 2).map((hackathon, i) => (
              <motion.div
                key={hackathon.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <HackathonCard hackathon={hackathon} variant="featured" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4">
              <Star className="h-3.5 w-3.5 mr-1.5 fill-yellow-400 text-yellow-400" />
              Testimonials
            </Badge>
            <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4">
              Loved by organizers
              <br />
              <span className="gradient-text">around the world</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>
                    <blockquote className="text-lg mb-6">
                      "{testimonial.quote}"
                    </blockquote>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={testimonial.avatar} />
                        <AvatarFallback>
                          {testimonial.author.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{testimonial.author}</div>
                        <div className="text-sm text-muted-foreground">
                          {testimonial.role}, {testimonial.company}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4">
              Pricing
            </Badge>
            <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4">
              Simple, transparent
              <br />
              <span className="gradient-text">pricing</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start for free, upgrade when you need more. No hidden fees.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {mockPricingTiers.map((tier, i) => (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card
                  className={
                    tier.isPopular
                      ? "border-primary shadow-lg relative"
                      : "relative"
                  }
                >
                  {tier.isPopular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                      Most Popular
                    </Badge>
                  )}
                  <CardContent className="p-6">
                    <h3 className="font-display text-xl font-bold mb-2">
                      {tier.name}
                    </h3>
                    <div className="mb-4">
                      <span className="font-display text-4xl font-bold">
                        ${tier.price}
                      </span>
                      {tier.price > 0 && (
                        <span className="text-muted-foreground">/month</span>
                      )}
                    </div>
                    <ul className="space-y-3 mb-6">
                      {tier.features.slice(0, 5).map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-sm"
                        >
                          <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={tier.isPopular ? "default" : "outline"}
                      asChild
                    >
                      <Link href="/pricing">
                        {tier.price === 0 ? "Get Started" : "Start Free Trial"}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-background to-fuchsia-500/10" />
        <div className="absolute inset-0 noise" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Ready to create
              <br />
              <span className="gradient-text">amazing events?</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              Join thousands of organizers who trust CloudHub to power their
              events and hackathons. Get started for free today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="xl" asChild>
                <Link href="/register">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="xl" variant="outline" asChild>
                <Link href="/contact">Contact Sales</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
