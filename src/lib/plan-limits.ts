import { PLAN_LIMITS } from "@/lib/constants";
import type { SubscriptionTier } from "@/lib/types";

export function canCreateEvent(tier: SubscriptionTier, currentMonthCount: number): boolean {
  const limit = PLAN_LIMITS[tier].eventsPerMonth;
  return limit === -1 || currentMonthCount < limit;
}

export function canCreateHackathon(tier: SubscriptionTier, currentMonthCount: number): boolean {
  const limit = PLAN_LIMITS[tier].hackathonsPerMonth;
  return limit === -1 || currentMonthCount < limit;
}

export function getAttendeeLimit(tier: SubscriptionTier): number {
  return PLAN_LIMITS[tier].attendeesPerEvent;
}

export function getEventLimit(tier: SubscriptionTier): number {
  return PLAN_LIMITS[tier].eventsPerMonth;
}

export function getHackathonLimit(tier: SubscriptionTier): number {
  return PLAN_LIMITS[tier].hackathonsPerMonth;
}
