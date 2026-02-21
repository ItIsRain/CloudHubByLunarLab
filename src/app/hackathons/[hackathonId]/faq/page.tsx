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
import { useHackathon } from "@/hooks/use-hackathons";
import { cn } from "@/lib/utils";
import type { FAQItem } from "@/lib/types";

const categoryColors: Record<string, string> = {
  General: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Registration: "bg-green-500/10 text-green-600 border-green-500/20",
  Teams: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Submissions: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  Prizes: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

export default function HackathonFAQPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;

  const { data: hackathonData, isLoading } = useHackathon(hackathonId);
  const hackathon = hackathonData?.data;

  const [openIndices, setOpenIndices] = React.useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = React.useState<string>("all");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="shimmer rounded-xl h-96 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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

  const faqs: FAQItem[] = hackathon.faqs ?? [];

  // Collect unique categories from FAQs
  const categories = Array.from(new Set(faqs.map((f) => f.category).filter(Boolean))) as string[];

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

          {faqs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-3xl"
            >
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <HelpCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <h3 className="font-display text-lg font-bold mb-1">No FAQs Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    The organizer hasn&apos;t added any frequently asked questions yet. Check back later or contact the organizer.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <>
              {/* Category Filter */}
              {categories.length > 1 && (
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
              )}

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
                                {faq.category && (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[10px] mt-1.5",
                                      categoryColors[faq.category] || ""
                                    )}
                                  >
                                    {faq.category}
                                  </Badge>
                                )}
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
            </>
          )}

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
