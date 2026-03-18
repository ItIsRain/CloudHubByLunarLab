import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/user/data-export
 *
 * GDPR/UAE Data Compliance: allows authenticated users to download ALL their
 * personal data in a single JSON payload.
 *
 * Rate limiting note: production deployments should add rate limiting
 * (e.g. 1 request per hour per user) via middleware or an edge rate limiter.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);

    if (auth.type === "unauthenticated") {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const userId = auth.userId;
    const admin = getSupabaseAdminClient();

    // Collect data from all relevant tables in parallel
    const [
      profileResult,
      registrationsResult,
      teamMembersResult,
      bookmarksResult,
      notificationsResult,
    ] = await Promise.all([
      admin
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single(),
      admin
        .from("hackathon_registrations")
        .select("id, hackathon_id, status, form_data, created_at, updated_at, completeness_score, is_draft, rsvp_status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      admin
        .from("team_members")
        .select("id, team_id, role, joined_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      admin
        .from("bookmarks")
        .select("id, entity_type, entity_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      admin
        .from("notifications")
        .select("id, type, title, message, link, read, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      userId,
      profile: profileResult.data ?? null,
      hackathonRegistrations: registrationsResult.data ?? [],
      teamMemberships: teamMembersResult.data ?? [],
      bookmarks: bookmarksResult.data ?? [],
      notifications: notificationsResult.data ?? [],
    };

    return NextResponse.json({
      data: exportData,
      message: "Your personal data export is ready.",
    });
  } catch (err) {
    console.error("Data export error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
