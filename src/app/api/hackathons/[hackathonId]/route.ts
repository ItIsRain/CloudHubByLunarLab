import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToHackathon } from "@/lib/supabase/mappers";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function hackathonFilter(id: string) {
  return UUID_RE.test(id) ? `id.eq.${id}` : `slug.eq.${id}`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;
    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase
      .from("hackathons")
      .select("*, organizer:profiles!organizer_id(*), teams(count), submissions(count)")
      .or(hackathonFilter(hackathonId))
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Hackathon not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: dbRowToHackathon(data as Record<string, unknown>),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .or(hackathonFilter(hackathonId))
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Hackathon not found" },
        { status: 404 }
      );
    }
    if (existing.organizer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawUpdates = await request.json();

    // Prevent updating protected fields
    delete rawUpdates.id;
    delete rawUpdates.organizer_id;
    delete rawUpdates.created_at;
    delete rawUpdates.updated_at;
    delete rawUpdates.organizer;

    // Map camelCase keys to snake_case DB columns
    const keyMap: Record<string, string> = {
      registrationStart: "registration_start",
      registrationEnd: "registration_end",
      hackingStart: "hacking_start",
      hackingEnd: "hacking_end",
      submissionDeadline: "submission_deadline",
      judgingStart: "judging_start",
      judgingEnd: "judging_end",
      winnersAnnouncement: "winners_announcement",
      maxTeamSize: "max_team_size",
      minTeamSize: "min_team_size",
      allowSolo: "allow_solo",
      totalPrizePool: "total_prize_pool",
      coverImage: "cover_image",
      isFeatured: "is_featured",
      judgingCriteria: "judging_criteria",
    };

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawUpdates)) {
      updates[keyMap[key] || key] = value;
    }

    const { data, error } = await supabase
      .from("hackathons")
      .update(updates)
      .or(hackathonFilter(hackathonId))
      .select("*, organizer:profiles!organizer_id(*), teams(count), submissions(count)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      data: dbRowToHackathon(data as Record<string, unknown>),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .or(hackathonFilter(hackathonId))
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Hackathon not found" },
        { status: 404 }
      );
    }
    if (existing.organizer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("hackathons")
      .delete()
      .or(hackathonFilter(hackathonId));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Hackathon deleted successfully" });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
