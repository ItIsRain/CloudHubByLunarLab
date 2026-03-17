import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/hackathons/my-phases
 *
 * Returns all phases where the current user is an accepted (or invited) reviewer.
 * Used by the reviewer dashboard to discover which phases they can score.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) return NextResponse.json({ error: scopeError }, { status: 403 });
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    // Fetch all phase_reviewers rows for this user, joining phase and hackathon details
    const { data: reviewerRows, error } = await supabase
      .from("phase_reviewers")
      .select(`
        id,
        phase_id,
        user_id,
        name,
        email,
        status,
        invited_at,
        accepted_at,
        phase:competition_phases!phase_reviewers_phase_id_fkey(
          id,
          name,
          phase_type,
          status,
          scoring_criteria,
          hackathon_id,
          campus_filter,
          hackathon:hackathons!competition_phases_hackathon_id_fkey(
            id,
            name,
            tagline,
            status,
            banner_url
          )
        )
      `)
      .eq("user_id", auth.userId)
      .in("status", ["accepted", "invited"])
      .order("accepted_at", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("Failed to fetch reviewer phases:", error);
      return NextResponse.json({ error: "Failed to fetch reviewer phases" }, { status: 500 });
    }

    // Transform into a flat structure for the frontend
    const phases = (reviewerRows || [])
      .filter((r) => r.phase != null)
      .map((r) => {
        const phase = r.phase as unknown as Record<string, unknown>;
        const hackathon = phase?.hackathon as unknown as Record<string, unknown> | null;
        return {
          reviewerId: r.id,
          reviewerStatus: r.status,
          invitedAt: r.invited_at,
          acceptedAt: r.accepted_at,
          phaseId: phase?.id,
          phaseName: phase?.name,
          phaseType: phase?.phase_type,
          phaseStatus: phase?.status,
          campusFilter: phase?.campus_filter,
          hackathonId: hackathon?.id,
          hackathonName: hackathon?.name,
          hackathonTagline: hackathon?.tagline,
          hackathonStatus: hackathon?.status,
          hackathonBanner: hackathon?.banner_url,
        };
      });

    return NextResponse.json({ data: phases });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
