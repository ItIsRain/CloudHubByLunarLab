import type { FormFieldType, FormFieldOption } from "@/lib/types";

// ── Regexes ────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** http(s)://, ftp://, mailto:, or bare domains like www.foo.com / foo.bar.io. */
const URL_RE =
  /^((https?|ftp):\/\/|www\.|mailto:)\S+$|^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i;
const PHONE_RE = /^[+]?[\d\s\-().]{7,20}$/;
const ISO_DATE_RE = /^\d{4}-\d{1,2}-\d{1,2}(T.*)?$/;
const SLASH_DATE_RE = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
const MONTH_RE =
  /^(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?)\b/i;
const NUMERIC_LIKE_RE = /^-?\$?\s?\d[\d,]*(\.\d+)?\s?%?$/;
const BARE_INT_RE = /^-?\d+$/;
/** A non-empty value that's all whitespace / dashes / "-" / "N/A" is "blank". */
const BLANK_LIKE_RE = /^(n\/?a|none|null|nil|-+)$/i;

// ── Header heuristics ─────────────────────────────────────
// Lower-cased trimmed header → strong hints. Each list ordered by priority.

const NAME_HEADERS = new Set([
  "name",
  "full name",
  "fullname",
  "applicant name",
  "participant name",
  "your name",
  "first name",
  "last name",
]);
const EMAIL_HEADERS = new Set([
  "email",
  "email address",
  "e-mail",
  "applicant email",
  "contact email",
  "your email",
]);

const URL_HINT = [
  "url",
  "website",
  "link",
  "github",
  "linkedin",
  "instagram",
  "twitter",
  "x.com",
  "facebook",
  "youtube",
  "demo",
  "pitch",
  "deck",
  "portfolio",
  "drive",
  "figma",
  "notion",
];
const PHONE_HINT = ["phone", "mobile", "whatsapp", "tel", "telephone"];
const DATE_HINT = ["date", "dob", "birthday", "birth", "deadline", "founded"];
const NUMBER_HINT = [
  "age",
  "amount",
  "count",
  "qty",
  "quantity",
  "price",
  "fee",
  "salary",
  "revenue",
  "headcount",
  "year",
  "size",
];
const TEXTAREA_HINT = [
  "problem",
  "solution",
  "description",
  "summary",
  "story",
  "bio",
  "background",
  "explain",
  "explanation",
  "why",
  "how",
  "what",
  "plan",
  "vision",
  "strategy",
  "model",
  "approach",
  "notes",
  "details",
  "abstract",
  "pitch",
  "proposal",
  "elaborate",
];
const SELECT_HINT = [
  "sector",
  "industry",
  "category",
  "type",
  "focus",
  "country",
  "city",
  "region",
  "campus",
  "role",
  "experience",
  "level",
  "track",
  "plan",
  "tier",
  "stage",
  "status",
  "gender",
];
const MULTI_SELECT_HINT = [
  "tags",
  "skills",
  "languages",
  "interests",
  "technologies",
  "stack",
  "tools",
  "topics",
  "areas",
];

function headerHas(h: string, list: string[]): boolean {
  const lc = h.toLowerCase();
  return list.some((k) => lc.includes(k));
}

export function isNameHeader(h: string): boolean {
  const l = h.toLowerCase().trim();
  return NAME_HEADERS.has(l) || /\bname$/.test(l);
}

export function isEmailHeader(h: string): boolean {
  const l = h.toLowerCase().trim();
  return EMAIL_HEADERS.has(l);
}

// ── Cell normalization ────────────────────────────────────

function isBlank(v: string): boolean {
  const t = v.trim();
  return t.length === 0 || BLANK_LIKE_RE.test(t);
}

function normalizeNumberLike(v: string): string {
  return v.trim().replace(/[$,%\s]/g, "");
}

function looksLikeNumber(v: string): boolean {
  const n = normalizeNumberLike(v);
  if (!n) return false;
  return NUMERIC_LIKE_RE.test(v.trim()) || /^-?\d+(\.\d+)?$/.test(n);
}

