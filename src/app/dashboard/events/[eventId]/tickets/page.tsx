"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Ticket,
  Edit,
  Trash2,
  DollarSign,
  TrendingUp,
  Tag,
  Copy,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { mockEvents } from "@/lib/mock-data";
import { toast } from "sonner";

interface TicketTypeData {
  id: string;
  name: string;
  price: number;
  sold: number;
  total: number;
  status: "On Sale" | "Sold Out" | "Paused";
}

const mockTicketTypes: TicketTypeData[] = [
  { id: "t-1", name: "Free (General)", price: 0, sold: 89, total: 200, status: "On Sale" },
  { id: "t-2", name: "VIP", price: 49, sold: 45, total: 50, status: "On Sale" },
  { id: "t-3", name: "Early Bird", price: 19, sold: 100, total: 100, status: "Sold Out" },
  { id: "t-4", name: "Student", price: 9, sold: 32, total: 75, status: "On Sale" },
];

interface PromoCode {
  id: string;
  code: string;
  discount: number;
  usageCount: number;
  maxUsage: number;
  expiry: string;
}

const mockPromoCodes: PromoCode[] = [
  { id: "p-1", code: "EARLYBIRD25", discount: 25, usageCount: 47, maxUsage: 100, expiry: "2025-06-30" },
  { id: "p-2", code: "VIP50", discount: 50, usageCount: 12, maxUsage: 20, expiry: "2025-05-15" },
  { id: "p-3", code: "STUDENT10", discount: 10, usageCount: 89, maxUsage: 200, expiry: "2025-12-31" },
];

const ticketStatusVariant: Record<string, "success" | "destructive" | "warning"> = {
  "On Sale": "success",
  "Sold Out": "destructive",
  Paused: "warning",
};

export default function TicketsPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const event = mockEvents.find((e) => e.id === eventId);

  if (!event) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <h2 className="font-display text-2xl font-bold mb-2">Event not found</h2>
              <p className="text-muted-foreground mb-6">
                The event you are looking for does not exist or has been removed.
              </p>
              <Button asChild>
                <Link href="/dashboard/events">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to My Events
                </Link>
              </Button>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  const totalRevenue = mockTicketTypes.reduce(
    (acc, t) => acc + t.price * t.sold,
    0
  );
  const totalSold = mockTicketTypes.reduce((acc, t) => acc + t.sold, 0);
  const totalCapacity = mockTicketTypes.reduce((acc, t) => acc + t.total, 0);
  const conversionRate = ((totalSold / totalCapacity) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/events/${eventId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Overview
              </Link>
            </Button>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
          >
            <div>
              <h1 className="font-display text-3xl font-bold">Tickets</h1>
              <p className="text-muted-foreground mt-1">{event.title}</p>
            </div>
            <Button onClick={() => toast.success("Ticket type creation coming soon!")}>
              <Plus className="h-4 w-4 mr-2" />
              Add Ticket Type
            </Button>
          </motion.div>

          {/* Sales Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
          >
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="font-display text-xl font-bold">
                    {formatCurrency(totalRevenue)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Ticket className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tickets Sold</p>
                  <p className="font-display text-xl font-bold">
                    {totalSold} / {totalCapacity}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  <p className="font-display text-xl font-bold">{conversionRate}%</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Ticket Types */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="font-display text-xl font-bold mb-4">Ticket Types</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockTicketTypes.map((ticket, i) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-display font-bold text-lg">
                            {ticket.name}
                          </h3>
                          <p className="text-2xl font-bold text-primary mt-1">
                            {ticket.price === 0
                              ? "Free"
                              : formatCurrency(ticket.price)}
                          </p>
                        </div>
                        <Badge variant={ticketStatusVariant[ticket.status]}>
                          {ticket.status}
                        </Badge>
                      </div>

                      {/* Progress bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">
                            {ticket.sold} sold
                          </span>
                          <span className="text-muted-foreground">
                            {ticket.total} total
                          </span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{
                              width: `${(ticket.sold / ticket.total) * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toast.success(`Editing "${ticket.name}" coming soon!`)
                          }
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            toast.success(`"${ticket.name}" has been deleted.`)
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Promo Codes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">Promo Codes</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.success("Promo code creation coming soon!")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Promo Code
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left text-sm font-medium text-muted-foreground px-6 py-3">
                          Code
                        </th>
                        <th className="text-left text-sm font-medium text-muted-foreground px-6 py-3">
                          Discount
                        </th>
                        <th className="text-left text-sm font-medium text-muted-foreground px-6 py-3">
                          Usage
                        </th>
                        <th className="text-left text-sm font-medium text-muted-foreground px-6 py-3">
                          Expiry
                        </th>
                        <th className="text-left text-sm font-medium text-muted-foreground px-6 py-3">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockPromoCodes.map((promo, i) => (
                        <motion.tr
                          key={promo.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.25 + i * 0.05 }}
                          className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Tag className="h-4 w-4 text-muted-foreground" />
                              <code className="font-mono text-sm font-semibold">
                                {promo.code}
                              </code>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="secondary">{promo.discount}% OFF</Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {promo.usageCount} / {promo.maxUsage}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {promo.expiry}
                          </td>
                          <td className="px-6 py-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                navigator.clipboard.writeText(promo.code);
                                toast.success(`Code "${promo.code}" copied!`);
                              }}
                            >
                              <Copy className="h-3.5 w-3.5 mr-1" />
                              Copy
                            </Button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
