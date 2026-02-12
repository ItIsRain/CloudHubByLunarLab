"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Ticket, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import type { TicketType } from "@/lib/types";

interface RegisterEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventTitle: string;
  tickets: TicketType[];
}

export function RegisterEventDialog({
  open,
  onOpenChange,
  eventTitle,
  tickets,
}: RegisterEventDialogProps) {
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegister = async () => {
    if (!selectedTicket) return;
    setIsRegistering(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsRegistering(false);
    toast.success("Successfully registered! Check your email for confirmation.");
    onOpenChange(false);
    setSelectedTicket(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Register for {eventTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {tickets.map((ticket) => {
            const isSoldOut = ticket.sold >= ticket.quantity;
            const isSelected = selectedTicket === ticket.id;

            return (
              <Card
                key={ticket.id}
                className={`cursor-pointer transition-all ${
                  isSoldOut
                    ? "opacity-50 cursor-not-allowed"
                    : isSelected
                    ? "ring-2 ring-primary"
                    : "hover:border-primary/50"
                }`}
                onClick={() => !isSoldOut && setSelectedTicket(ticket.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{ticket.name}</h3>
                        {isSoldOut && (
                          <Badge variant="secondary">Sold Out</Badge>
                        )}
                      </div>
                      {ticket.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {ticket.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {ticket.quantity - ticket.sold} of {ticket.quantity} remaining
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-xl font-bold">
                        {ticket.price === 0 ? "Free" : formatCurrency(ticket.price, ticket.currency)}
                      </span>
                      {isSelected && (
                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button
          className="w-full"
          disabled={!selectedTicket || isRegistering}
          onClick={handleRegister}
        >
          {isRegistering ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            "Complete Registration"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
