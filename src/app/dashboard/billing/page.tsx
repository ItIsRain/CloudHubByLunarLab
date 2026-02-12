"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  Check,
  Zap,
  Download,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { mockPricingTiers } from "@/lib/mock-data";

const mockInvoices = [
  { id: "inv-1", date: new Date(Date.now() - 30 * 86400000).toISOString(), amount: 0, plan: "Free", status: "paid" },
  { id: "inv-2", date: new Date(Date.now() - 60 * 86400000).toISOString(), amount: 0, plan: "Free", status: "paid" },
  { id: "inv-3", date: new Date(Date.now() - 90 * 86400000).toISOString(), amount: 0, plan: "Free", status: "paid" },
];

export default function BillingPage() {
  const currentPlan = mockPricingTiers[0]; // Free tier

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display text-3xl font-bold mb-1">Billing</h1>
            <p className="text-muted-foreground">Manage your subscription and billing</p>
          </motion.div>

          {/* Current Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-8"
          >
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-display text-2xl font-bold">Current Plan</h2>
                      <Badge>{currentPlan.name}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currentPlan.price === 0
                        ? "You're on the free plan."
                        : `${formatCurrency(currentPlan.price)}/month`}
                    </p>
                  </div>
                  <Button onClick={() => toast.info("Upgrade flow coming soon!")}>
                    <Zap className="h-4 w-4 mr-2" />
                    Upgrade Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pricing Tiers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="font-display text-xl font-bold mb-4">Available Plans</h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {mockPricingTiers.map((tier, i) => (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  <Card
                    className={cn(
                      "h-full flex flex-col",
                      tier.isPopular && "border-primary shadow-lg relative"
                    )}
                  >
                    {tier.isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                      </div>
                    )}
                    <CardContent className="p-6 flex flex-col flex-1">
                      <h3 className="font-display text-xl font-bold">{tier.name}</h3>
                      <div className="mt-2 mb-4">
                        <span className="font-display text-4xl font-bold">
                          {tier.price === 0 ? "Free" : `$${tier.price}`}
                        </span>
                        {tier.price > 0 && (
                          <span className="text-muted-foreground text-sm">/month</span>
                        )}
                      </div>
                      <ul className="space-y-2 flex-1 mb-6">
                        {tier.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant={tier.id === currentPlan.id ? "outline" : tier.isPopular ? "default" : "outline"}
                        className="w-full"
                        disabled={tier.id === currentPlan.id}
                        onClick={() => toast.info(`${tier.name} plan upgrade coming soon!`)}
                      >
                        {tier.id === currentPlan.id ? "Current Plan" : `Upgrade to ${tier.name}`}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Invoice History */}
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
                <div className="space-y-3">
                  {mockInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{invoice.plan} Plan</p>
                        <p className="text-xs text-muted-foreground">{formatDate(invoice.date)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm">
                          {invoice.amount === 0 ? "Free" : formatCurrency(invoice.amount)}
                        </span>
                        <Badge variant="outline" className="text-xs text-green-500">
                          {invoice.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toast.success("Invoice downloaded! (mock)")}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
