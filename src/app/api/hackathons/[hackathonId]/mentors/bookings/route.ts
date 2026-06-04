import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { dbRowToMentorSession, dbRowToMentorAvailabilityBlock } from "@/lib/supabase/mappers";
import { findSlotByStart } from "@/lib/mentor-slots";
import { sendMentorBookingRequestEmail } from "@/lib/resend";
import { UUID_RE } from "@/lib/constants";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const SESSION_SELECT =
  "*, mentor:profiles!mentor_sessions_mentor_id_fkey(*), mentee:profiles!mentor_sessions_mentee_id_fkey(*), team:teams!mentor_sessions_team_id_fkey(id, name, avatar)";

function normalizeJoin<T>(val: unknown): T | null {
  return (Array.isArray(val) ? val[0] : val) ?? null;
}

/** Human-readable slot label in the block's timezone, e.g. "Fri, Jun 12, 2026, 2:00 PM GST". */
function formatSlot(startIso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone,
      timeZoneName: "short",
    }).format(new Date(startIso));
  } catch {
    return new Date(startIso).toUTCString();
  }
}

/**
 * GET — list bookings for this hackathon. `?role=mentor` returns sessions where
 * the caller is the mentor (manage view); `?role=mentee` (default) returns the
 * caller's own bookings. Effective meeting link/phone fall back to the mentor's
 * defaults when a per-session value isn't set.
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
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const role = request.nextUrl.searchParams.get("role") === "mentor" ? "mentor" : "mentee";
    const admin = getSupabaseAdminClient();

    let query = admin
      .from("mentor_sessions")
      .select(SESSION_SELECT)
      .eq("hackathon_id", hackathonId)
      .order("session_date", { ascending: true });

    query = role === "mentor"
      ? query.eq("mentor_id", auth.userId)
      : query.eq("mentee_id", auth.userId);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 400 });
    }

    const sessions = (data || []).map((r) => dbRowToMentorSession(r as Record<string, unknown>));

    // For the PARTICIPANT (mentee) view, surface the EFFECTIVE meeting link/phone
    // (per-session value, else the mentor's default) so they can join. The mentor
    // (manage) view keeps raw per-session values so the dialog edits the override,
    // not the default — returning new objects (no mutation).
    if (role === "mentee") {
      const mentorIds = [...new Set(sessions.map((s) => s.mentorId))];
      if (mentorIds.length > 0) {
        const { data: rosters } = await admin
          .from("hackathon_mentors")
          .select("user_id, default_meeting_url, default_meeting_phone")
          .eq("hackathon_id", hackathonId)
          .in("user_id", mentorIds);
        const defaults = new Map((rosters || []).map((r) => [r.user_id as string, r]));
        const enriched = sessions.map((s) => {
          const d = defaults.get(s.mentorId);
          return {
            ...s,
            meetingUrl: s.meetingUrl || (d?.default_meeting_url as string) || undefined,
            meetingPhone: s.meetingPhone || (d?.default_meeting_phone as string) || undefined,
          };
        });
        return NextResponse.json({ data: enriched });
      }
    }

    return NextResponse.json({ data: sessions });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST — a participant requests a mentoring slot (status 'pending'). Validates
 * the slot against the mentor's availability, derives the participant's team,
 * and notifies/ emails the mentor. The partial unique index guards against
 * double-booking (concurrent request -> 409).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;
    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid competition ID" }, { status: 400 });
    }

    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) return NextResponse.json({ error: scopeError }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const rosterId = String(body.mentorId || "");
    const blockId = String(body.blockId || "");
    const start = String(body.start || "");
    const topic = body.topic ? String(body.topic).slice(0, 200) : "";

    if (!UUID_RE.test(rosterId) || !UUID_RE.test(blockId)) {
      return NextResponse.json({ error: "Invalid mentor or slot" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();

    // Resolve the accepted mentor.
    const { data: roster } = await admin
      .from("hackathon_mentors")
      .select("user_id, status, email, name")
      .eq("id", rosterId)
      .eq("hackathon_id", hackathonId)
      .maybeSingle();

    if (!roster || roster.status !== "accepted" || !roster.user_id) {
      return NextResponse.json({ error: "Mentor is not available." }, { status: 404 });
    }
    const mentorUserId = roster.user_id as string;
    if (mentorUserId === auth.userId) {
      return NextResponse.json({ error: "You can't book yourself." }, { status: 400 });
    }

    // Validate the slot against the availability block.
    const { data: blockRow } = await admin
      .from("mentor_availability_blocks")
      .select("id, hackathon_id, mentor_user_id, date, start_time, end_time, slot_duration_minutes, timezone, created_at")
      .eq("id", blockId)
      .eq("hackathon_id", hackathonId)
      .eq("mentor_user_id", mentorUserId)
      .maybeSingle();

    if (!blockRow) {
      return NextResponse.json({ error: "That availability is no longer offered." }, { status: 404 });
    }

    const block = dbRowToMentorAvailabilityBlock(blockRow as Record<string, unknown>);
    const slot = findSlotByStart(block, start);
    if (!slot) {
      return NextResponse.json({ error: "Invalid time slot." }, { status: 400 });
    }
    if (new Date(slot.start).getTime() <= Date.now()) {
      return NextResponse.json({ error: "That slot is in the past." }, { status: 400 });
    }

    // Derive the participant's team in this hackathon (if any). `.limit(1)` keeps
    // this robust even if data ever has a user on >1 team in a hackathon.
    const { data: memberships } = await admin
      .from("team_members")
      .select("team_id, teams!inner(id, name, hackathon_id)")
      .eq("user_id", auth.userId)
      .eq("teams.hackathon_id", hackathonId)
      .limit(1);

    const membership = memberships?.[0];
    const team = membership ? normalizeJoin<{ id: string; name: string }>(membership.teams) : null;

    const { data: menteeProfile } = await admin
      .from("profiles")
      .select("name")
      .eq("id", auth.userId)
      .single();

    const bookedByLabel = team?.name || menteeProfile?.name || "A participant";

    // Insert the pending session. The partial unique index enforces no double-hold.
    const { data: created, error: insertError } = await admin
      .from("mentor_sessions")
      .insert({
        mentor_id: mentorUserId,
        mentee_id: auth.userId,
        hackathon_id: hackathonId,
        team_id: team?.id || null,
        title: topic || "Mentoring session",
        status: "pending",
        session_date: slot.start,
        duration_minutes: slot.durationMinutes,
        availability_block_id: blockId,
      })
      .select(SESSION_SELECT)
      .single();

    if (insertError) {
      if ((insertError as { code?: string }).code === "23505") {
        return NextResponse.json({ error: "That slot was just booked. Please pick another." }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to request booking" }, { status: 400 });
    }

    const slotLabel = formatSlot(slot.start, block.timezone);
    const { data: hk } = await admin
      .from("hackathons")
      .select("name")
      .eq("id", hackathonId)
      .single();
    const hackathonName = (hk?.name as string) || "the competition";

    // Notify + email the mentor (best effort).
    admin
      .from("notifications")
      .insert({
        user_id: mentorUserId,
        type: "team-invite",
        title: "New mentoring request",
        message: `${bookedByLabel} requested a mentoring session (${slotLabel}).`,
        link: `/hackathons/${hackathonId}/manage-mentorship`,
      })
      .then(() => {}, () => {});

    if (roster.email) {
      sendMentorBookingRequestEmail({
        to: roster.email as string,
        mentorName: (roster.name as string) || "Mentor",
        bookedByLabel,
        hackathonName,
        slotLabel,
        topic: topic || undefined,
        manageUrl: `${SITE_URL}/hackathons/${hackathonId}/manage-mentorship`,
      }).catch((e) => console.error("[mentor-booking] email failed:", e));
    }

    return NextResponse.json({
      data: dbRowToMentorSession(created as Record<string, unknown>),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
