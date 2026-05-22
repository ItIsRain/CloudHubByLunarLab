import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";
import { checkHackathonAccess, canManage } from "@/lib/check-hackathon-access";

type RouteParams = {
  params: Promise<{ hackathonId: string; phaseId: string }>;
};

/**
 * POST — Auto-assign winners for the configured top-N award tracks on this
 * phase. Reads phase.auto_assign_track_ids (ordered) and pairs the highest
 * scoring teams in this phase to those tracks, position-by-position.
 *
 * One winner row per TEAM. For each top team, we pick a representative
 * registration_id (the team member whose registration has the team's best
 * score in this phase) so the existing winners surface still works.
 *
 * Idempotent: existing winner rows for the same (phase_id, award_track_id)
 * are replaced. Manual edits to winners outside the auto-assign tracks are
 * never touched. The organizer can edit/delete any auto-assigned row from
 * the Winners tab.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, phaseId } = await params;
    if (!UUID_RE.test(hackathonId) || !UUID_RE.test(phaseId)) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
    }

    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    const access = await checkHackathonAccess(supabase, hackathonId, auth.userId);
    if (!access.hasAccess || !canManage(access.role)) {
      return NextResponse.json(
        { error: "Only owner/admin can auto-assign winners" },
        { status: 403 }
      );
    }

    // Use admin client for the actual writes to avoid any RLS surprises.
    const admin = getSupabaseAdminClient();

    // 1. Load the phase + its track list
    const { data: phase, error: phaseErr } = await admin
      .from("competition_phases")
      .select("id, hackathon_id, auto_assign_track_ids")
      .eq("id", phaseId)
      .eq("hackathon_id", hackathonId)
      .single();

    if (phaseErr || !phase) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    const trackIds = (phase.auto_assign_track_ids as string[] | null) || [];
    if (trackIds.length === 0) {
      return NextResponse.json(
        {
          error:
            "No award tracks configured. Set auto_assign_track_ids on this phase first.",
        },
        { status: 400 }
      );
    }

    // 2. Pull all phase_scores for this phase. We need registration_id + score.
    const { data: scores, error: scoresErr } = await admin
      .from("phase_scores")
      .select("registration_id, total_score")
      .eq("phase_id", phaseId);

    if (scoresErr) {
      console.error("Failed to fetch scores:", scoresErr);
      return NextResponse.json({ error: "Failed to fetch scores" }, { status: 500 });
    }

    if (!scores || scores.length === 0) {
      return NextResponse.json(
        { error: "No scores yet — reviewers must finish scoring first." },
        { status: 400 }
      );
    }

    // 3. Resolve each registration to a team_id (so we can group scores by
    // team and pick one winner row per team rather than one per individual).
    const regIds = Array.from(
      new Set(scores.map((s) => s.registration_id as string).filter(Boolean))
    );

    const { data: registrations } = await admin
      .from("hackathon_registrations")
      .select("id, user_id")
      .in("id", regIds);

    const userIdByRegId = new Map<string, string>();
    for (const r of registrations || []) {
      userIdByRegId.set(r.id as string, r.user_id as string);
    }

    const userIds = Array.from(
      new Set(Array.from(userIdByRegId.values()).filter(Boolean))
    );

    // user_id -> team_id (within this hackathon)
    const { data: memberships } = await admin
      .from("team_members")
      .select("user_id, team_id, teams!inner(hackathon_id)")
      .in("user_id", userIds)
      .eq("teams.hackathon_id", hackathonId);

    const teamIdByUserId = new Map<string, string>();
    for (const m of memberships || []) {
      teamIdByUserId.set(m.user_id as string, m.team_id as string);
    }

    // 4. Aggregate scores by team. Each team gets the average of all
    // reviewer scores across all of its members' registrations.
    type TeamAgg = {
      teamId: string;
      sumScore: number;
      count: number;
      bestRegistrationId: string;
      bestRegScore: number;
    };
    const teamAggs = new Map<string, TeamAgg>();
    // Solo entries (no team) are also eligible — we still create a winner
    // row using their registration_id and a synthetic "solo:<regId>" key so
    // they don't collide with each other.
    for (const s of scores) {
      const regId = s.registration_id as string;
      if (!regId) continue;
      const userId = userIdByRegId.get(regId);
      const teamKey = userId ? teamIdByUserId.get(userId) ?? `solo:${regId}` : `solo:${regId}`;
      const score = Number(s.total_score) || 0;
      const agg = teamAggs.get(teamKey);
      if (!agg) {
        teamAggs.set(teamKey, {
          teamId: teamKey,
          sumScore: score,
          count: 1,
          bestRegistrationId: regId,
          bestRegScore: score,
        });
      } else {
        agg.sumScore += score;
        agg.count += 1;
        if (score > agg.bestRegScore) {
          agg.bestRegScore = score;
          agg.bestRegistrationId = regId;
        }
      }
    }

    // 5. Rank teams by average score (descending)
    const ranked = Array.from(teamAggs.values())
      .map((a) => ({
        ...a,
        avgScore: a.count > 0 ? a.sumScore / a.count : 0,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);

    if (ranked.length === 0) {
      return NextResponse.json(
        { error: "No eligible teams or solo entries found." },
        { status: 400 }
      );
    }

    // 6. For each award track (in order), assign the next-best team. Cap at
    // however many teams actually exist.
    const limit = Math.min(trackIds.length, ranked.length);

    // Fetch the track names up front for award_label.
    const { data: tracks } = await admin
      .from("award_tracks")
      .select("id, name")
      .in("id", trackIds);
    const trackNameById = new Map<string, string>();
    for (const t of tracks || []) {
      trackNameById.set(t.id as string, t.name as string);
    }

    // Clear any existing auto-assigned winners for these specific tracks on
    // this phase. Manual entries on OTHER tracks are untouched.
    await admin
      .from("competition_winners")
      .delete()
      .eq("hackathon_id", hackathonId)
      .eq("phase_id", phaseId)
      .in("award_track_id", trackIds.slice(0, limit));

    const winnerRows = [];
    for (let i = 0; i < limit; i++) {
      const trackId = trackIds[i];
      const team = ranked[i];
      winnerRows.push({
        hackathon_id: hackathonId,
        phase_id: phaseId,
        award_track_id: trackId,
        registration_id: team.bestRegistrationId,
        award_label: trackNameById.get(trackId) || `Rank ${i + 1}`,
        rank: i + 1,
        final_score: team.avgScore,
        confirmed: false,
        locked: false,
      });
    }

    const { data: inserted, error: insertErr } = await admin
      .from("competition_winners")
      .insert(winnerRows)
      .select("id, award_track_id, rank, final_score, registration_id");

    if (insertErr) {
      console.error("Failed to insert winners:", insertErr);
      return NextResponse.json(
        { error: "Failed to write winner rows" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        assigned: inserted?.length ?? 0,
        skipped: trackIds.length - limit,
        winners: inserted,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
