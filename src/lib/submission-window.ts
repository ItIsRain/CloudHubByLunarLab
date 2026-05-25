/**
 * Single source of truth for "what submission do teams owe right now?".
 *
 * Resolution rules (designed against multi-phase hackathons):
 *   1. Find phases with submissions_enabled=true, sorted by sortOrder then
 *      submission_start.
 *   2. If any enabled phase is currently within its submission window,
 *      return that one (kind: "phase", status: "active").
 *   3. Else if an enabled phase has an upcoming window, return the
 *      earliest one (kind: "phase", status: "upcoming").
 *   4. Else if at least one enabled phase exists, all are closed — return
 *      the last enabled phase with status "all-closed".
 *   5. Else fall back to the hackathon's global submission setup
 *      (kind: "global"). If the hackathon disables submissions globally
 *      OR has no deadline configured, return kind: "none".
 */

import type { CompetitionPhase, FormField, FormSection, Hackathon } from "./types";

export type SubmissionWindowStatus = "active" | "upcoming" | "all-closed";

export type SubmissionTarget =
  | {
      kind: "phase";
      status: SubmissionWindowStatus;
      phase: CompetitionPhase;
      phaseId: string;
      deadline: string | null;
      opensAt: string | null;
      fields: FormField[];
      sections: FormSection[];
    }
  | {
      kind: "global";
      status: SubmissionWindowStatus;
      phaseId: null;
      deadline: string | null;
      opensAt: string | null;
      fields: FormField[];
      sections: FormSection[];
    }
  | {
      kind: "none";
      phaseId: null;
    };

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

function comparePhases(a: CompetitionPhase, b: CompetitionPhase): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  const aStart = parseTime(a.submissionStart) ?? Number.POSITIVE_INFINITY;
  const bStart = parseTime(b.submissionStart) ?? Number.POSITIVE_INFINITY;
  if (aStart !== bStart) return aStart - bStart;
  return a.createdAt.localeCompare(b.createdAt);
}

/**
 * The fallback target when no phase claims submissions. Reads the
 * hackathon-level fields and surfaces "active" / "upcoming" / "all-closed"
 * based on hacking_start / submission_deadline, matching the pre-phase UX.
 */
function globalTarget(
  hackathon: Hackathon,
  now: Date
): SubmissionTarget {
  if (hackathon.submissionsEnabled === false) {
    return { kind: "none", phaseId: null };
  }

  const deadline = hackathon.submissionDeadline || null;
  const opensAt = hackathon.hackingStart || null;
  const fields = (hackathon.submissionFields as FormField[] | undefined) ?? [];
  const sections = (hackathon.submissionSections as FormSection[] | undefined) ?? [];

  // No deadline configured at all — treat as no submission round.
  if (!deadline && !opensAt && fields.length === 0) {
    return { kind: "none", phaseId: null };
  }

  const nowMs = now.getTime();
  const openMs = parseTime(opensAt);
  const closeMs = parseTime(deadline);

  let status: SubmissionWindowStatus;
  if (closeMs !== null && nowMs >= closeMs) status = "all-closed";
  else if (openMs !== null && nowMs < openMs) status = "upcoming";
  else status = "active";

  return {
    kind: "global",
    status,
    phaseId: null,
    deadline,
    opensAt,
    fields,
    sections,
  };
}

export function getCurrentSubmissionTarget(
  hackathon: Hackathon,
  phases: CompetitionPhase[],
  now: Date = new Date()
): SubmissionTarget {
  const enabled = phases
    .filter((p) => p.submissionsEnabled === true)
    .sort(comparePhases);

  if (enabled.length === 0) {
    return globalTarget(hackathon, now);
  }

  const nowMs = now.getTime();

  // Pick the active phase first.
  const active = enabled.find((p) => {
    const start = parseTime(p.submissionStart);
    const end = parseTime(p.submissionEnd);
    if (start !== null && nowMs < start) return false;
    if (end !== null && nowMs >= end) return false;
    // If a phase enables submissions but has no window, treat it as open
    // (organizer's responsibility to fill it in; better than silently
    // hiding submissions).
    return true;
  });
  if (active) {
    return {
      kind: "phase",
      status: "active",
      phase: active,
      phaseId: active.id,
      deadline: active.submissionEnd ?? null,
      opensAt: active.submissionStart ?? null,
      fields: active.submissionFields ?? [],
      sections: active.submissionSections ?? [],
    };
  }

  // Otherwise pick the next upcoming phase by start time.
  const upcoming = enabled
    .filter((p) => {
      const start = parseTime(p.submissionStart);
      return start !== null && nowMs < start;
    })
    .sort((a, b) => {
      const aStart = parseTime(a.submissionStart) ?? Number.POSITIVE_INFINITY;
      const bStart = parseTime(b.submissionStart) ?? Number.POSITIVE_INFINITY;
      return aStart - bStart;
    })[0];
  if (upcoming) {
    return {
      kind: "phase",
      status: "upcoming",
      phase: upcoming,
      phaseId: upcoming.id,
      deadline: upcoming.submissionEnd ?? null,
      opensAt: upcoming.submissionStart ?? null,
      fields: upcoming.submissionFields ?? [],
      sections: upcoming.submissionSections ?? [],
    };
  }

  // All enabled phases are in the past.
  const last = enabled[enabled.length - 1];
  return {
    kind: "phase",
    status: "all-closed",
    phase: last,
    phaseId: last.id,
    deadline: last.submissionEnd ?? null,
    opensAt: last.submissionStart ?? null,
    fields: last.submissionFields ?? [],
    sections: last.submissionSections ?? [],
  };
}

/**
 * Convenience predicate: can a team submit right now for the given target?
 * Returns true only for "active" windows.
 */
export function canSubmitNow(target: SubmissionTarget): boolean {
  return target.kind !== "none" && target.status === "active";
}

/**
 * The full ordered list of submission rounds (for "show me all phase
 * deadlines" UIs like the team workspace). Returns an empty array when
 * there are no enabled phases — caller can fall back to a single-round
 * UI driven by getCurrentSubmissionTarget.
 */
export function listSubmissionPhases(
  phases: CompetitionPhase[]
): CompetitionPhase[] {
  return phases.filter((p) => p.submissionsEnabled === true).sort(comparePhases);
}
