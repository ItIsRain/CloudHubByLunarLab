import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { dbRowToMentorAvailabilityBlock } from "@/lib/supabase/mappers";
import { UUID_RE } from "@/lib/constants";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const BLOCK_SELECT =
  "id, hackathon_id, mentor_user_id, date, start_time, end_time, slot_duration_minutes, timezone, created_at";

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/**
 * GET — list availability blocks.
 *  - `?mentorId=<rosterId>`: that (accepted) mentor's blocks (public, for booking).
 *  - otherwise: the caller's own blocks for this hackathon.
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

    const admin = getSupabaseAdminClient();
    const rosterId = request.nextUrl.searchParams.get("mentorId");

    let mentorUserId: string | null = null;

    if (rosterId) {
      if (!UUID_RE.test(rosterId)) {
        return NextResponse.json({ error: "Invalid mentor ID" }, { status: 400 });
      }
      const { data: roster } = await admin
        .from("hackathon_mentors")
        .select("user_id, status")
        .eq("id", rosterId)
        .eq("hackathon_id", hackathonId)
        .maybeSingle();
      if (!roster || roster.status !== "accepted" || !roster.user_id) {
        return NextResponse.json({ data: [] });
      }
      mentorUserId = roster.user_id as string;
    } else {
      const auth = await authenticateRequest(request);
      if (auth.type === "unauthenticated") {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      mentorUserId = auth.userId;
    }

    const { data, error } = await admin
      .from("mentor_availability_blocks")
      .select(BLOCK_SELECT)
      .eq("hackathon_id", hackathonId)
      .eq("mentor_user_id", mentorUserId)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch availability" }, { status: 400 });
    }

    return NextResponse.json({
      data: (data || []).map((r) => dbRowToMentorAvailabilityBlock(r as Record<string, unknown>)),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST — an accepted mentor adds an availability block for this hackathon.
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

    const admin = getSupabaseAdminClient();

    // Must be an accepted mentor for this hackathon.
    const { data: roster } = await admin
      .from("hackathon_mentors")
      .select("id")
      .eq("hackathon_id", hackathonId)
      .eq("user_id", auth.userId)
      .eq("status", "accepted")
      .maybeSingle();

    if (!roster) {
      return NextResponse.json(
        { error: "You are not an accepted mentor for this competition." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const date = String(body.date || "");
    const startTime = String(body.startTime || "");
    const endTime = String(body.endTime || "");
    const slotDurationMinutes = Number(body.slotDurationMinutes);
    const timezone = String(body.timezone || "UTC");

    if (!DATE_RE.test(date)) {
      return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
    }
    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
      return NextResponse.json({ error: "start/end time must be HH:mm" }, { status: 400 });
    }
    // Bound to 15-120 to match the mentor_sessions.duration_minutes CHECK, so
    // every generated slot can actually be booked.
    if (!Number.isInteger(slotDurationMinutes) || slotDurationMinutes < 15 || slotDurationMinutes > 120) {
      return NextResponse.json({ error: "slotDurationMinutes must be 15-120" }, { status: 400 });
    }
    const startMin = toMinutes(startTime);
    const endMin = toMinutes(endTime);
    if (startMin >= endMin) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    }
    if (endMin - startMin < slotDurationMinutes) {
      return NextResponse.json({ error: "Block is shorter than one slot" }, { status: 400 });
    }
    // Validate the timezone is a real IANA zone (slot generation relies on it).
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    } catch {
      return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
    }

    // Reject overlap with an existing block on the same date.
    const { data: sameDay } = await admin
      .from("mentor_availability_blocks")
      .select("start_time, end_time")
      .eq("hackathon_id", hackathonId)
      .eq("mentor_user_id", auth.userId)
      .eq("date", date);

    const overlaps = (sameDay || []).some((b) => {
      const s = toMinutes(String(b.start_time).slice(0, 5));
      const e = toMinutes(String(b.end_time).slice(0, 5));
      return startMin < e && endMin > s;
    });
    if (overlaps) {
      return NextResponse.json(
        { error: "This time range overlaps an existing availability block." },
        { status: 409 }
      );
    }

    const { data: inserted, error } = await admin
      .from("mentor_availability_blocks")
      .insert({
        hackathon_id: hackathonId,
        mentor_user_id: auth.userId,
        date,
        start_time: startTime,
        end_time: endTime,
        slot_duration_minutes: slotDurationMinutes,
        timezone,
      })
      .select(BLOCK_SELECT)
      .single();

    if (error || !inserted) {
      return NextResponse.json({ error: "Failed to add availability" }, { status: 400 });
    }

    return NextResponse.json({
      data: dbRowToMentorAvailabilityBlock(inserted as Record<string, unknown>),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
