import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeJoin = (val: any) => (Array.isArray(val) ? val[0] : val) ?? null;

/** A registration that is eligible to be reviewed in a given phase. */
export interface AssignableRegistration {
  id: string;
  user_id: string;
  form_data: Record<string, unknown> | null;
}

export type AssignablePoolResult =
  | { ok: true; registrations: AssignableRegistration[] }
  | { ok: false; status: number; message: string };

/**
 * Resolve the pool of registrations a phase's reviewers can be assigned to.
 *
 * This is the single source of truth for "who is eligible to be reviewed in
 * this phase" — used both by the auto/manual assignment writer (POST) and by
 * the assignable-pool reader (GET) so the two never diverge. Eligibility =
 * accepted/eligible/confirmed registrations, optionally narrowed by the phase's
 * campus filter and by advancement from its source phase(s).
 */
export async function resolveAssignablePool(
  supabase: SupabaseClient,
  hackathonId: string,
  hackathon: { screening_config?: Record<string, unknown> | null },
  phase: { id: string; campus_filter: string | null; source_phase_ids: string[] | null },
  // When the hackathon is team-based, the pool collapses to ONE representative
  // registration per team (the team leader, or any eligible member) so the team
  // is judged as a single unit — one assignment, one score, one decision.
  // Participants not on a team remain in the pool as themselves.
  teamsEnabled = false
): Promise<AssignablePoolResult> {
  const screeningConfig = (hackathon.screening_config as Record<string, unknown>) || {};
  const quotaFieldId = screeningConfig.quotaFieldId as string | undefined;
  const campusFilter = phase.campus_filter;

  // "approved" is the status set by the screening pipeline when an applicant
  // passes screening rules — without it here, screened-in registrants fall out
  // of the pool entirely and downstream phases report "no advanced applicants
  // from the source phase". Keep this in sync with the rest of the platform
  // (announcements, register, rsvp, teams/match all use this same set).
  const { data: registrations, error: regError } = await supabase
    .from("hackathon_registrations")
    .select("id, user_id, form_data")
    .eq("hackathon_id", hackathonId)
    .in("status", ["accepted", "approved", "confirmed", "eligible"]);

  if (regError) {
    return { ok: false, status: 400, message: "Failed to fetch registrations" };
  }
  if (!registrations || registrations.length === 0) {
    return { ok: false, status: 400, message: "No eligible applicants found" };
  }

  // Campus filter depends on a JSONB field, so apply it in JS.
  let filtered = registrations as AssignableRegistration[];
  if (campusFilter && quotaFieldId) {
    filtered = filtered.filter((reg) => {
      const formData = reg.form_data as Record<string, unknown> | null;
      if (!formData) return false;
      return String(formData[quotaFieldId] || "") === campusFilter;
    });
  }

  // Source-phase filter: only applicants who advanced (decision = "advance" or
  // listed as a finalist) from a source phase may be reviewed here.
  const sourcePhaseIds = phase.source_phase_ids || [];
  if (sourcePhaseIds.length > 0) {
    const { data: advanceDecisions, error: decError } = await supabase
      .from("phase_decisions")
      .select("registration_id")
      .in("phase_id", sourcePhaseIds)
      .eq("decision", "advance");

    if (decError) {
      return { ok: false, status: 500, message: "Failed to verify source phase advancement" };
    }

    // Finalists may be recorded under a source phase (advanced FROM it) OR
    // directly under THIS phase — the "promote top N / hand-pick into the
    // final" flow stores phase_finalists under the downstream phase id. Both
    // count as eligible to be reviewed here.
    const { data: finalists } = await supabase
      .from("phase_finalists")
      .select("registration_id")
      .in("phase_id", [...sourcePhaseIds, phase.id]);

    const advancedRegIds = new Set<string>();
    for (const d of advanceDecisions || []) advancedRegIds.add(d.registration_id as string);
    for (const f of finalists || []) advancedRegIds.add(f.registration_id as string);

    if (advancedRegIds.size === 0) {
      return {
        ok: false,
        status: 400,
        message:
          "No applicants have advanced from the source phase(s). Complete decisions in the source phase first.",
      };
    }

    filtered = filtered.filter((reg) => advancedRegIds.has(reg.id));
  }

  if (filtered.length === 0) {
    const message =
      sourcePhaseIds.length > 0
        ? "No advanced applicants match the filters for this phase"
        : campusFilter
          ? "No applicants match the campus filter for this phase"
          : "No eligible applicants found";
    return { ok: false, status: 400, message };
  }

  // Team-based hackathon → collapse each team to a single representative
  // registration so reviewers judge the team as one unit.
  if (teamsEnabled) {
    const regByUser = new Map<string, AssignableRegistration>();
    for (const r of filtered) regByUser.set(r.user_id, r);

    const { data: memberships } = await supabase
      .from("team_members")
      .select("user_id, team_id, is_leader, team:teams!team_members_team_id_fkey(id, hackathon_id)")
      .in("user_id", [...regByUser.keys()]);

    // Group eligible members by their team (only teams in THIS hackathon).
    const teamMembers = new Map<string, { userId: string; isLeader: boolean }[]>();
    const teamedUserIds = new Set<string>();
    for (const m of memberships || []) {
      const team = normalizeJoin((m as Record<string, unknown>).team);
      if (!team || team.hackathon_id !== hackathonId) continue;
      const userId = (m as Record<string, unknown>).user_id as string;
      if (!regByUser.has(userId)) continue; // only eligible members represent a team
      const teamId = (m as Record<string, unknown>).team_id as string;
      const arr = teamMembers.get(teamId) ?? [];
      arr.push({ userId, isLeader: (m as Record<string, unknown>).is_leader === true });
      teamMembers.set(teamId, arr);
      teamedUserIds.add(userId);
    }

    const reps: AssignableRegistration[] = [];
    for (const members of teamMembers.values()) {
      const leader = members.find((mm) => mm.isLeader);
      const chosen = leader ?? members[0];
      const rep = chosen && regByUser.get(chosen.userId);
      if (rep) reps.push(rep);
    }
    // Teamless eligible participants stay in the pool as individuals.
    for (const r of filtered) {
      if (!teamedUserIds.has(r.user_id)) reps.push(r);
    }

    filtered = reps;
  }

  return { ok: true, registrations: filtered };
}
