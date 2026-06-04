import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest } from "@/lib/api-auth";
import { dbRowToHackathonMentor } from "@/lib/supabase/mappers";
import { UUID_RE } from "@/lib/constants";

const ROSTER_SELECT =
  "id, hackathon_id, user_id, email, name, expertise, bio, status, default_meeting_url, default_meeting_phone, invited_at, accepted_at, user:profiles!hackathon_mentors_user_id_fkey(*)";

/**
 * GET — list the hackathon's mentor roster.
 *  - Organizer: full roster (all statuses) including emails.
 *  - Everyone else (participants/public): accepted mentors only, no emails.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;
    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid competition ID" }, { status: 400 });
    }

    const auth = await authenticateRequest(request);
    const userId = auth.type === "unauthenticated" ? null : auth.userId;

    const admin = getSupabaseAdminClient();

    // Is the caller the organizer of this hackathon?
    let isOrganizer = false;
    if (userId) {
      const { data: hackathon } = await admin
        .from("hackathons")
        .select("organizer_id")
        .eq("id", hackathonId)
        .single();
      isOrganizer = hackathon?.organizer_id === userId;
    }

    let query = admin
      .from("hackathon_mentors")
      .select(ROSTER_SELECT)
      .eq("hackathon_id", hackathonId)
      .order("created_at", { ascending: true });

    if (!isOrganizer) {
      query = query.eq("status", "accepted");
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: "Failed to fetch mentors" }, { status: 400 });
    }

    const mentors = (data || []).map((row) =>
      dbRowToHackathonMentor(row as Record<string, unknown>, { includeEmail: isOrganizer })
    );

    return NextResponse.json({ data: mentors });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
