"use client";

import { useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import type { SubscriptionTier } from "@/lib/types";

export function useCheckout() {
  const checkout = useCallback(async (interval: "monthly" | "annual" = "monthly") => {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interval }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to create checkout session");
    }

    if (data.url) {
      window.location.href = data.url;
    }
  }, []);

  return checkout;
}

export function useCustomerPortal() {
  const openPortal = useCallback(async () => {
    const res = await fetch("/api/stripe/portal", {
      method: "POST",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to open billing portal");
    }

    if (data.url) {
      window.location.href = data.url;
    }
  }, []);

  return openPortal;
}

export function useSubscriptionTier(): SubscriptionTier {
  const user = useAuthStore((state) => state.user);
  return user?.subscriptionTier || "free";
}
