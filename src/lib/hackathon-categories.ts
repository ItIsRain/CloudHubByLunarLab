import { categories as PRESET_CATEGORY_DEFS } from "@/lib/constants";

// Preset category keys used by the built-in filter/badge chips. Stored
// lowercased in the DB. Custom categories entered by organizers via the
// "Other" option are free-form strings and sort after the presets.
export const PRESET_CATEGORY_KEYS = PRESET_CATEGORY_DEFS.map((c) => c.value);

export type PresetCategoryKey = (typeof PRESET_CATEGORY_KEYS)[number];

const PRESET_LABEL_MAP: Record<string, string> = Object.fromEntries(
  PRESET_CATEGORY_DEFS.map((c) => [c.value, c.label])
);

/**
 * Normalize a category value for storage/comparison — trimmed, lowercased,
 * whitespace collapsed. Returns empty string for blank input.
 */
export function normalizeCategory(value: string | undefined | null): string {
  if (!value) return "";
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isPreset(key: string): boolean {
  return PRESET_CATEGORY_KEYS.includes(key);
}

/**
 * Human-readable label. Presets use their canonical label from constants
 * (e.g. "tech" → "Technology"); customs are title-cased from the key.
 */
export function categoryLabel(key: string): string {
  const normalized = normalizeCategory(key);
  if (!normalized) return "";
  if (isPreset(normalized)) return PRESET_LABEL_MAP[normalized] ?? normalized;
  return normalized
    .split(" ")
    .map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ");
}

function categoryRank(key: string): number {
  const normalized = normalizeCategory(key);
  const idx = PRESET_CATEGORY_KEYS.indexOf(normalized);
  return idx === -1 ? PRESET_CATEGORY_KEYS.length : idx;
}

/**
 * Sort comparator — presets in their declared order, customs alphabetically
 * after presets.
 */
export function compareCategories(a: string, b: string): number {
  const ra = categoryRank(a);
  const rb = categoryRank(b);
  if (ra !== rb) return ra - rb;
  return normalizeCategory(a).localeCompare(normalizeCategory(b));
}

/**
 * Deduplicate, normalize, and sort a list of categories. Removes empty
 * entries. Returns a new array.
 */
export function sanitizeCategories(values: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  for (const v of values) {
    const key = normalizeCategory(v);
    if (key) seen.add(key);
  }
  return [...seen].sort(compareCategories);
}

/**
 * Pull a normalized categories array off a hackathon-shaped object,
 * falling back to wrapping a legacy single-value `category` field when
 * the newer `categories` array is missing. Centralizes the read path so
 * no UI surface has to reimplement the fallback.
 */
export function getHackathonCategories(
  source: { categories?: string[] | null; category?: string | null }
): string[] {
  const list = Array.isArray(source.categories) ? source.categories : null;
  if (list && list.length > 0) return sanitizeCategories(list);
  if (source.category) return sanitizeCategories([source.category]);
  return [];
}

/** Max length for a single category label (applied to customs). */
export const MAX_CATEGORY_LENGTH = 40;

/** Max number of categories allowed per hackathon. */
export const MAX_CATEGORIES_PER_HACKATHON = 8;
