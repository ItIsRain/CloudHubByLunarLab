// =====================================================
// UUID Regex (centralized — used across API routes)
// =====================================================
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Safe slug pattern — only allows characters produced by slugify(). Rejects PostgREST special chars. */
export const SAFE_SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

// =====================================================
// Profile SELECT columns (centralized to avoid SELECT *)
// =====================================================
/** All profile columns needed by profileToUser mapper (for authenticated user's own data) */
export const PROFILE_COLS = "id,email,name,username,avatar,bio,headline,location,website,github,twitter,linkedin,skills,interests,roles,events_attended,hackathons_participated,projects_submitted,wins,subscription_tier,created_at,updated_at";

/** Public-safe profile columns (email intentionally excluded for privacy) */
export const PROFILE_PUBLIC_COLS = "id,name,username,avatar,bio,headline,location,website,github,twitter,linkedin,skills,interests,roles,events_attended,hackathons_participated,projects_submitted,wins,subscription_tier,created_at,updated_at";

/** Notification columns needed by dbRowToNotification mapper */
export const NOTIFICATION_COLS = "id,type,title,message,link,is_read,created_at";

export const categories = [
  { value: "tech", label: "Technology", icon: "laptop" },
  { value: "ai-ml", label: "AI / Machine Learning", icon: "brain" },
  { value: "web3", label: "Web3 / Blockchain", icon: "link" },
  { value: "design", label: "Design", icon: "palette" },
  { value: "business", label: "Business", icon: "briefcase" },
  { value: "health", label: "Health", icon: "heart" },
  { value: "music", label: "Music", icon: "music" },
  { value: "social", label: "Social", icon: "users" },
  { value: "workshop", label: "Workshop", icon: "wrench" },
  { value: "conference", label: "Conference", icon: "mic" },
  { value: "meetup", label: "Meetup", icon: "coffee" },
  { value: "networking", label: "Networking", icon: "globe" },
];

export const popularTags = [
  "React", "TypeScript", "Node.js", "Python", "AI", "Machine Learning",
  "Web3", "Blockchain", "Ethereum", "Design", "UX", "Startup",
  "DevOps", "Cloud", "AWS", "Kubernetes", "Docker", "GraphQL",
  "Next.js", "TensorFlow", "OpenAI", "LLM", "NLP", "Computer Vision",
];

