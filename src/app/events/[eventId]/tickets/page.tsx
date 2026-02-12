"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Ticket,
  Minus,
  Plus,
  ShoppingCart,
  Calendar,
  MapPin,
  Check,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { mockEvents } from "@/lib/mock-data";

interface MockTicket {
  id: string;
  name: string;
  price: number;
  description: string;
  perks: string[];
}

const ticketTypes: MockTicket[] = [
  {
    id: "t-free",
    name: "Free",
    price: 0,
    description: "Basic access to the event with general seating.",
    perks: ["General admission", "Access to main sessions", "Event swag bag"],
  },
  {
    id: "t-student",
    name: "Student",
    price: 9,
    description: "Discounted ticket for students with valid ID.",
    perks: [
      "General admission",
      "Access to main sessions",
      "Event swag bag",
      "Student networking lounge",
    ],
  },
  {
    id: "t-earlybird",
    name: "Early Bird",
    price: 19,
    description: "Limited-time discounted ticket for early registrants.",
    perks: [
      "Priority seating",
      "Access to all sessions",
      "Event swag bag",
      "Workshop access",
      "Lunch included",
    ],
  },
  {
    id: "t-vip",
    name: "VIP",
    price: 49,
    description: "Premium experience with exclusive perks and priority access.",
    perks: [
      "Front-row seating",
      "All sessions & workshops",
      "Premium swag kit",
      "Speaker meet & greet",
      "VIP lounge access",
      "Catered meals",
      "Recording access",
    ],
  },
];

export default function TicketsPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const event = mockEvents.find((e) => e.id === eventId || e.slug === eventId);

  const [selectedTicket, setSelectedTicket] = React.useState<string | null>(null);
  const [quantity, setQuantity] = React.useState(1);

  if (!event) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-24"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
                <Ticket className="h-10 w-10 text-muted-foreground" />
              </div>
              <h1 className="font-display text-3xl font-bold mb-4">Event Not Found</h1>
              <p className="text-muted-foreground mb-8">
                The event you are looking for does not exist or has been removed.
              </p>
              <Button asChild>
                <Link href="/explore">Browse Events</Link>
              </Button>
            </motion.div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const selected = ticketTypes.find((t) => t.id === selectedTicket);
  const total = selected ? selected.price * quantity : 0;

  const handleCheckout = () => {
    if (!selectedTicket) {
      toast.error("Please select a ticket type.");
      return;
    }
    toast.success(
      `Order placed! ${quantity}x ${selected?.name} ticket${quantity > 1 ? "s" : ""} for ${event.title}.`
    );
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <Link
              href={`/events/${event.slug}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {event.title}
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-10"
          >
            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-3">
              Get Tickets
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDate(event.startDate)}
              </span>
              {event.location.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {event.location.city}, {event.location.country}
                </span>
              )}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Ticket Cards */}
            <div className="lg:col-span-2 space-y-4">
              {ticketTypes.map((ticket, i) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    hover
                    className={cn(
                      "relative overflow-hidden",
                      selectedTicket === ticket.id &&
                        "ring-2 ring-primary border-primary"
                    )}
                    onClick={() => {
                      setSelectedTicket(ticket.id);
                      setQuantity(1);
                    }}
                  >
                    {ticket.id === "t-vip" && (
                      <div className="absolute top-0 right-0">
                        <Badge variant="gradient" className="rounded-none rounded-bl-lg">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Popular
                        </Badge>
                      </div>
                    )}
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-display text-xl font-bold">
                              {ticket.name}
                            </h3>
                            {selectedTicket === ticket.id && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                              >
                                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                                  <Check className="h-4 w-4 text-white" />
                                </div>
                              </motion.div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {ticket.description}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {ticket.perks.map((perk) => (
                              <Badge key={perk} variant="secondary" className="text-xs">
                                {perk}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-display text-2xl font-bold">
                            {ticket.price === 0
                              ? "Free"
                              : formatCurrency(ticket.price)}
                          </div>
                          <p className="text-xs text-muted-foreground">per ticket</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {selectedTicket && selected ? (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{selected.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {selected.price === 0
                                ? "Free"
                                : formatCurrency(selected.price)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {event.title}
                          </p>
                        </div>

                        {/* Quantity Selector */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Quantity
                          </label>
                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuantity(Math.max(1, quantity - 1));
                              }}
                              disabled={quantity <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="font-display text-xl font-bold w-8 text-center">
                              {quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuantity(Math.min(10, quantity + 1));
                              }}
                              disabled={quantity >= 10}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">
                              Subtotal ({quantity} ticket{quantity > 1 ? "s" : ""})
                            </span>
                            <span className="text-sm">
                              {total === 0 ? "Free" : formatCurrency(total)}
                            </span>
                          </div>
                          {total > 0 && (
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-muted-foreground">
                                Service fee
                              </span>
                              <span className="text-sm">
                                {formatCurrency(Math.round(total * 0.05))}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-3 pt-3 border-t">
                            <span className="font-bold">Total</span>
                            <span className="font-display text-xl font-bold">
                              {total === 0
                                ? "Free"
                                : formatCurrency(
                                    total + Math.round(total * 0.05)
                                  )}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-6">
                        <Ticket className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Select a ticket type to continue
                        </p>
                      </div>
                    )}

                    <Button
                      className="w-full"
                      size="lg"
                      disabled={!selectedTicket}
                      onClick={handleCheckout}
                    >
                      {total === 0 ? "Register for Free" : "Proceed to Checkout"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
