"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  ArrowLeft,
  ChevronDown,
  HelpCircle,
  MessageCircleQuestion,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockHackathons } from "@/lib/mock-data";
import { cn, formatDate } from "@/lib/utils";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: "General" | "Registration" | "Teams" | "Submissions" | "Prizes";
}

function generateFAQs(hackathon: {
  name: string;
  eligibility: string[];
  minTeamSize: number;
  maxTeamSize: number;
  allowSolo: boolean;
  type: string;
  submissionDeadline: string;
  winnersAnnouncement: string;
  totalPrizePool: number;
}): FAQItem[] {
  return [
    {
      id: "faq-1",
      question: "Who can participate in this hackathon?",
      answer: `${hackathon.eligibility.join(". ")}. We welcome participants of all backgrounds and skill levels. Whether you're a beginner or an experienced developer, there's a place for you at ${hackathon.name}.`,
      category: "General",
    },
    {
      id: "faq-2",
      question: "Is this hackathon free to join?",
      answer: `Yes! ${hackathon.name} is completely free to participate in. All you need is a passion for building and a willingness to learn.`,
      category: "General",
    },
    {
      id: "faq-3",
      question: "How do I register?",
      answer:
        "Click the 'Register Now' button on the hackathon page. You'll need to create a CloudHub account if you don't have one. Registration takes less than 2 minutes.",
      category: "Registration",
    },
    {
      id: "faq-4",
      question: "Can I participate remotely?",
      answer:
        hackathon.type === "online"
          ? "Yes! This is a fully online hackathon. You can participate from anywhere in the world."
          : hackathon.type === "hybrid"
            ? "Yes! This is a hybrid hackathon. You can choose to participate either in-person at the venue or remotely from anywhere."
            : "This is an in-person hackathon. You'll need to be present at the venue for the duration of the event.",
      category: "Registration",
    },
    {
      id: "faq-5",
      question: "How do teams work?",
      answer: `Teams can have ${hackathon.minTeamSize} to ${hackathon.maxTeamSize} members. ${hackathon.allowSolo ? "Solo participation is allowed, but we encourage forming teams for the best experience." : "You must be part of a team to participate."} You can form a team before the hackathon or use our team formation feature to find teammates.`,
      category: "Teams",
    },
    {
      id: "faq-6",
      question: "What if I don't have a team?",
      answer:
        "No worries! We have a team formation feature where you can browse open teams looking for members. You can also post your skills and interests so teams can find you. We'll also host a team formation session at the start of the hackathon.",
      category: "Teams",
    },
    {
      id: "faq-7",
      question: "What do I need to submit?",
      answer: `Your submission should include: a project name and description, a link to your GitHub repository, a demo URL or video, and the tech stack used. All submissions must be made before ${formatDate(hackathon.submissionDeadline)}.`,
      category: "Submissions",
    },
    {
      id: "faq-8",
      question: "How will projects be judged?",
      answer:
        "Projects are evaluated by our panel of expert judges based on criteria including Innovation, Technical Execution, Impact & Usefulness, Presentation & Demo, and Design & UX. Each criterion is weighted and scored on a 10-point scale.",
      category: "Submissions",
    },
    {
      id: "faq-9",
      question: "When will winners be announced?",
      answer: `Winners will be announced on ${formatDate(hackathon.winnersAnnouncement)}. All participants will be notified via email and through the CloudHub platform. Winners will also be featured on the hackathon leaderboard.`,
      category: "Prizes",
    },
    {
      id: "faq-10",
      question: "How are prizes distributed?",
      answer: `The total prize pool is $${hackathon.totalPrizePool.toLocaleString()}. Prizes are distributed to winning teams within 30 days of the winner announcement. Cash prizes are split equally among team members unless the team specifies otherwise.`,
      category: "Prizes",
    },
  ];
}

const categoryColors: Record<string, string> = {
  General: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Registration: "bg-green-500/10 text-green-600 border-green-500/20",
  Teams: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Submissions: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  Prizes: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

const categories = ["General", "Registration", "Teams", "Submissions", "Prizes"] as const;

export default function HackathonFAQPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;

  const hackathon = mockHackathons.find(
    (h) => h.id === hackathonId || h.slug === hackathonId
  );

  const [openIndices, setOpenIndices] = React.useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = React.useState<string>("all");

  if (!hackathon) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16 text-center">
          <div className="mx-auto max-w-md">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h1 className="font-display text-3xl font-bold mb-2">
              Hackathon Not Found
            </h1>
            <p className="text-muted-foreground mb-6">
              The hackathon you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Button asChild>
              <Link href="/hackathons">Browse Hackathons</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const faqs = generateFAQs(hackathon);

  const filteredFAQs =
    activeCategory === "all"
      ? faqs
      : faqs.filter((f) => f.category === activeCategory);

  const toggleFAQ = (id: string) => {
    setOpenIndices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link
              href={`/hackathons/${hackathonId}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {hackathon.name}
            </Link>
          </motion.div>

          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display text-4xl font-bold mb-2">
              Frequently Asked Questions
            </h1>
            <p className="text-muted-foreground text-lg">
              Everything you need to know about {hackathon.name}
            </p>
          </motion.div>

          {/* Category Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex flex-wrap gap-2 mb-8"
          >
            <Button
              variant={activeCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory("all")}
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </motion.div>

          {/* FAQ Accordion */}
          <div className="max-w-3xl space-y-3">
            {filteredFAQs.map((faq, i) => {
              const isOpen = openIndices.has(faq.id);

              return (
                <motion.div
                  key={faq.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    className={cn(
                      "transition-shadow",
                      isOpen && "shadow-md ring-1 ring-primary/10"
                    )}
                  >
                    <CardContent className="p-0">
                      {/* Question (clickable header) */}
                      <button
                        onClick={() => toggleFAQ(faq.id)}
                        className="w-full flex items-center justify-between p-5 text-left"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <HelpCircle
                            className={cn(
                              "h-5 w-5 flex-shrink-0 mt-0.5 transition-colors",
                              isOpen
                                ? "text-primary"
                                : "text-muted-foreground"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "font-medium transition-colors",
                                isOpen ? "text-primary" : "text-foreground"
                              )}
                            >
                              {faq.question}
                            </p>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] mt-1.5",
                                categoryColors[faq.category] || ""
                              )}
                            >
                              {faq.category}
                            </Badge>
                          </div>
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform duration-200",
                            isOpen && "rotate-180"
                          )}
                        />
                      </button>

                      {/* Answer (collapsible) */}
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-5 pl-13">
                              <div className="pl-8 border-l-2 border-primary/20">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {faq.answer}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Still have questions? */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-3xl mt-12 text-center"
          >
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-8">
                <MessageCircleQuestion className="h-10 w-10 mx-auto text-primary mb-3" />
                <h3 className="font-display text-xl font-bold mb-2">
                  Still have questions?
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Can&apos;t find what you&apos;re looking for? Reach out to the
                  organizer team and we&apos;ll get back to you as soon as
                  possible.
                </p>
                <Button>Contact Organizers</Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
