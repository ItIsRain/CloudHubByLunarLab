"use client";

import { useMemo } from "react";
import { useMyEvents } from "@/hooks/use-events";
import { useMyHackathons } from "@/hooks/use-hackathons";
import { useSubscriptionTier } from "@/hooks/use-subscription";
import { PLAN_LIMITS } from "@/lib/constants";
import type { SubscriptionTier } from "@/lib/types";

export interface UsageMetric {
  used: number;
  limit: number; // -1 = unlimited
  percentage: number;
  isUnlimited: boolean;
  isAtLimit: boolean;
  isNearLimit: boolean;
}

export interface UsageData {
  eventsThisMonth: UsageMetric;
  hackathonsThisMonth: UsageMetric;
  attendeesPerEvent: UsageMetric;
  features: {
    paidTicketing: boolean;
    customBranding: boolean;
    analytics: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
  };
  tier: SubscriptionTier;
  isLoading: boolean;
}

function buildMetric(used: number, limit: number): UsageMetric {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : limit === 0 ? 100 : Math.min((used / limit) * 100, 100);
  return {
    used,
    limit,
    percentage,
    isUnlimited,
    isAtLimit: !isUnlimited && used >= limit,
    isNearLimit: !isUnlimited && used < limit && percentage >= 70,
  };
}

export function useUsage(): UsageData {
  const tier = useSubscriptionTier();
  const { data: eventsData, isLoading: eventsLoading } = useMyEvents();
  const { data: hackathonsData, isLoading: hackathonsLoading } = useMyHackathons();

  const limits = PLAN_LIMITS[tier];
  const isLoading = eventsLoading || hackathonsLoading;

  return useMemo(() => {
    const events = eventsData?.data || [];
    const hackathons = hackathonsData?.data || [];

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const eventsThisMonthCount = events.filter((e) => e.createdAt >= monthStart).length;
    const hackathonsThisMonthCount = hackathons.filter((h) => h.createdAt >= monthStart).length;

    // Max attendees across all events (largest single event)
    const maxAttendees = events.reduce(
      (max, e) => Math.max(max, e.registrationCount || 0),
      0
    );

    return {
      eventsThisMonth: buildMetric(eventsThisMonthCount, limits.eventsPerMonth),
      hackathonsThisMonth: buildMetric(hackathonsThisMonthCount, limits.hackathonsPerMonth),
      attendeesPerEvent: buildMetric(maxAttendees, limits.attendeesPerEvent),
      features: {
        paidTicketing: limits.paidTicketing,
        customBranding: limits.customBranding,
        analytics: limits.analytics,
        apiAccess: limits.apiAccess,
        prioritySupport: limits.prioritySupport,
      },
      tier,
      isLoading,
    };
  }, [eventsData, hackathonsData, limits, tier, isLoading]);
}
