import type { HackathonStatus } from "@/lib/types";

export interface HackathonTimeline {
  registrationStart: string;
  registrationEnd: string;
  hackingStart: string;
  hackingEnd: string;
  submissionDeadline: string;
  judgingStart: string;
  judgingEnd: string;
  winnersAnnouncement: string;
  status: HackathonStatus;
}

/** Safe date parser — returns 0 for empty/invalid strings instead of NaN */
function safeTime(iso: string): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Derives the current phase from hackathon dates.
 * Draft status is always respected; otherwise dates are the source of truth.
 */
export function getCurrentPhase(
  h: HackathonTimeline,
  now: Date = new Date()
): HackathonStatus {
  if (h.status === "draft") return "draft";

  const t = now.getTime();
  const regStart = safeTime(h.registrationStart);
  const regEnd = safeTime(h.registrationEnd);
  const hackStart = safeTime(h.hackingStart);
  const subDeadline = safeTime(h.submissionDeadline);
  const judgeStart = safeTime(h.judgingStart);
  const judgeEnd = safeTime(h.judgingEnd);
  const winnersAt = safeTime(h.winnersAnnouncement);

  // If critical dates are missing, fall back to stored status
  if (!regStart && !hackStart && !subDeadline) return h.status;

  if (regStart && t < regStart) return "published";
  if (regEnd && t < regEnd) return "registration-open";
  if (hackStart && t < hackStart) return "registration-closed";
  if (subDeadline && t < subDeadline) return "hacking";
  // Between submission deadline and judging start = submission phase
  if (judgeStart && t < judgeStart) return "submission";
  if (judgeEnd && t < judgeEnd) return "judging";
  if (winnersAt && t >= winnersAt) return "completed";

  // Between judging end and winners announcement
  if (judgeEnd && t >= judgeEnd) return "judging";

  return h.status;
}

export function canRegister(
  h: HackathonTimeline,
  now: Date = new Date()
): boolean {
  if (h.status === "draft") return false;
  const t = now.getTime();
  const start = safeTime(h.registrationStart);
  const end = safeTime(h.registrationEnd);
  if (!start || !end) return false;
  return t >= start && t < end;
}

export function canSubmit(
  h: HackathonTimeline,
  now: Date = new Date()
): boolean {
  if (h.status === "draft") return false;
  const t = now.getTime();
  const start = safeTime(h.hackingStart);
  const end = safeTime(h.submissionDeadline);
  if (!start || !end) return false;
  return t >= start && t < end;
}

export function canJudge(
  h: HackathonTimeline,
  now: Date = new Date()
): boolean {
  if (h.status === "draft") return false;
  const t = now.getTime();
  const start = safeTime(h.judgingStart);
  const end = safeTime(h.judgingEnd);
  if (!start || !end) return false;
  return t >= start && t < end;
}

export function canViewResults(
  h: HackathonTimeline,
  now: Date = new Date()
): boolean {
  if (h.status === "draft") return false;
  const winnersAt = safeTime(h.winnersAnnouncement);
  if (!winnersAt) return false;
  return now.getTime() >= winnersAt;
}

export function canFormTeams(
  h: HackathonTimeline,
  now: Date = new Date()
): boolean {
  if (h.status === "draft") return false;
  const t = now.getTime();
  const start = safeTime(h.registrationStart);
  const end = safeTime(h.submissionDeadline);
  if (!start || !end) return false;
  return t >= start && t < end;
}

type PhaseAction =
  | "register"
  | "submit"
  | "judge"
  | "viewResults"
  | "formTeams";

const actionConfig: Record<
  PhaseAction,
  { startField: keyof HackathonTimeline; endField: keyof HackathonTimeline; label: string }
> = {
  register: {
    startField: "registrationStart",
    endField: "registrationEnd",
    label: "Registration",
  },
  submit: {
    startField: "hackingStart",
    endField: "submissionDeadline",
    label: "Submissions",
  },
  judge: {
    startField: "judgingStart",
    endField: "judgingEnd",
    label: "Judging",
  },
  viewResults: {
    startField: "winnersAnnouncement",
    endField: "winnersAnnouncement",
    label: "Results",
  },
  formTeams: {
    startField: "registrationStart",
    endField: "submissionDeadline",
    label: "Team formation",
  },
};

function formatDate(iso: string): string {
  if (!iso) return "TBD";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/**
 * Returns a user-friendly message about an action's availability.
 */
export function getPhaseMessage(
  h: HackathonTimeline,
  action: PhaseAction,
  now: Date = new Date()
): string {
  if (h.status === "draft") return "This hackathon is still in draft.";

  const config = actionConfig[action];
  const t = now.getTime();
  const start = safeTime(h[config.startField] as string);
  const end = safeTime(h[config.endField] as string);

  if (!start && !end) return `${config.label} dates have not been set yet.`;

  if (start && t < start) {
    return `${config.label} opens on ${formatDate(h[config.startField] as string)}.`;
  }
  if (end && t >= end) {
    return `${config.label} closed on ${formatDate(h[config.endField] as string)}.`;
  }
  return `${config.label} is open until ${formatDate(h[config.endField] as string)}.`;
}

/**
 * Converts a snake_case DB row to HackathonTimeline.
 */
export function rowToTimeline(
  row: Record<string, unknown>
): HackathonTimeline {
  return {
    registrationStart: (row.registration_start as string) || "",
    registrationEnd: (row.registration_end as string) || "",
    hackingStart: (row.hacking_start as string) || "",
    hackingEnd: (row.hacking_end as string) || "",
    submissionDeadline: (row.submission_deadline as string) || "",
    judgingStart: (row.judging_start as string) || "",
    judgingEnd: (row.judging_end as string) || "",
    winnersAnnouncement: (row.winners_announcement as string) || "",
    status: (row.status as HackathonStatus) || "draft",
  };
}