function looksLikeDate(v: string): boolean {
  const t = v.trim();
  if (ISO_DATE_RE.test(t) || SLASH_DATE_RE.test(t)) return true;
  if (MONTH_RE.test(t) && /\d{1,4}/.test(t)) return true;
  const d = Date.parse(t);
  // Date.parse is permissive; constrain to reasonable years so things like
  // "10" don't get treated as the year 10 AD.
  if (!Number.isNaN(d)) {
    const year = new Date(d).getFullYear();
    if (year >= 1900 && year <= 2200 && /\d{4}/.test(t)) return true;
  }
  return false;
}

// ── Main detector ─────────────────────────────────────────

export interface DetectResult {
  type: FormFieldType;
  options?: FormFieldOption[];
  /**
   * Confidence in the chosen type (0..1). Used by the UI to mark columns as
   * "AI suggested" / "uncertain", and to decide whether to ask Claude Haiku.
   */
  confidence: number;
  /** Why we picked this type — surfaced as a tooltip in the dialog. */
  reason: string;
  /** Was a multi-select detected because values look comma-separated? */
  multiSelectDelimiter?: "," | ";" | "|";
}

const VALUE_TOO_LONG_FOR_SELECT = 60;
const MAX_SELECT_OPTIONS = 30;
const TEXTAREA_AVG_LEN = 110;
const TEXTAREA_MAX_LEN_TRIGGER = 220;

export function detectFieldType(
  header: string,
  values: string[]
): DetectResult {
  const nonBlank = values.filter((v) => !isBlank(v));
  if (nonBlank.length === 0) {
    return {
      type: "text",
      confidence: 0.4,
      reason: "Empty column — defaulting to short text",
    };
  }

  const sample = nonBlank.slice(0, 200);
  const hLc = header.toLowerCase();

  // ── 1. Strong header signals ─────────────────────────────
  if (headerHas(hLc, ["email"])) {
    const valid = sample.filter((v) => EMAIL_RE.test(v.trim())).length;
    if (valid / sample.length > 0.6) {
      return { type: "email", confidence: 0.98, reason: "Header + values look like emails" };
    }
  }
  if (headerHas(hLc, PHONE_HINT)) {
    const valid = sample.filter((v) => PHONE_RE.test(v.trim())).length;
    if (valid / sample.length > 0.4) {
      return { type: "phone", confidence: 0.95, reason: "Header mentions phone/mobile" };
    }
  }
  if (headerHas(hLc, URL_HINT)) {
    return { type: "url", confidence: 0.95, reason: "Header mentions URL/website/social/link" };
  }
  if (headerHas(hLc, DATE_HINT)) {
    if (sample.every(looksLikeDate)) {
      return { type: "date", confidence: 0.92, reason: "Header + values look like dates" };
    }
  }
  if (headerHas(hLc, MULTI_SELECT_HINT)) {
    const delim = detectMultiSelectDelimiter(sample);
    if (delim) {
      const options = buildOptionsFromSplits(sample, delim);
      return {
        type: "multi_select",
        options,
        confidence: 0.9,
        reason: "Header is multi-select-y AND values look comma/semicolon-separated",
        multiSelectDelimiter: delim,
      };
    }
  }

  // ── 2. Content sniffing ─────────────────────────────────
  // Email / URL / number / date — all-or-most pass tests
  const emailHits = sample.filter((v) => EMAIL_RE.test(v.trim())).length;
  if (emailHits / sample.length > 0.85) {
    return { type: "email", confidence: 0.95, reason: "Values match the email pattern" };
  }
  const urlHits = sample.filter((v) => URL_RE.test(v.trim())).length;
  if (urlHits / sample.length > 0.7) {
    return { type: "url", confidence: 0.9, reason: "Values look like URLs" };
  }
  const phoneHits = sample.filter((v) => PHONE_RE.test(v.trim())).length;
  if (phoneHits / sample.length > 0.85 && !sample.every(looksLikeNumber)) {
    return { type: "phone", confidence: 0.8, reason: "Values look like phone numbers" };
  }
  if (sample.every(looksLikeDate)) {
    return { type: "date", confidence: 0.85, reason: "All values parse as dates" };
  }
  if (sample.every(looksLikeNumber)) {
    // bare integers without commas/$ are confident; mixed with $/%/, are still numeric
    const intsOnly = sample.every((v) => BARE_INT_RE.test(v.trim()));
    return {
      type: "number",
      confidence: intsOnly ? 0.95 : 0.85,
      reason: intsOnly ? "All values are integers" : "All values are numeric ($, %, comma OK)",
    };
  }

  // ── 3. Long-prose detection (textarea) ──────────────────
  const lengths = sample.map((v) => v.length);
  const maxLen = Math.max(...lengths);
  const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const hasNewline = sample.some((v) => /\r|\n/.test(v));
  const textareaHint = headerHas(hLc, TEXTAREA_HINT);

  if (
    hasNewline ||
    maxLen > TEXTAREA_MAX_LEN_TRIGGER ||
    avgLen > TEXTAREA_AVG_LEN ||
    (textareaHint && avgLen > 40)
  ) {
    return {
      type: "textarea",
      confidence: hasNewline ? 0.95 : textareaHint ? 0.85 : 0.7,
      reason: hasNewline
        ? "Values contain line breaks"
        : textareaHint
          ? "Header is description-y and values are long"
          : `Average length ${Math.round(avgLen)} chars — long prose`,
    };
  }

  // ── 4. Multi-select by delimiter ────────────────────────
  const multiDelim = detectMultiSelectDelimiter(sample);
  if (multiDelim) {
    const opts = buildOptionsFromSplits(sample, multiDelim);
    if (opts.length >= 2 && opts.length <= MAX_SELECT_OPTIONS) {
      return {
        type: "multi_select",
        options: opts,
        confidence: 0.75,
        reason: "Values look like multiple delimited choices",
        multiSelectDelimiter: multiDelim,
      };
    }
  }

  // ── 5. Low-cardinality dropdown ─────────────────────────
  const unique = new Set(sample.map((v) => v.trim()));
  const allShort = sample.every((v) => v.trim().length <= VALUE_TOO_LONG_FOR_SELECT);
  const selectHint = headerHas(hLc, SELECT_HINT);

  if (
    allShort &&
    unique.size >= 2 &&
    unique.size <= MAX_SELECT_OPTIONS &&
    (unique.size <= 10 || selectHint || unique.size < sample.length * 0.6)
  ) {
    const options: FormFieldOption[] = [...unique]
      .sort()
      .map((v) => ({ label: v, value: slugifyValue(v) }));
    return {
      type: "select",
      options,
      confidence: selectHint ? 0.92 : 0.7,
      reason: selectHint
        ? "Header sounds categorical and values are short + repeating"
        : `${unique.size} repeating short values look like a dropdown`,
    };
  }

  // ── 6. Number / phone fallbacks via header hint ─────────
  if (headerHas(hLc, NUMBER_HINT) && sample.some(looksLikeNumber)) {
    return { type: "number", confidence: 0.65, reason: "Header sounds numeric" };
  }

  // ── 7. Default ──────────────────────────────────────────
  if (avgLen > 80) {
    return {
      type: "textarea",
      confidence: 0.6,
      reason: `Average length ${Math.round(avgLen)} chars — leaning textarea`,
    };
  }
  return { type: "text", confidence: 0.5, reason: "No strong signal — short text" };
}

