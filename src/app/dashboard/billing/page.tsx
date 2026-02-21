"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  CreditCard,
  Check,
  Zap,
  Download,
  Receipt,
  ArrowRight,
  Crown,
  Shield,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { PRICING_TIERS, PLAN_LIMITS } from "@/lib/constants";
import { useCheckout, useCustomerPortal } from "@/hooks/use-subscription";
import { useUsage } from "@/hooks/use-usage";
import { UsageBar } from "@/components/ui/usage-bar";

const featureLabels: { key: keyof ReturnType<typeof useUsage>["features"]; label: string; proLabel: string }[] = [
  { key: "paidTicketing", label: "Paid Ticketing", proLabel: "Pro+" },
  { key: "customBranding", label: "Custom Branding", proLabel: "Pro+" },
  { key: "analytics", label: "Advanced Analytics", proLabel: "Pro+" },
  { key: "apiAccess", label: "API Access", proLabel: "Enterprise" },
  { key: "prioritySupport", label: "Priority Support", proLabel: "Pro+" },
];

function PlanUsageSection({
  tier,
  handleUpgrade,
  isCheckoutLoading,
}: {
  tier: string;
  handleUpgrade: () => void;
  isCheckoutLoading: boolean;
}) {
  const { eventsThisMonth, hackathonsThisMonth, attendeesPerEvent, features, isLoading } = useUsage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-8"
    >
      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Resource Usage */}
          <div>
            <h3 className="font-display text-lg font-semibold mb-4">Resource Usage</h3>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="shimmer h-4 w-full rounded" />
                    <div className="shimmer h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <UsageBar
                  used={eventsThisMonth.used}
                  limit={eventsThisMonth.limit}
                  label="Events this month"
                />
                <UsageBar
                  used={hackathonsThisMonth.used}
                  limit={hackathonsThisMonth.limit}
                  label="Hackathons this month"
                />
                <UsageBar
                  used={attendeesPerEvent.used}
                  limit={attendeesPerEvent.limit}
                  label="Attendees (largest event)"
                />
              </div>
            )}
          </div>

          {/* Features */}
          <div className="border-t border-border pt-6">
            <h3 className="font-display text-lg font-semibold mb-4">Features</h3>
            <div className="space-y-3">
              {featureLabels.map(({ key, label, proLabel }) => {
                const enabled = features[key];
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {enabled ? (
                        <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={cn("text-sm", !enabled && "text-muted-foreground")}>
                        {label}
                      </span>
                    </div>
                    {enabled ? (
                      <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">
                        Included
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        {proLabel}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upgrade CTA */}
          {tier === "free" && (
            <div className="border-t border-border pt-6">
              <Button onClick={handleUpgrade} disabled={isCheckoutLoading} className="w-full">
                <Zap className="h-4 w-4 mr-2" />
                {isCheckoutLoading ? "Redirecting..." : "Unlock All Features"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function BillingContent() {
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const [isCheckoutLoading, setIsCheckoutLoading] = React.useState(false);
  const [isPortalLoading, setIsPortalLoading] = React.useState(false);

  const checkout = useCheckout();
  const openPortal = useCustomerPortal();

  const tier = user?.subscriptionTier || "free";
  const status = user?.subscriptionStatus || "inactive";
  const periodEnd = user?.currentPeriodEnd;
  const limits = PLAN_LIMITS[tier];
  const currentTierConfig = PRICING_TIERS.find((t) => t.id === tier);

  // Handle success/canceled query params
  React.useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Subscription activated! Welcome to Pro.");
      // Poll for webhook to update profile
      const interval = setInterval(() => {
        fetchUser();
      }, 2000);
      const timeout = setTimeout(() => clearInterval(interval), 15000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
    if (searchParams.get("canceled") === "true") {
      toast.info("Checkout canceled. No charges were made.");
    }
  }, [searchParams, fetchUser]);

  const handleUpgrade = async () => {
    setIsCheckoutLoading(true);
    try {
      await checkout("monthly");
    } catch {
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsPortalLoading(true);
    try {
      await openPortal();
    } catch {
      toast.error("Failed to open billing portal. Please try again.");
    } finally {
      setIsPortalLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="font-display text-3xl font-bold mb-1">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and billing</p>
      </motion.div>

      {/* Current Plan Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-8"
      >
        <Card className={cn(
          tier === "pro" ? "border-primary/30 bg-primary/5" : "border-border"
        )}>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {tier === "pro" ? (
                    <Crown className="h-5 w-5 text-primary" />
                  ) : (
                    <Shield className="h-5 w-5 text-muted-foreground" />
                  )}
                  <h2 className="font-display text-2xl font-bold">
                    {currentTierConfig?.name || "Free"} Plan
                  </h2>
                  <Badge variant={status === "active" ? "default" : "outline"}>
                    {status === "active" ? "Active" : status === "past_due" ? "Past Due" : tier === "free" ? "Free" : status}
                  </Badge>
                </div>
                {tier === "free" ? (
                  <p className="text-sm text-muted-foreground">
                    You&apos;re on the free plan. Upgrade to Pro to unlock unlimited events.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {periodEnd
                      ? `Next billing date: ${formatDate(periodEnd)}`
                      : "Subscription active"}
                  </p>
                )}
              </div>
              {tier === "free" ? (
                <Button onClick={handleUpgrade} disabled={isCheckoutLoading}>
                  <Zap className="h-4 w-4 mr-2" />
                  {isCheckoutLoading ? "Redirecting..." : "Upgrade to Pro"}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleManageSubscription}
                  disabled={isPortalLoading}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {isPortalLoading ? "Opening..." : "Manage Subscription"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Plan Usage & Features */}
      <PlanUsageSection tier={tier} handleUpgrade={handleUpgrade} isCheckoutLoading={isCheckoutLoading} />

      {/* Available Plans (only show if on free) */}
      {tier === "free" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <h2 className="font-display text-xl font-bold mb-4">Available Plans</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {PRICING_TIERS.map((planTier, i) => (
              <motion.div
                key={planTier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
              >
                <Card
                  className={cn(
                    "h-full flex flex-col",
                    planTier.isPopular && "border-primary shadow-lg relative"
                  )}
                >
                  {planTier.isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                    </div>
                  )}
                  <CardContent className="p-6 flex flex-col flex-1">
                    <h3 className="font-display text-xl font-bold">{planTier.name}</h3>
                    <div className="mt-2 mb-4">
                      {planTier.isContactSales ? (
                        <span className="font-display text-4xl font-bold">Custom</span>
                      ) : (
                        <>
                          <span className="font-display text-4xl font-bold">
                            {planTier.monthlyPrice === 0 ? "Free" : `$${planTier.monthlyPrice}`}
                          </span>
                          {planTier.monthlyPrice !== null && planTier.monthlyPrice > 0 && (
                            <span className="text-muted-foreground text-sm">/month</span>
                          )}
                        </>
                      )}
                    </div>
                    <ul className="space-y-2 flex-1 mb-6">
                      {planTier.features.slice(0, 5).map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {planTier.id === tier ? (
                      <Button variant="outline" className="w-full" disabled>
                        Current Plan
                      </Button>
                    ) : planTier.isContactSales ? (
                      <Button variant="outline" className="w-full" asChild>
                        <Link href="/contact">Talk to Sales</Link>
                      </Button>
                    ) : planTier.id === "pro" ? (
                      <Button
                        className="w-full"
                        onClick={handleUpgrade}
                        disabled={isCheckoutLoading}
                      >
                        {isCheckoutLoading ? "Redirecting..." : "Upgrade to Pro"}
                        {!isCheckoutLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>
                        Current Plan
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Invoice History — placeholder for Stripe portal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Invoice History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tier === "free" ? (
              <div className="text-center py-8">
                <Download className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No invoices yet. Invoices will appear here when you upgrade to a paid plan.
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">
                  View and download invoices from the Stripe customer portal.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManageSubscription}
                  disabled={isPortalLoading}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  View Invoices
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-16">
        <Suspense fallback={
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
            <div className="h-32 bg-muted animate-pulse rounded" />
          </div>
        }>
          <BillingContent />
        </Suspense>
      </main>
    </div>
  );
}
