import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { UUID_RE } from "@/lib/constants";

/**
 * GET /api/hackathons/[hackathonId]/winners/public
 *
 * Public (no-auth) endpoint that returns winners ONLY after the
 * hackathon's winners_announcement date has passed.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json(
        { error: "Invalid competition ID" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // Fetch hackathon to check winners_announcement date and visibility
    const { data: hackathon, error: hErr } = await supabase
      .from("hackathons")
      .select("id, status, visibility, winners_announcement")
      .eq("id", hackathonId)
      .single();

    if (hErr || !hackathon) {
      return NextResponse.json(
        { error: "Competition not found" },
        { status: 404 }
      );
    }

    // Only show winners for public/unlisted hackathons
    if (hackathon.visibility === "private") {
      return NextResponse.json(
        { error: "Competition not found" },
        { status: 404 }
      );
    }

    // Check if winners_announcement date has passed
    const announcementDate = hackathon.winners_announcement
      ? new Date(hackathon.winners_announcement as string)
      : null;
    const now = new Date();

    if (!announcementDate || announcementDate > now) {
      // Winners not yet announced
      return NextResponse.json({ data: [], announced: false });
    }

    // Fetch winners with registration user info and track info
    const { data: winners, error } = await supabase
      .from("competition_winners")
      .select(
        "id, award_label, award_track_id, rank, final_score, notes, registration:hackathon_registrations!competition_winners_registration_id_fkey(id, user_id, form_data, user:profiles!hackathon_registrations_user_id_fkey(id, name, username, avatar)), track:award_tracks!competition_winners_award_track_id_fkey(id, name, description, track_type)"
      )
      .eq("hackathon_id", hackathonId)
      .order("rank", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("Failed to fetch public winners:", error);
      return NextResponse.json(
        { error: "Failed to fetch winners" },
        { status: 500 }
      );
    }

    // For team-based competitions, look up each winner's team so the public
    // page can render team names + members rather than just the individual.
    // Solo entries (no team) fall back to the participant block.
    const winnerRows = (winners ?? []) as Record<string, unknown>[];
    const normalizeJoin = (v: unknown) =>
      Array.isArray(v) ? (v[0] as Record<string, unknown> | undefined) : (v as Record<string, unknown> | null);

    const userIds: string[] = [];
    for (const w of winnerRows) {
      const reg = normalizeJoin(w.registration);
      const uid = reg?.user_id as string | undefined;
      if (uid) userIds.push(uid);
    }

    const userTeam: Record<string, { id: string; name: string }> = {};
    const teamIds = new Set<string>();
    if (userIds.length > 0) {
      const { data: memberships } = await supabase
        .from("team_members")
        .select(
          "user_id, team_id, team:teams!team_members_team_id_fkey(id, name, hackathon_id)"
        )
        .in("user_id", userIds);
      for (const m of memberships || []) {
        const row = m as Record<string, unknown>;
        const team = normalizeJoin(row.team);
        if (!team || team.hackathon_id !== hackathonId) continue;
        const tid = team.id as string;
        userTeam[row.user_id as string] = {
          id: tid,
          name: (team.name as string) || "Unnamed team",
        };
        teamIds.add(tid);
      }
    }

    const teamMembers: Record<
      string,
      Array<{ id: string; name: string | null; username: string | null; avatar: string | null }>
    > = {};
    if (teamIds.size > 0) {
      const { data: allMembers } = await supabase
        .from("team_members")
        .select(
          "team_id, user_id, is_leader, user:profiles!team_members_user_id_fkey(id, name, username, avatar)"
        )
        .in("team_id", [...teamIds]);
      for (const m of allMembers || []) {
        const row = m as Record<string, unknown>;
        const tid = row.team_id as string;
        const u = normalizeJoin(row.user);
        if (!u) continue;
        (teamMembers[tid] ||= []).push({
          id: u.id as string,
          name: (u.name as string | null) ?? null,
          username: (u.username as string | null) ?? null,
          avatar: (u.avatar as string | null) ?? null,
        });
      }
    }

    // Strip sensitive data — only return public-safe fields
    const publicWinners = winnerRows.map((w) => {
      const reg = normalizeJoin(w.registration);
      const user = reg ? normalizeJoin(reg.user) : null;
      const track = normalizeJoin(w.track);
      const uid = reg?.user_id as string | undefined;
      const team = uid ? userTeam[uid] : null;

      return {
        id: w.id,
        awardLabel: w.award_label,
        rank: w.rank,
        finalScore: w.final_score,
        track: track
          ? {
              id: track.id,
              name: track.name,
              description: track.description,
              trackType: track.track_type,
            }
          : null,
        participant: user
          ? {
              id: user.id,
              name: user.name,
              username: user.username,
              avatar: user.avatar,
            }
          : null,
        team: team
          ? {
              id: team.id,
              name: team.name,
              members: teamMembers[team.id] || [],
            }
          : null,
      };
    });

    return NextResponse.json({ data: publicWinners, announced: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
