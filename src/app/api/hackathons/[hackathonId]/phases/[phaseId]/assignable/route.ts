import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";
import { resolveAssignablePool } from "@/lib/phase-assignments";

type RouteParams = { params: Promise<{ hackathonId: string; phaseId: string }> };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeJoin = (val: any) => (Array.isArray(val) ? val[0] : val) ?? null;

/**
 * GET — the pool of participants a reviewer can be assigned to in this phase,
 * enriched with profile + team info. Powers the organizer's manual
 * "select which teams/individuals this judge will review" picker.
 *
 * Returns one entry per eligible registration. When the hackathon is
 * team-based, `teamId`/`teamName` let the UI group members under their team so
 * the organizer can select a whole team at once.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, phaseId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid competition ID" }, { status: 400 });
    }
    if (!UUID_RE.test(phaseId)) {
      return NextResponse.json({ error: "Invalid phase ID" }, { status: 400 });
    }

    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) return NextResponse.json({ error: scopeError }, { status: 403 });
    }

    const supabase = getSupabaseAdminClient();

    // Organizer-only: the picker exposes participant identities.
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id, screening_config, teams_enabled")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }
    if (hackathon.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: phase } = await supabase
      .from("competition_phases")
      .select("id, campus_filter, source_phase_ids")
      .eq("id", phaseId)
      .eq("hackathon_id", hackathonId)
      .maybeSingle();

    if (!phase) {
      return NextResponse.json({ error: "Phase not found in this competition" }, { status: 404 });
    }

    const pool = await resolveAssignablePool(supabase, hackathonId, hackathon, {
      campus_filter: (phase.campus_filter as string | null) ?? null,
      source_phase_ids: (phase.source_phase_ids as string[] | null) ?? null,
    });

    // An empty/ineligible pool is a valid, non-error state for the picker.
    if (!pool.ok) {
      return NextResponse.json({
        data: [],
        teamsEnabled: hackathon.teams_enabled === true,
        reason: pool.message,
      });
    }

    const userIds = [...new Set(pool.registrations.map((r) => r.user_id))];

    // Profiles (names/emails) and team memberships for the pool.
    const [{ data: profiles }, { data: memberships }] = await Promise.all([
      supabase.from("profiles").select("id, name, email").in("id", userIds),
      supabase
        .from("team_members")
        .select("user_id, team_id, team:teams!team_members_team_id_fkey(id, hackathon_id, name)")
        .in("user_id", userIds),
    ]);

    const profileMap: Record<string, { name: string; email: string }> = {};
    for (const p of profiles || []) {
      profileMap[p.id as string] = {
        name: (p.name as string) || "",
        email: (p.email as string) || "",
      };
    }

    // user_id → team (only teams that belong to THIS hackathon).
    const userTeam: Record<string, { id: string; name: string }> = {};
    for (const m of memberships || []) {
      const team = normalizeJoin((m as Record<string, unknown>).team);
      if (team && team.hackathon_id === hackathonId) {
        userTeam[(m as Record<string, unknown>).user_id as string] = {
          id: team.id as string,
          name: (team.name as string) || "Unnamed team",
        };
      }
    }

    const data = pool.registrations.map((r) => {
      const profile = profileMap[r.user_id];
      const team = userTeam[r.user_id] || null;
      return {
        registrationId: r.id,
        userId: r.user_id,
        name: profile?.name || "",
        email: profile?.email || "",
        teamId: team?.id ?? null,
        teamName: team?.name ?? null,
      };
    });

    return NextResponse.json(
      { data, teamsEnabled: hackathon.teams_enabled === true },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
