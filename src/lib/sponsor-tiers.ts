import type { Sponsor } from "@/lib/types";

// Preset tier keys shown as suggestions in both creation and management forms.
// Tiers are stored as lowercase strings. Anything not in this list is a custom
// tier entered by the organizer via the "Other" option.
export const PRESET_SPONSOR_TIERS = [
  "platinum",
  "gold",
  "silver",
  "bronze",
  "community",
] as const;

export type PresetSponsorTier = (typeof PRESET_SPONSOR_TIERS)[number];

type BadgeVariant = "gradient" | "warning" | "muted" | "secondary" | "success" | "default" | "outline";

const PRESET_LABELS: Record<PresetSponsorTier, string> = {
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
  community: "Community",
};

const PRESET_BADGE_VARIANTS: Record<PresetSponsorTier, BadgeVariant> = {
  platinum: "gradient",
  gold: "warning",
  silver: "muted",
  bronze: "secondary",
  community: "success",
};

// Tailwind utility strings for the public sponsor pages.
const PRESET_GRADIENTS: Record<PresetSponsorTier, string> = {
  platinum: "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800",
  gold: "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-900",
  silver: "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700",
  bronze: "bg-gradient-to-br from-orange-300 to-orange-500 text-orange-900",
  community: "bg-gradient-to-br from-primary/60 to-accent/60 text-white",
};

const DEFAULT_GRADIENT = "bg-gradient-to-br from-primary/50 to-accent/50 text-white";

/**
 * Normalize a tier value for storage/comparison — lowercase, trimmed, whitespace
 * collapsed. Returns an empty string for blank input.
 */
export function normalizeSponsorTier(value: string | undefined | null): string {
  if (!value) return "";
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isPreset(tier: string): tier is PresetSponsorTier {
  return (PRESET_SPONSOR_TIERS as readonly string[]).includes(tier);
}

/**
 * Human-readable label for a tier. Presets use canonical capitalization;
 * customs are title-cased from the stored key.
 */
export function sponsorTierLabel(tier: string): string {
  const key = normalizeSponsorTier(tier);
  if (!key) return "Other";
  if (isPreset(key)) return PRESET_LABELS[key];
  return key
    .split(" ")
    .map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ");
}

export function sponsorTierBadgeVariant(tier: string): BadgeVariant {
  const key = normalizeSponsorTier(tier);
  if (isPreset(key)) return PRESET_BADGE_VARIANTS[key];
  return "outline";
}

export function sponsorTierGradientClass(tier: string): string {
  const key = normalizeSponsorTier(tier);
  if (isPreset(key)) return PRESET_GRADIENTS[key];
  return DEFAULT_GRADIENT;
}

/**
 * Ordering index: presets are ranked in their canonical order (platinum → community),
 * customs all share a larger index so they sort after presets but stably among themselves.
 */
function tierRank(tier: string): number {
  const key = normalizeSponsorTier(tier);
  const idx = (PRESET_SPONSOR_TIERS as readonly string[]).indexOf(key);
  return idx === -1 ? PRESET_SPONSOR_TIERS.length : idx;
}

/**
 * Sort comparator for tier keys — presets in canonical order, then customs
 * alphabetically.
 */
export function compareSponsorTiers(a: string, b: string): number {
  const ra = tierRank(a);
  const rb = tierRank(b);
  if (ra !== rb) return ra - rb;
  return normalizeSponsorTier(a).localeCompare(normalizeSponsorTier(b));
}

/**
 * Returns the distinct tier keys present in a sponsor list, sorted by
 * {@link compareSponsorTiers}.
 */
export function distinctSponsorTiers(sponsors: readonly Sponsor[]): string[] {
  const seen = new Set<string>();
  for (const s of sponsors) {
    const key = normalizeSponsorTier(s.tier);
    if (key) seen.add(key);
  }
  return [...seen].sort(compareSponsorTiers);
}

const PRESET_HEADING_SUFFIX: Record<PresetSponsorTier, string> = {
  platinum: "Sponsors",
  gold: "Sponsors",
  silver: "Sponsors",
  bronze: "Sponsors",
  community: "Partners",
};

/**
 * Heading for a tier on public pages — e.g. "Platinum Sponsors",
 * "Community Partners", or simply "Title Sponsor" for a custom tier that
 * already reads as a full heading. Custom labels that already contain the
 * word "sponsor" or "partner" are returned as-is to avoid awkward
 * duplication like "Title Sponsor Sponsors".
 */
export function sponsorTierHeading(tier: string): string {
  const key = normalizeSponsorTier(tier);
  const label = sponsorTierLabel(tier);
  if (isPreset(key)) {
    return `${label} ${PRESET_HEADING_SUFFIX[key]}`;
  }
  if (/\b(sponsor|sponsors|partner|partners)\b/i.test(label)) {
    return label;
  }
  return `${label} Sponsors`;
}
