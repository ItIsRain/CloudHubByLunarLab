"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Check,
  Minus,
  Plus,
  Loader2,
  ShoppingCart,
  PartyPopper,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TicketOption {
  name: string;
  price: number;
  description: string;
}

interface TicketCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventTitle: string;
  tickets: TicketOption[];
}

export function TicketCheckoutDialog({
  open,
  onOpenChange,
  eventTitle,
  tickets,
}: TicketCheckoutDialogProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedTicket = selectedIndex !== null ? tickets[selectedIndex] : null;

  const { subtotal, fees, total } = useMemo(() => {
    if (!selectedTicket) return { subtotal: 0, fees: 0, total: 0 };
    const sub = selectedTicket.price * quantity;
    const fee = Math.round(sub * 0.029 * 100) / 100 + 0.3 * quantity;
    return {
      subtotal: sub,
      fees: Math.round(fee * 100) / 100,
      total: Math.round((sub + fee) * 100) / 100,
    };
  }, [selectedTicket, quantity]);

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const isFormValid =
    selectedTicket &&
    cardNumber.replace(/\s/g, "").length === 16 &&
    expiry.length === 5 &&
    cvc.length >= 3;

  const handlePurchase = async () => {
    if (!isFormValid) return;
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIsProcessing(false);
    toast.success("Purchase complete! Your tickets are confirmed.", {
      description: `${quantity}x ${selectedTicket!.name} for ${eventTitle}`,
      icon: <PartyPopper className="h-5 w-5" />,
    });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedIndex(null);
    setQuantity(1);
    setCardNumber("");
    setExpiry("");
    setCvc("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetForm();
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Get Tickets
          </DialogTitle>
          <DialogDescription>
            Choose your ticket for {eventTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ticket selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Ticket</label>
            <div className="space-y-2">
              {tickets.map((ticket, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  className={cn(
                    "w-full text-left rounded-xl border p-4 transition-all duration-200",
                    selectedIndex === index
                      ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                      : "border-border hover:border-primary/50 bg-background"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ticket.name}</span>
                        {ticket.price === 0 && (
                          <Badge variant="success">Free</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {ticket.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-lg font-bold">
                        {ticket.price === 0
                          ? "Free"
                          : `$${ticket.price.toFixed(2)}`}
                      </span>
                      {selectedIndex === index && (
                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity selector */}
          {selectedTicket && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="font-display text-lg font-bold w-8 text-center">
                  {quantity}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.min(10, quantity + 1))}
                  disabled={quantity >= 10}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Order summary */}
          {selectedTicket && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
              <h4 className="text-sm font-medium">Order Summary</h4>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {quantity}x {selectedTicket.name}
                </span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service fee</span>
                <span>${fees.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-medium">
                <span>Total</span>
                <span className="font-display text-lg font-bold">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Payment form */}
          {selectedTicket && selectedTicket.price > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Details
              </h4>
              <div className="space-y-3">
                <Input
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) =>
                    setCardNumber(formatCardNumber(e.target.value))
                  }
                  maxLength={19}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    maxLength={5}
                  />
                  <Input
                    placeholder="CVC"
                    value={cvc}
                    onChange={(e) =>
                      setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    maxLength={4}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Purchase button */}
          <Button
            className="w-full"
            disabled={
              !selectedTicket ||
              (selectedTicket.price > 0 && !isFormValid) ||
              isProcessing
            }
            onClick={handlePurchase}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Complete Purchase${total > 0 ? ` — $${total.toFixed(2)}` : ""}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
