import type { SupabaseClient } from "@supabase/supabase-js";

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
  phase: { campus_filter: string | null; source_phase_ids: string[] | null }
): Promise<AssignablePoolResult> {
  const screeningConfig = (hackathon.screening_config as Record<string, unknown>) || {};
  const quotaFieldId = screeningConfig.quotaFieldId as string | undefined;
  const campusFilter = phase.campus_filter;

  const { data: registrations, error: regError } = await supabase
    .from("hackathon_registrations")
    .select("id, user_id, form_data")
    .eq("hackathon_id", hackathonId)
    .in("status", ["accepted", "eligible", "confirmed"]);

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

    const { data: finalists } = await supabase
      .from("phase_finalists")
      .select("registration_id")
      .in("phase_id", sourcePhaseIds);

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

  return { ok: true, registrations: filtered };
}
