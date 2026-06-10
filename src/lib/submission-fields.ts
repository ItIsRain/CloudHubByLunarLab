import type { FormField } from "./types";

/** Coerce any custom-field value into a display string. */
function valueToString(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(valueToString).filter(Boolean).join(", ");
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.url === "string") return o.url; // file-upload field
    return "";
  }
  return String(v);
}

/** First field whose label matches `re`, returned as a trimmed string. */
function findValue(
  fields: FormField[],
  values: Record<string, unknown>,
  re: RegExp
): string {
  const field = fields.find((f) => re.test(f.label || ""));
  if (!field) return "";
  return valueToString(values[field.id]).trim();
}

/**
 * When a submission is driven by an organizer-defined form, the structured
 * submission columns (project_name, tagline, description — all NOT NULL — plus
 * github/demo for nicer cards & the judge's structured view) are derived from
 * the matching custom fields by label. Everything is still stored verbatim in
 * form_data; this just keeps the required columns populated.
 */
export function deriveSubmissionCore(
  fields: FormField[],
  values: Record<string, unknown>
): {
  projectName: string;
  tagline: string;
  description: string;
  githubUrl: string;
  demoUrl: string;
} {
  return {
    projectName: findValue(fields, values, /project\s*name|app\s*name|product\s*name|team\s*name/i),
    tagline: findValue(fields, values, /tagline|one[-\s]?line|elevator|slogan/i),
    description: findValue(fields, values, /solution\s*desc|description|summary|about|problem\s*state/i),
    githubUrl: findValue(fields, values, /github|gitlab|repo/i),
    demoUrl: findValue(fields, values, /live\s*demo|demo\s*url|demo\s*link|website|product\s*url/i),
  };
}
