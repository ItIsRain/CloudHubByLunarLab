"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  Ticket,
  TrendingUp,
  Plus,
  Trash2,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import type { Event, TicketType } from "@/lib/types";
import { useUpdateEvent } from "@/hooks/use-events";
import { useEventGuests } from "@/hooks/use-event-guests";
import { currencies } from "@/lib/constants";
import { toast } from "sonner";

interface TicketsTabProps {
  event: Event;
  eventId: string;
}

const selectClasses =
  "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50";

export function TicketsTab({ event, eventId }: TicketsTabProps) {
  const updateEvent = useUpdateEvent();
  const { data: guestsData } = useEventGuests(eventId);
  const guests = guestsData?.data ?? [];
  const tickets = event.tickets ?? [];

  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newTicket, setNewTicket] = React.useState({
    name: "",
    price: 0,
    currency: "USD",
    quantity: 100,
    description: "",
  });

  // Compute real sold counts from registration data
  const ticketSoldCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const guest of guests) {
      if (guest.status === "cancelled") continue;
      const ticketType = guest.ticketType as { id?: string } | null;
      if (ticketType?.id) {
        counts[ticketType.id] = (counts[ticketType.id] || 0) + 1;
      }
    }
    return counts;
  }, [guests]);

  // Compute real revenue from paid registrations
  const revenueByTicket = React.useMemo(() => {
    const rev: Record<string, number> = {};
    for (const guest of guests) {
      if (guest.status === "cancelled") continue;
      const ticketType = guest.ticketType as {
        id?: string;
        price?: number;
      } | null;
      if (ticketType?.id && ticketType.price) {
        rev[ticketType.id] = (rev[ticketType.id] || 0) + ticketType.price;
      }
    }
    return rev;
  }, [guests]);

  // Use the higher of: DB sold count or real registration count
  const getTicketSold = (ticket: TicketType) => {
    return Math.max(ticket.sold, ticketSoldCounts[ticket.id] || 0);
  };

  // Group revenue by currency
  const revenueByCurrency = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const ticket of tickets) {
      const sold = getTicketSold(ticket);
      const rev = ticket.price * sold;
      if (rev > 0) {
        map[ticket.currency] = (map[ticket.currency] || 0) + rev;
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, ticketSoldCounts]);

  const totalRevenue = Object.values(revenueByCurrency).reduce(
    (sum, v) => sum + v,
    0
  );
  const primaryCurrency = tickets[0]?.currency || "USD";
  const totalSold = tickets.reduce((sum, t) => sum + getTicketSold(t), 0);
  const totalQuantity = tickets.reduce((sum, t) => sum + t.quantity, 0);
  const conversionRate =
    totalQuantity > 0 ? Math.round((totalSold / totalQuantity) * 100) : 0;

  // Format multi-currency revenue
  const revenueDisplay = React.useMemo(() => {
    const entries = Object.entries(revenueByCurrency);
    if (entries.length === 0) return formatCurrency(0, primaryCurrency);
    if (entries.length === 1)
      return formatCurrency(entries[0][1], entries[0][0]);
    return entries.map(([cur, amt]) => formatCurrency(amt, cur)).join(" + ");
  }, [revenueByCurrency, primaryCurrency]);

  const summaryCards = [
    {
      label: "Total Revenue",
      value: revenueDisplay,
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Tickets Sold",
      value: `${totalSold} / ${totalQuantity}`,
      icon: Ticket,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  const handleAddTicket = async () => {
    if (!newTicket.name) {
      toast.error("Ticket name is required");
      return;
    }
    const ticket: TicketType = {
      id: crypto.randomUUID(),
      name: newTicket.name,
      description: newTicket.description || undefined,
      price: newTicket.price,
      currency: newTicket.currency,
      quantity: newTicket.quantity,
      sold: 0,
      maxPerOrder: 10,
    };
    try {
      await updateEvent.mutateAsync({
        id: eventId,
        tickets: [...tickets, ticket],
      });
      toast.success("Ticket type added!");
      setShowAddForm(false);
      setNewTicket({
        name: "",
        price: 0,
        currency: newTicket.currency,
        quantity: 100,
        description: "",
      });
    } catch {
      toast.error("Failed to add ticket type.");
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this ticket type?"
    );
    if (!confirmed) return;
    try {
      await updateEvent.mutateAsync({
        id: eventId,
        tickets: tickets.filter((t) => t.id !== ticketId),
      });
      toast.success("Ticket type deleted!");
    } catch {
      toast.error("Failed to delete ticket type.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="font-display text-2xl font-bold">Tickets</h2>
          <p className="text-sm text-muted-foreground">
            Manage ticket types and pricing
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-4 w-4" />
          Add Ticket Type
        </Button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-4"
      >
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center",
                    card.bgColor
                  )}
                >
                  <card.icon className={cn("h-4 w-4", card.color)} />
                </div>
                <div>
                  <p className="text-xl font-bold font-display">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Add Ticket Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">New Ticket Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <Input
                    value={newTicket.name}
                    onChange={(e) =>
                      setNewTicket({ ...newTicket, name: e.target.value })
                    }
                    placeholder="e.g. General Admission"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description
                  </label>
                  <Input
                    value={newTicket.description}
                    onChange={(e) =>
                      setNewTicket({ ...newTicket, description: e.target.value })
                    }
                    placeholder="Optional description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Price
                  </label>
                  <Input
                    type="number"
                    value={newTicket.price}
                    onChange={(e) =>
                      setNewTicket({
                        ...newTicket,
                        price: Number(e.target.value),
                      })
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Currency
                  </label>
                  <select
                    value={newTicket.currency}
                    onChange={(e) =>
                      setNewTicket({ ...newTicket, currency: e.target.value })
                    }
                    className={selectClasses}
                  >
                    {currencies.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Quantity
                  </label>
                  <Input
                    type="number"
                    value={newTicket.quantity}
                    onChange={(e) =>
                      setNewTicket({
                        ...newTicket,
                        quantity: Number(e.target.value),
                      })
                    }
                    placeholder="100"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleAddTicket}
                  disabled={updateEvent.isPending}
                >
                  {updateEvent.isPending ? "Adding..." : "Add Ticket"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Ticket Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tickets.map((ticket, i) => {
          const realSold = getTicketSold(ticket);
          const soldPercent =
            ticket.quantity > 0
              ? Math.round((realSold / ticket.quantity) * 100)
              : 0;
          const isSoldOut = realSold >= ticket.quantity;

          return (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-bold">{ticket.name}</h3>
                        {isSoldOut && (
                          <Badge variant="destructive">Sold Out</Badge>
                        )}
                        {ticket.price === 0 && (
                          <Badge variant="success">Free</Badge>
                        )}
                      </div>
                      {ticket.description && (
                        <p className="text-xs text-muted-foreground">
                          {ticket.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleDeleteTicket(ticket.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-2xl font-bold font-display mb-3">
                    {ticket.price === 0
                      ? "Free"
                      : formatCurrency(ticket.price, ticket.currency)}
                  </p>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {realSold} / {ticket.quantity} sold
                      </span>
                      <span className="font-medium">{soldPercent}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          soldPercent >= 90
                            ? "bg-red-500"
                            : soldPercent >= 60
                              ? "bg-yellow-500"
                              : "bg-primary"
                        )}
                        style={{ width: `${soldPercent}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {tickets.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Tag className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg font-bold mb-1">
              No ticket types
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add ticket types to start selling tickets for your event.
            </p>
            <Button size="sm" onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4" />
              Add Ticket Type
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
