/**
 * Screening Engine
 * Evaluates application data against configurable screening rules.
 *
 * Rules define REJECTION / FLAG conditions (not pass conditions).
 * - Hard rule: "Reject when [field] [operator] [value]"
 * - Soft rule: "Flag when [field] [operator] [value]"
 *
 * If the operator condition matches, the rule is TRIGGERED and the
 * applicant fails that rule.
 */

import type { ScreeningRule, ScreeningOperator, FormField } from "@/lib/types";

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  ruleType: "hard" | "soft";
  passed: boolean;
  actualValue: unknown;
  reason: string;
}

/**
 * Evaluate a single screening rule against application data.
 */
export function evaluateRule(
  rule: ScreeningRule,
  applicationData: Record<string, unknown>,
  fields: FormField[]
): RuleEvaluationResult {
  const fieldValue = applicationData[rule.fieldId];
  const field = fields.find((f) => f.id === rule.fieldId);
  const fieldLabel = field?.label || rule.fieldId;

  const result: RuleEvaluationResult = {
    ruleId: rule.id,
    ruleName: rule.name,
    ruleType: rule.ruleType,
    passed: false,
    actualValue: fieldValue,
    reason: "",
  };

  try {
    // Rules define rejection conditions: operator match = TRIGGERED = applicant fails
    const triggered = evaluateOperator(rule.operator, fieldValue, rule.value);
    result.passed = !triggered;
    result.reason = result.passed
      ? `${fieldLabel}: passed "${rule.name}"`
      : `${fieldLabel}: failed "${rule.name}" — value "${String(fieldValue ?? "(empty)")}" ${describeCondition(rule.operator, rule.value)}`;
  } catch {
    result.passed = false;
    result.reason = `Error evaluating rule "${rule.name}" on field "${fieldLabel}"`;
  }

  return result;
}

/**
 * Evaluate all enabled rules for a form against application data.
 * Returns results sorted by rule order.
 */
