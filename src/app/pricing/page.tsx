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
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { mockPricingTiers } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const featureComparison = [
  { feature: "Events per month", free: "1", pro: "Unlimited", enterprise: "Unlimited" },
  { feature: "Attendees per event", free: "50", pro: "500", enterprise: "Unlimited" },
  { feature: "Custom branding", free: false, pro: true, enterprise: true },
  { feature: "Advanced analytics", free: false, pro: true, enterprise: true },
  { feature: "Priority support", free: false, pro: true, enterprise: true },
  { feature: "Custom registration forms", free: false, pro: true, enterprise: true },
  { feature: "Promo codes & discounts", free: false, pro: true, enterprise: true },
  { feature: "API access", free: false, pro: false, enterprise: true },
  { feature: "SSO integration", free: false, pro: false, enterprise: true },
  { feature: "Dedicated account manager", free: false, pro: false, enterprise: true },
  { feature: "Custom integrations", free: false, pro: false, enterprise: true },
  { feature: "SLA guarantee", free: false, pro: false, enterprise: true },
  { feature: "White-label options", free: false, pro: false, enterprise: true },
];

const faqs = [
  {
    question: "Can I try CloudHub before committing to a paid plan?",
    answer:
      "Absolutely. Our Free plan is not a trial -- it is a fully functional tier with no time limit. You can host one event per month with up to 50 attendees at zero cost, forever. Upgrade whenever you are ready.",
  },
  {
    question: "How does annual billing work?",
    answer:
      "When you switch to annual billing, you pay for 12 months upfront and receive a 20% discount compared to monthly pricing. Your subscription renews automatically each year, and you can cancel or switch back to monthly at any time before renewal.",
  },
  {
    question: "Can I change my plan at any time?",
    answer:
      "Yes. You can upgrade or downgrade your plan at any point. When upgrading, you will be charged the prorated difference for the remainder of your billing cycle. When downgrading, the new rate applies at your next billing date.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit and debit cards (Visa, Mastercard, American Express) processed securely through Stripe. Enterprise customers can also pay via invoice with net-30 terms.",
  },
  {
    question: "Is there a refund policy?",
    answer:
      "We offer a 14-day money-back guarantee on all paid plans. If CloudHub is not the right fit, contact our support team within 14 days of your purchase for a full refund -- no questions asked.",
  },
  {
    question: "What happens if I exceed my plan limits?",
    answer:
      "We will notify you as you approach your plan limits. Your events will not be interrupted; instead, we will reach out to help you find the right plan. There are no surprise overage charges.",
  },
];

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = React.useState(false);
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  const getPrice = (monthlyPrice: number) => {
    if (monthlyPrice === 0) return 0;
    return isAnnual ? Math.round(monthlyPrice * 0.8) : monthlyPrice;
  };

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
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
              Pricing
            </Badge>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Simple, Transparent{" "}
              <span className="gradient-text">Pricing</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Start free and scale as you grow. No hidden fees, no surprises.
              Just the tools you need to create exceptional events.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-12">
              <span
                className={cn(
                  "text-sm font-medium transition-colors",
                  !isAnnual ? "text-foreground" : "text-muted-foreground"
                )}
              >
                Monthly
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={cn(
                  "relative h-7 w-12 rounded-full transition-colors duration-200",
                  isAnnual ? "bg-primary" : "bg-muted-foreground/30"
                )}
              >
                <motion.div
                  className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md"
                  animate={{ left: isAnnual ? "calc(100% - 1.625rem)" : "0.125rem" }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
              <span
                className={cn(
                  "text-sm font-medium transition-colors",
                  isAnnual ? "text-foreground" : "text-muted-foreground"
                )}
              >
                Annual
              </span>
              {isAnnual && (
                <Badge variant="success" className="ml-1">
                  Save 20%
                </Badge>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {mockPricingTiers.map((tier, i) => (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
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
                    <h3 className="font-display text-xl font-bold mb-2">
                      {tier.name}
                    </h3>
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-5xl font-bold">
                          ${getPrice(tier.price)}
                        </span>
                        {tier.price > 0 && (
                          <span className="text-muted-foreground text-sm">
                            /{isAnnual ? "mo" : "mo"}
                          </span>
                        )}
                      </div>
                      {tier.price > 0 && isAnnual && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Billed annually (${getPrice(tier.price) * 12}/yr)
                        </p>
                      )}
                      {tier.price === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Free forever
                        </p>
                      )}
                    </div>

                    <Button
                      className="w-full mb-6"
                      variant={tier.isPopular ? "default" : "outline"}
                      asChild
                    >
                      <Link href="/register">
                        {tier.price === 0 ? "Get Started" : "Start Free Trial"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>

                    <div className="space-y-3">
                      {tier.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-3">
                          <div className="mt-0.5 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Compare Plans
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A detailed breakdown of what each plan includes so you can pick the right one.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-6 py-4 text-sm font-semibold">
                        Feature
                      </th>
                      <th className="text-center px-6 py-4 text-sm font-semibold">
                        Free
                      </th>
                      <th className="text-center px-6 py-4 text-sm font-semibold">
                        <span className="text-primary">Pro</span>
                      </th>
                      <th className="text-center px-6 py-4 text-sm font-semibold">
                        Enterprise
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {featureComparison.map((row, i) => (
                      <tr
                        key={row.feature}
                        className={cn(
                          "border-b last:border-b-0 transition-colors hover:bg-muted/30",
                          i % 2 === 0 && "bg-muted/10"
                        )}
                      >
                        <td className="px-6 py-3.5 text-sm font-medium">
                          {row.feature}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {typeof row.free === "boolean" ? (
                            row.free ? (
                              <Check className="h-4 w-4 text-primary mx-auto" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                            )
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {row.free}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {typeof row.pro === "boolean" ? (
                            row.pro ? (
                              <Check className="h-4 w-4 text-primary mx-auto" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                            )
                          ) : (
                            <span className="text-sm font-medium text-primary">
                              {row.pro}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {typeof row.enterprise === "boolean" ? (
                            row.enterprise ? (
                              <Check className="h-4 w-4 text-primary mx-auto" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                            )
                          ) : (
                            <span className="text-sm font-medium">
                              {row.enterprise}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
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
              <HelpCircle className="h-3.5 w-3.5 mr-1.5 text-primary" />
              FAQ
            </Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about our pricing and billing.
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              >
                <Card
                  className={cn(
                    "transition-all duration-200 cursor-pointer",
                    openFaq === i ? "shadow-md" : "hover:shadow-sm"
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
                  Start Your Free Trial{" "}
                  <span className="gradient-text">Today</span>
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Join 10,000+ organizers already using CloudHub. No credit card required.
                </p>
                <Button size="lg" asChild>
                  <Link href="/register">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
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
