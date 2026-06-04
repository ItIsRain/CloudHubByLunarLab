import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest } from "@/lib/api-auth";
import type { MyMentorship } from "@/lib/types";

/**
 * GET — hackathons where the current user is an ACCEPTED mentor. (Invited rows
 * have a null user_id until the invite is accepted, so they can't be matched
 * here — acceptance happens via the token route.) Mirrors /api/hackathons/
 * my-phases and drives the "Manage Mentorship" entry on the hackathon page.
 * Uses the admin client (auth verified at the API level) so the embedded
 * hackathon resolves regardless of RLS.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("hackathon_mentors")
      .select(
        "id, hackathon_id, user_id, status, default_meeting_url, default_meeting_phone, invited_at, accepted_at, hackathon:hackathons!hackathon_mentors_hackathon_id_fkey(id, name, slug, status, cover_image)"
      )
      .eq("user_id", auth.userId)
      .eq("status", "accepted")
      .order("accepted_at", { ascending: false, nullsFirst: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch mentorships" }, { status: 400 });
    }

    const mentorships: MyMentorship[] = (data || []).map((row: Record<string, unknown>) => {
      const h = (Array.isArray(row.hackathon) ? row.hackathon[0] : row.hackathon) as
        | Record<string, unknown>
        | null;
      return {
        mentorshipId: row.id as string,
        mentorId: (row.user_id as string) || null,
        hackathonId: row.hackathon_id as string,
        hackathonName: (h?.name as string) || "Competition",
        hackathonSlug: (h?.slug as string) || null,
        hackathonStatus: (h?.status as string) || null,
        hackathonBanner: (h?.cover_image as string) || null,
        status: (row.status as MyMentorship["status"]) || "invited",
        defaultMeetingUrl: (row.default_meeting_url as string) || undefined,
        defaultMeetingPhone: (row.default_meeting_phone as string) || undefined,
        invitedAt: row.invited_at as string,
        acceptedAt: (row.accepted_at as string) || null,
      };
    });

    return NextResponse.json({ data: mentorships });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