// ── Helpers ───────────────────────────────────────────────

function detectMultiSelectDelimiter(values: string[]): "," | ";" | "|" | null {
  // A value is "multi" if it contains the delimiter AND, after splitting,
  // each piece is short and non-empty. We avoid commas in prose-y cells
  // by requiring no spaces around commas to dominate — "AI, ML, Robotics"
  // is multi, "Hi, this is a sentence" is not.
  for (const delim of [",", ";", "|"] as const) {
    const isMulti = values.filter((v) => {
      if (!v.includes(delim)) return false;
      const pieces = v.split(delim).map((p) => p.trim()).filter(Boolean);
      if (pieces.length < 2) return false;
      // Each piece must be short and not sentence-y.
      return pieces.every((p) => p.length > 0 && p.length <= 40 && !/[.!?]$/.test(p));
    }).length;
    if (isMulti / values.length > 0.5) return delim;
  }
  return null;
}

function buildOptionsFromSplits(
  values: string[],
  delim: "," | ";" | "|"
): FormFieldOption[] {
  const unique = new Set<string>();
  for (const v of values) {
    for (const piece of v.split(delim)) {
      const t = piece.trim();
      if (t) unique.add(t);
    }
  }
  return [...unique]
    .sort()
    .slice(0, MAX_SELECT_OPTIONS)
    .map((v) => ({ label: v, value: slugifyValue(v) }));
}

export function slugifyValue(v: string): string {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function slugifyHeader(h: string): string {
  return h
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);
}
