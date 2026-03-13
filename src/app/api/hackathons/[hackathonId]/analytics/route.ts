import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    // Dual auth: session cookies OR API key
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

    // Verify user is the hackathon organizer
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }
    if (hackathon.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Registration counts grouped by status
    const { data: registrations, error: regError } = await supabase
      .from("hackathon_registrations")
      .select("id, status, created_at")
      .eq("hackathon_id", hackathonId);

    if (regError) {
      return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 400 });
    }

    const registrationsByStatus: Record<string, number> = {};
    const timelineMap: Record<string, number> = {};

    for (const reg of registrations || []) {
      // Group by status
      const status = reg.status as string;
      registrationsByStatus[status] = (registrationsByStatus[status] || 0) + 1;

      // Group by date (truncated to day) for timeline
      const day = (reg.created_at as string).slice(0, 10); // "YYYY-MM-DD"
      timelineMap[day] = (timelineMap[day] || 0) + 1;
    }

    // Sort timeline chronologically
    const registrationTimeline = Object.entries(timelineMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // 2. Team count for this hackathon
    const { count: teamCount, error: teamError } = await supabase
      .from("teams")
      .select("id", { count: "exact", head: true })
      .eq("hackathon_id", hackathonId);

    if (teamError) {
      return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 400 });
    }

    // 3. Submissions for this hackathon (need full rows for track distribution)
    const { data: submissions, error: subError } = await supabase
      .from("submissions")
      .select("id, track")
      .eq("hackathon_id", hackathonId);

    if (subError) {
      return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 400 });
    }

    const submissionCount = submissions?.length || 0;

    // 4. Track distribution from submissions
    const trackMap: Record<string, number> = {};
    for (const sub of submissions || []) {
      const track = sub.track as { name?: string } | null;
      const trackName = track?.name || "Unassigned";
      trackMap[trackName] = (trackMap[trackName] || 0) + 1;
    }

    const trackDistribution = Object.entries(trackMap).map(
      ([track, count]) => ({ track, count })
    );

    // 5. Scoring progress — get submission IDs, then count scores
    const submissionIds = (submissions || []).map(
      (s) => s.id as string
    );

    let scored = 0;
    if (submissionIds.length > 0) {
      // Count distinct submissions that have at least one score
      const { data: scoredRows, error: scoreError } = await supabase
        .from("scores")
        .select("submission_id")
        .in("submission_id", submissionIds);

      if (scoreError) {
        return NextResponse.json(
          { error: "Failed to fetch analytics" },
          { status: 400 }
        );
      }

      // Count unique submission IDs that have been scored
      const scoredSubmissionIds = new Set(
        (scoredRows || []).map(
          (r: Record<string, unknown>) => r.submission_id as string
        )
      );
      scored = scoredSubmissionIds.size;
    }

    return NextResponse.json({
      data: {
        registrationsByStatus,
        registrationTimeline,
        teamCount: teamCount || 0,
        submissionCount,
        trackDistribution,
        scoringProgress: {
          scored,
          total: submissionCount,
        },
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
