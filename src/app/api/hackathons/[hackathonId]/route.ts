import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToHackathon } from "@/lib/supabase/mappers";
import { getCurrentPhase, rowToTimeline } from "@/lib/hackathon-phases";

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

    // Auto-update status based on timeline dates
    const row = data as Record<string, unknown>;
    const timeline = rowToTimeline(row);
    const computedPhase = getCurrentPhase(timeline);
    if (timeline.status !== "draft" && row.status !== computedPhase) {
      row.status = computedPhase;
      // Fire-and-forget DB update
      Promise.resolve(
        supabase
          .from("hackathons")
          .update({ status: computedPhase })
          .eq("id", row.id as string)
      ).catch(() => {});
    }

    return NextResponse.json({
      data: dbRowToHackathon(row),
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

    const body = await request.json();

    // Allowlist + camelCase-to-snake_case key mapping
    const keyMap: Record<string, string> = {
      name: "name", tagline: "tagline", description: "description",
      cover_image: "cover_image", coverImage: "cover_image",
      logo: "logo", category: "category", tags: "tags", status: "status",
      location: "location",
      registration_start: "registration_start", registrationStart: "registration_start",
      registration_end: "registration_end", registrationEnd: "registration_end",
      hacking_start: "hacking_start", hackingStart: "hacking_start",
      hacking_end: "hacking_end", hackingEnd: "hacking_end",
      submission_deadline: "submission_deadline", submissionDeadline: "submission_deadline",
      judging_start: "judging_start", judgingStart: "judging_start",
      judging_end: "judging_end", judgingEnd: "judging_end",
      winners_announcement: "winners_announcement", winnersAnnouncement: "winners_announcement",
      max_team_size: "max_team_size", maxTeamSize: "max_team_size",
      min_team_size: "min_team_size", minTeamSize: "min_team_size",
      allow_solo: "allow_solo", allowSolo: "allow_solo",
      total_prize_pool: "total_prize_pool", totalPrizePool: "total_prize_pool",
      judging_criteria: "judging_criteria", judgingCriteria: "judging_criteria",
      tracks: "tracks", prizes: "prizes", rules: "rules",
      requirements: "requirements", resources: "resources", sponsors: "sponsors",
      faqs: "faqs", schedule: "schedule", judges: "judges", mentors: "mentors",
    };
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (key in keyMap) updates[keyMap[key]] = value;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Validate status against allowed values
    if (updates.status) {
      const allowedStatuses = [
        "draft", "registration-open", "hacking", "judging",
        "completed", "cancelled", "upcoming",
      ];
      if (!allowedStatuses.includes(updates.status as string)) {
        return NextResponse.json(
          { error: "Invalid hackathon status" },
          { status: 400 }
        );
      }
    }

    // Prevent publishing without required dates
    const targetStatus = updates.status as string | undefined;
    if (targetStatus && targetStatus !== "draft") {
      // Fetch current hackathon to merge with updates
      const { data: current } = await supabase
        .from("hackathons")
        .select("hacking_start, hacking_end, submission_deadline")
        .or(hackathonFilter(hackathonId))
        .single();

      const hackStart = updates.hacking_start ?? current?.hacking_start;
      const hackEnd = updates.hacking_end ?? current?.hacking_end;
      const subDeadline = updates.submission_deadline ?? current?.submission_deadline;

      if (!hackStart || !hackEnd || !subDeadline) {
        return NextResponse.json(
          { error: "Hacking start, hacking end, and submission deadline are required before publishing" },
          { status: 400 }
        );
      }
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
