/**
 * Shared validator for dynamic-form-field arrays (FormField[]) and section
 * arrays (FormSection[]). Used by hackathon registration_fields/sections,
 * hackathon submission_fields/sections, and per-phase submission_fields.
 *
 * Returns null on success, or an error string on failure. Callers should
 * convert to a NextResponse with status 400.
 */

const VALID_FIELD_TYPES = new Set([
  "text",
  "textarea",
  "email",
  "phone",
  "url",
  "number",
  "date",
  "select",
  "multi_select",
  "radio",
  "checkbox",
  "file",
  "heading",
  "paragraph",
]);

export interface ValidateFormFieldsOptions {
  /** Defaults to 200. */
  maxFields?: number;
  /** Field name used in error messages, e.g. "submission_fields". */
  fieldName?: string;
}

export function validateFormFields(
  value: unknown,
  options: ValidateFormFieldsOptions = {}
): string | null {
  const fieldName = options.fieldName ?? "fields";
  const maxFields = options.maxFields ?? 200;

  if (!Array.isArray(value)) {
    return `${fieldName} must be an array`;
  }
  if (value.length > maxFields) {
    return `Maximum ${maxFields} ${fieldName} allowed`;
  }

  const seenIds = new Set<string>();
  for (const f of value as Record<string, unknown>[]) {
    if (!f || typeof f !== "object") {
      return `Each ${fieldName} entry must be an object`;
    }
    if (!f.id || typeof f.id !== "string") {
      return `Each ${fieldName} entry must have a string id`;
    }
    if (seenIds.has(f.id)) {
      return `Duplicate field id "${f.id}" in ${fieldName}`;
    }
    seenIds.add(f.id);

    if (!f.type || !VALID_FIELD_TYPES.has(f.type as string)) {
      return `Invalid field type "${f.type}" for field "${f.id}"`;
    }
    if (
      f.label &&
      typeof f.label === "string" &&
      (f.label as string).length > 500
    ) {
      return `Field label too long for "${f.id}" (max 500 chars)`;
    }
  }
  return null;
}

export interface ValidateFormSectionsOptions {
  /** Defaults to 50. */
  maxSections?: number;
  /** Field name used in error messages. */
  fieldName?: string;
}

export function validateFormSections(
  value: unknown,
  options: ValidateFormSectionsOptions = {}
): string | null {
  const fieldName = options.fieldName ?? "sections";
  const maxSections = options.maxSections ?? 50;

  if (!Array.isArray(value)) {
    return `${fieldName} must be an array`;
  }
  if (value.length > maxSections) {
    return `Maximum ${maxSections} ${fieldName} allowed`;
  }
  return null;
}