export const currencies = [
  { value: "AED", label: "AED (د.إ)", symbol: "د.إ" },
  { value: "ARS", label: "ARS (AR$)", symbol: "AR$" },
  { value: "AUD", label: "AUD (A$)", symbol: "A$" },
  { value: "BGN", label: "BGN (лв)", symbol: "лв" },
  { value: "BHD", label: "BHD (.د.ب)", symbol: ".د.ب" },
  { value: "BRL", label: "BRL (R$)", symbol: "R$" },
  { value: "CAD", label: "CAD (C$)", symbol: "C$" },
  { value: "CHF", label: "CHF (Fr)", symbol: "Fr" },
  { value: "CLP", label: "CLP (CL$)", symbol: "CL$" },
  { value: "CNY", label: "CNY (¥)", symbol: "¥" },
  { value: "COP", label: "COP (CO$)", symbol: "CO$" },
  { value: "CZK", label: "CZK (Kč)", symbol: "Kč" },
  { value: "DKK", label: "DKK (kr)", symbol: "kr" },
  { value: "EGP", label: "EGP (E£)", symbol: "E£" },
  { value: "EUR", label: "EUR (€)", symbol: "€" },
  { value: "GBP", label: "GBP (£)", symbol: "£" },
  { value: "GEL", label: "GEL (₾)", symbol: "₾" },
  { value: "GHS", label: "GHS (GH₵)", symbol: "GH₵" },
  { value: "HKD", label: "HKD (HK$)", symbol: "HK$" },
  { value: "HRK", label: "HRK (kn)", symbol: "kn" },
  { value: "HUF", label: "HUF (Ft)", symbol: "Ft" },
  { value: "IDR", label: "IDR (Rp)", symbol: "Rp" },
  { value: "ILS", label: "ILS (₪)", symbol: "₪" },
  { value: "INR", label: "INR (₹)", symbol: "₹" },
  { value: "ISK", label: "ISK (kr)", symbol: "kr" },
  { value: "JMD", label: "JMD (J$)", symbol: "J$" },
  { value: "JOD", label: "JOD (JD)", symbol: "JD" },
  { value: "JPY", label: "JPY (¥)", symbol: "¥" },
  { value: "KES", label: "KES (KSh)", symbol: "KSh" },
  { value: "KRW", label: "KRW (₩)", symbol: "₩" },
  { value: "KWD", label: "KWD (د.ك)", symbol: "د.ك" },
  { value: "KZT", label: "KZT (₸)", symbol: "₸" },
  { value: "MAD", label: "MAD (د.م.)", symbol: "د.م." },
  { value: "MXN", label: "MXN (MX$)", symbol: "MX$" },
  { value: "MYR", label: "MYR (RM)", symbol: "RM" },
  { value: "NGN", label: "NGN (₦)", symbol: "₦" },
  { value: "NOK", label: "NOK (kr)", symbol: "kr" },
  { value: "NZD", label: "NZD (NZ$)", symbol: "NZ$" },
  { value: "OMR", label: "OMR (ر.ع.)", symbol: "ر.ع." },
  { value: "PEN", label: "PEN (S/)", symbol: "S/" },
  { value: "PHP", label: "PHP (₱)", symbol: "₱" },
  { value: "PKR", label: "PKR (₨)", symbol: "₨" },
  { value: "PLN", label: "PLN (zł)", symbol: "zł" },
  { value: "QAR", label: "QAR (ر.ق)", symbol: "ر.ق" },
  { value: "RON", label: "RON (lei)", symbol: "lei" },
  { value: "RUB", label: "RUB (₽)", symbol: "₽" },
  { value: "SAR", label: "SAR (ر.س)", symbol: "ر.س" },
  { value: "SEK", label: "SEK (kr)", symbol: "kr" },
  { value: "SGD", label: "SGD (S$)", symbol: "S$" },
  { value: "THB", label: "THB (฿)", symbol: "฿" },
  { value: "TRY", label: "TRY (₺)", symbol: "₺" },
  { value: "TWD", label: "TWD (NT$)", symbol: "NT$" },
  { value: "UAH", label: "UAH (₴)", symbol: "₴" },
  { value: "USD", label: "USD ($)", symbol: "$" },
  { value: "UYU", label: "UYU ($U)", symbol: "$U" },
  { value: "VND", label: "VND (₫)", symbol: "₫" },
  { value: "ZAR", label: "ZAR (R)", symbol: "R" },
];

import type { PlanLimits, SubscriptionTier } from "./types";

// =====================================================
// Subscription Plan Limits
// =====================================================
export const PLAN_LIMITS: Record<SubscriptionTier, PlanLimits> = {
  free: {
    eventsPerMonth: 3,
    hackathonsPerMonth: 1,
    attendeesPerEvent: 100,
    paidTicketing: false,
    customBranding: false,
    analytics: false,
    apiAccess: false,
    prioritySupport: false,
  },
  enterprise: {
    eventsPerMonth: -1,
    hackathonsPerMonth: -1,
    attendeesPerEvent: -1,
    paidTicketing: true,
    customBranding: true,
    analytics: true,
    apiAccess: true,
    prioritySupport: true,
  },
};

// =====================================================
// Pricing Tiers (replaces mockPricingTiers)
// =====================================================
export interface PricingTierConfig {
  id: string;
  name: string;
  monthlyPrice: number | null; // null = contact sales
  annualPrice: number | null;
  currency: string;
  isPopular: boolean;
  isContactSales: boolean;
  features: string[];
}

export const PRICING_TIERS: PricingTierConfig[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    currency: "USD",
    isPopular: false,
    isContactSales: false,
    features: [
      "3 events per month",
      "Up to 100 attendees each",
      "1 competition with team formation",
      "Event page builder",
      "Ticketing (free tickets)",
      "Email notifications",
      "Basic analytics dashboard",
      "Submission portal",
      "Google Calendar sync",
      "SSL & 2FA security",
      "Community forum support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: null,
    annualPrice: null,
    currency: "USD",
    isPopular: false,
    isContactSales: true,
    features: [
      "Unlimited attendees",
      "0% platform fee",
      "White-label experience",
      "SSO (SAML/OIDC)",
      "Unlimited API access + GraphQL",
      "Custom integrations (CRM, etc.)",
      "AI networking matchmaking",
      "Multi-stream CDN delivery",
      "Sponsor & prize portal",
      "Custom report builder",
      "SOC 2 & data residency",
      "Audit logs",
      "Dedicated account manager",
      "4h response SLA + phone",
      "99.9% uptime guarantee",
    ],
  },
];
