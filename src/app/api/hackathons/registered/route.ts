import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbRowToHackathon } from "@/lib/supabase/mappers";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { getCurrentPhase, rowToTimeline } from "@/lib/hackathon-phases";
import { UUID_RE } from "@/lib/constants";

// Registration states that should NOT surface a hackathon in the participant's
// "Competing in" list — the user has left, been turned away, or never finished.
const HIDDEN_REGISTRATION_STATUSES = [
  "cancelled",
  "rejected",
  "ineligible",
  "declined",
  "draft",
];

// Sort active/upcoming competitions before completed ones (mirrors the main
// hackathons listing). Completed competitions still show, just at the bottom.
const ACTIVE_STATUSES = new Set([
  "published", "registration-open", "registration_open",
  "registration-closed", "registration_closed",
  "hacking", "submission", "judging",
]);

/**
 * GET /api/hackathons/registered
 *
 * Returns the hackathons the authenticated user is a participant in (has a live
 * registration for) — regardless of the competition's visibility or whether
 * registration is still open. This powers the dashboard "Competing in" section,
 * which is distinct from `?organizerId=` (hackathons the user runs).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) return NextResponse.json({ error: scopeError }, { status: 403 });
    }

    const admin = getSupabaseAdminClient();

    // 1. Which hackathons is this user registered for?
    const { data: regRows, error: regError } = await admin
      .from("hackathon_registrations")
      .select("hackathon_id, status")
      .eq("user_id", auth.userId)
      .not("status", "in", `(${HIDDEN_REGISTRATION_STATUSES.join(",")})`);

    if (regError) {
      console.error("Failed to fetch registrations:", regError.message);
      return NextResponse.json({ error: "Failed to fetch registrations" }, { status: 400 });
    }

    const hackathonIds = Array.from(
      new Set(
        (regRows || [])
          .map((r) => r.hackathon_id as string)
          .filter((id) => UUID_RE.test(id))
      )
    );

    if (hackathonIds.length === 0) {
      return NextResponse.json({ data: [], total: 0, page: 1, pageSize: 0, totalPages: 0, hasMore: false });
    }

    // 2. Fetch those hackathons (skip drafts — a draft the user somehow has a
    //    registration row for shouldn't appear).
    const { data, error } = await admin
      .from("hackathons")
      .select("*, organizer:profiles!organizer_id(*), teams(count), submissions(count)")
      .in("id", hackathonIds)
      .neq("status", "draft");

    if (error) {
      console.error("Failed to fetch registered competitions:", error.message);
      return NextResponse.json({ error: "Failed to fetch competitions" }, { status: 400 });
    }

    const hackathons = (data || []).map((row: Record<string, unknown>) => {
      // Recompute the phase from timeline dates so the card reflects the live
      // state (e.g. "registration-closed") rather than a stale stored status.
      const timeline = rowToTimeline(row);
      const computedPhase = getCurrentPhase(timeline);
      const effectiveRow =
        timeline.status !== "draft" && row.status !== computedPhase
          ? { ...row, status: computedPhase }
          : row;
      return dbRowToHackathon(effectiveRow);
    });

    hackathons.sort((a, b) => {
      const aActive = ACTIVE_STATUSES.has(a.status) ? 0 : 1;
      const bActive = ACTIVE_STATUSES.has(b.status) ? 0 : 1;
      return aActive - bActive;
    });

    return NextResponse.json(
      {
        data: hackathons,
        total: hackathons.length,
        page: 1,
        pageSize: hackathons.length,
        totalPages: 1,
        hasMore: false,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
