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
        { error: "Invalid hackathon ID" },
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
        { error: "Hackathon not found" },
        { status: 404 }
      );
    }

    // Only show winners for public/unlisted hackathons
    if (hackathon.visibility === "private") {
      return NextResponse.json(
        { error: "Hackathon not found" },
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

    // Strip sensitive data — only return public-safe fields
    const publicWinners = (winners ?? []).map((w) => {
      const reg = Array.isArray(w.registration)
        ? w.registration[0]
        : w.registration;
      const user = reg
        ? Array.isArray(reg.user)
          ? reg.user[0]
          : reg.user
        : null;
      const track = Array.isArray(w.track) ? w.track[0] : w.track;

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