export function evaluateAllRules(
  rules: ScreeningRule[],
  applicationData: Record<string, unknown>,
  fields: FormField[]
): {
  results: RuleEvaluationResult[];
  hardPassed: boolean;
  softFlags: RuleEvaluationResult[];
  totalHard: number;
  passedHard: number;
  failedHard: number;
} {
  const enabledRules = rules
    .filter((r) => r.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const results = enabledRules.map((rule) =>
    evaluateRule(rule, applicationData, fields)
  );

  const hardResults = results.filter((r) => r.ruleType === "hard");
  const softResults = results.filter((r) => r.ruleType === "soft");

  const passedHard = hardResults.filter((r) => r.passed).length;
  const failedHard = hardResults.filter((r) => !r.passed).length;

  return {
    results,
    hardPassed: failedHard === 0,
    softFlags: softResults.filter((r) => !r.passed),
    totalHard: hardResults.length,
    passedHard,
    failedHard,
  };
}

/**
 * Calculate a completeness score (0–100) based on how many
 * "quality signals" an application has.
 */
export function calculateCompletenessScore(
  applicationData: Record<string, unknown>,
  fields: FormField[]
): number {
  const scorableFields = fields.filter(
    (f) => f.type !== "heading" && f.type !== "paragraph"
  );

  if (scorableFields.length === 0) return 100;

  let filled = 0;
  let bonus = 0;
  const totalSlots = scorableFields.length;

  for (const field of scorableFields) {
    const value = applicationData[field.id];
    if (isFieldFilled(value)) {
      filled++;
      // Bonus points for optional fields that were still filled
      if (!field.required) bonus += 0.5;
    }
  }

  // Base score from required + optional fill rate (0-85)
  const baseScore = (filled / totalSlots) * 85;
  // Bonus score from optional completeness (0-15)
  const bonusScore = Math.min(bonus * 3, 15);

  return Math.min(100, Math.round((baseScore + bonusScore) * 100) / 100);
}

/**
 * Detect potential duplicate applications within a form.
 * Returns an array of duplicate flag descriptions.
 */
export function detectDuplicates(
  application: {
    id: string;
    applicantEmail: string;
    applicantPhone?: string;
    startupName?: string;
    data: Record<string, unknown>;
  },
  existingApplications: {
    id: string;
    applicantEmail: string;
    applicantPhone?: string;
    startupName?: string;
    data: Record<string, unknown>;
  }[]
): {
  flagType: "duplicate_email" | "duplicate_phone" | "duplicate_linkedin" | "duplicate_startup";
  message: string;
  relatedApplicationId: string;
}[] {
  const flags: {
    flagType: "duplicate_email" | "duplicate_phone" | "duplicate_linkedin" | "duplicate_startup";
    message: string;
    relatedApplicationId: string;
  }[] = [];

  for (const existing of existingApplications) {
    if (existing.id === application.id) continue;

    // Email match
    if (
      application.applicantEmail &&
      existing.applicantEmail &&
      application.applicantEmail.toLowerCase().trim() === existing.applicantEmail.toLowerCase().trim()
    ) {
      flags.push({
        flagType: "duplicate_email",
        message: `Duplicate email "${application.applicantEmail}" — matches application ${existing.id.slice(0, 8)}`,
        relatedApplicationId: existing.id,
      });
    }

    // Phone match
    if (
      application.applicantPhone &&
      existing.applicantPhone &&
      normalizePhone(application.applicantPhone) === normalizePhone(existing.applicantPhone)
    ) {
      flags.push({
        flagType: "duplicate_phone",
        message: `Duplicate phone "${application.applicantPhone}" — matches application ${existing.id.slice(0, 8)}`,
        relatedApplicationId: existing.id,
      });
    }

    // Startup name match (fuzzy)
    if (
      application.startupName &&
      existing.startupName &&
      fuzzyMatch(application.startupName, existing.startupName)
    ) {
      flags.push({
        flagType: "duplicate_startup",
        message: `Similar startup name "${application.startupName}" ≈ "${existing.startupName}" — matches application ${existing.id.slice(0, 8)}`,
        relatedApplicationId: existing.id,
      });
    }

    // LinkedIn match
    const appLinkedin = findLinkedinValue(application.data);
    const existLinkedin = findLinkedinValue(existing.data);
    if (appLinkedin && existLinkedin && normalizeLinkedin(appLinkedin) === normalizeLinkedin(existLinkedin)) {
      flags.push({
        flagType: "duplicate_linkedin",
        message: `Duplicate LinkedIn "${appLinkedin}" — matches application ${existing.id.slice(0, 8)}`,
        relatedApplicationId: existing.id,
      });
    }
  }

  return flags;
}

// ── Helpers ─────────────────────────────────────────

function evaluateOperator(
  operator: ScreeningOperator,
  actual: unknown,
  expected: unknown
): boolean {
  // Normalize null/undefined to empty string for consistent string comparisons
  const actualStr = String(actual ?? "").toLowerCase().trim();
  const expectedStr = String(expected ?? "").toLowerCase().trim();

  switch (operator) {
    case "equals":
      return actualStr === expectedStr;
    case "not_equals":
      return actualStr !== expectedStr;
    case "contains":
      return actualStr.includes(expectedStr);
    case "not_contains":
      return !actualStr.includes(expectedStr);
    case "greater_than": {
      // Guard: non-numeric values should NOT trigger numeric comparisons.
      // Number(null)===0, Number([])===0, Number("  ")===0 all cause false matches.
      if (!isNumericValue(actual)) return false;
      const numA = Number(actual), numE = Number(expected);
      return !isNaN(numA) && !isNaN(numE) && numA > numE;
    }
    case "less_than": {
      if (!isNumericValue(actual)) return false;
      const numA = Number(actual), numE = Number(expected);
      return !isNaN(numA) && !isNaN(numE) && numA < numE;
    }
    case "greater_equal": {
      if (!isNumericValue(actual)) return false;
      const numA = Number(actual), numE = Number(expected);
      return !isNaN(numA) && !isNaN(numE) && numA >= numE;
    }
    case "less_equal": {
      if (!isNumericValue(actual)) return false;
      const numA = Number(actual), numE = Number(expected);
      return !isNaN(numA) && !isNaN(numE) && numA <= numE;
    }
    case "in": {
      const list = Array.isArray(expected) ? expected : [expected];
      const lowerList = list.map((v) => String(v).toLowerCase().trim());
      if (Array.isArray(actual)) {
        return actual.some((v) => lowerList.includes(String(v).toLowerCase().trim()));
      }
      return lowerList.includes(actualStr);
    }
    case "not_in": {
      const list2 = Array.isArray(expected) ? expected : [expected];
      const lowerList2 = list2.map((v) => String(v).toLowerCase().trim());
      if (Array.isArray(actual)) {
        return !actual.some((v) => lowerList2.includes(String(v).toLowerCase().trim()));
      }
      return !lowerList2.includes(actualStr);
    }
    case "is_empty":
      return actual === null || actual === undefined || (typeof actual === "string" && actual.trim() === "") || (Array.isArray(actual) && actual.length === 0);
    case "is_not_empty":
      return actual !== null && actual !== undefined && !(typeof actual === "string" && actual.trim() === "") && !(Array.isArray(actual) && actual.length === 0);
    case "is_true": {
      if (actual === true) return true;
      const trueStr = typeof actual === "string" ? actual.toLowerCase().trim() : "";
      return trueStr === "true" || trueStr === "yes";
    }
    case "is_false": {
      // Only match explicit boolean false values — not falsy values like 0 or ""
      if (actual === false) return true;
      const falseStr = typeof actual === "string" ? actual.toLowerCase().trim() : "";
      return falseStr === "false" || falseStr === "no";
    }
    default:
      return false;
  }
}

/** Describes the rejection condition that was triggered (human-readable). */
function describeCondition(operator: ScreeningOperator, value: unknown): string {
  switch (operator) {
    case "equals": return `equals "${value}"`;
    case "not_equals": return `does not equal "${value}"`;
    case "contains": return `contains "${value}"`;
    case "not_contains": return `does not contain "${value}"`;
    case "greater_than": return `is greater than ${value}`;
    case "less_than": return `is less than ${value}`;
    case "greater_equal": return `is >= ${value}`;
    case "less_equal": return `is <= ${value}`;
    case "in": return `is one of [${Array.isArray(value) ? value.join(", ") : value}]`;
    case "not_in": return `is not one of [${Array.isArray(value) ? value.join(", ") : value}]`;
    case "is_empty": return "is empty";
    case "is_not_empty": return "is not empty";
    case "is_true": return "is true/yes";
    case "is_false": return "is false/no";
    default: return String(value);
  }
}

/**
 * Check if a value is genuinely numeric (not null, undefined, empty, whitespace,
 * or an array — all of which JavaScript's Number() silently coerces to 0).
 */
function isNumericValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "number") return true;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed !== "" && !isNaN(Number(trimmed));
  }
  return false; // arrays, objects, booleans — not numeric
}

function isFieldFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return true;
  return !!value;
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\+]/g, "").slice(-9);
}

function normalizeLinkedin(url: string): string {
  return url.toLowerCase().replace(/https?:\/\/(www\.)?linkedin\.com\/in\//g, "").replace(/\/$/, "").trim();
}

function findLinkedinValue(data: Record<string, unknown>): string | null {
  for (const [, value] of Object.entries(data)) {
    if (typeof value === "string" && value.toLowerCase().includes("linkedin.com/in/")) {
      return value;
    }
  }
  return null;
}

function fuzzyMatch(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  // Simple Levenshtein-like check: if >80% characters match
  if (na.length < 3 || nb.length < 3) return na === nb;
  const longer = na.length > nb.length ? na : nb;
  const shorter = na.length > nb.length ? nb : na;
  if (longer.includes(shorter)) return true;
  // Character overlap ratio
  const charSet = new Set(shorter.split(""));
  let matches = 0;
  for (const c of longer) {
    if (charSet.has(c)) matches++;
  }
  return matches / longer.length > 0.8;
}
