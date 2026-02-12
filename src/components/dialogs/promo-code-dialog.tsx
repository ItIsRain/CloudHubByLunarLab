"use client";

import { useState } from "react";
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
import { Tag, Shuffle, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface PromoCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (code: {
    code: string;
    discount: number;
    maxUses: number;
    expiresAt: string;
  }) => void;
}

export function PromoCodeDialog({
  open,
  onOpenChange,
  onSave,
}: PromoCodeDialogProps) {
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
  };

  const discountNum = Number(discount) || 0;
  const maxUsesNum = Number(maxUses) || 0;
  const isValid =
    code.length >= 3 &&
    discountNum > 0 &&
    discountNum <= 100 &&
    maxUsesNum > 0 &&
    expiresAt.length > 0;

  const handleSave = async () => {
    if (!isValid) return;
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    onSave({
      code: code.toUpperCase(),
      discount: discountNum,
      maxUses: maxUsesNum,
      expiresAt,
    });
    setIsSaving(false);
    toast.success("Promo code created!", {
      description: `${code.toUpperCase()} — ${discountNum}% off`,
    });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setCode("");
    setDiscount("");
    setMaxUses("");
    setExpiresAt("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetForm();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Create Promo Code
          </DialogTitle>
          <DialogDescription>
            Set up a discount code for your event
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Code input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Promo Code</label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. SUMMER20"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="font-mono uppercase"
              />
              <Button
                type="button"
                variant="outline"
                onClick={generateCode}
                className="shrink-0"
              >
                <Shuffle className="h-4 w-4 mr-2" />
                Random
              </Button>
            </div>
          </div>

          {/* Discount */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Discount (%)</label>
            <Input
              type="number"
              placeholder="20"
              min={1}
              max={100}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </div>

          {/* Max uses */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Maximum Uses</label>
            <Input
              type="number"
              placeholder="100"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            />
          </div>

          {/* Expiry date */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Expiry Date</label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          {/* Preview */}
          {code && discountNum > 0 && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="gradient" className="font-mono text-sm px-3 py-1">
                  {code.toUpperCase()}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {discountNum}% off
                  {maxUsesNum > 0 ? `, up to ${maxUsesNum} uses` : ""}
                </span>
              </div>
            </div>
          )}

          {/* Save button */}
          <Button
            className="w-full"
            disabled={!isValid || isSaving}
            onClick={handleSave}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Promo Code
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
