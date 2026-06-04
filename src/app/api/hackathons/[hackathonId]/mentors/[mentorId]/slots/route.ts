import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbRowToMentorAvailabilityBlock } from "@/lib/supabase/mappers";
import { generateOpenSlots } from "@/lib/mentor-slots";
import { UUID_RE } from "@/lib/constants";

/**
 * GET — open (bookable) slots for an accepted mentor: every availability slot
 * minus those already held by a pending/confirmed session and minus past slots.
 * `mentorId` is the roster id (public). Read-only; no auth required.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string; mentorId: string }> }
) {
  try {
    const { hackathonId, mentorId } = await params;
    if (!UUID_RE.test(hackathonId) || !UUID_RE.test(mentorId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();

    const { data: roster } = await admin
      .from("hackathon_mentors")
      .select("user_id, status")
      .eq("id", mentorId)
      .eq("hackathon_id", hackathonId)
      .maybeSingle();

    if (!roster || roster.status !== "accepted" || !roster.user_id) {
      return NextResponse.json({ data: [] });
    }
    const mentorUserId = roster.user_id as string;

    const [{ data: blockRows }, { data: heldRows }] = await Promise.all([
      admin
        .from("mentor_availability_blocks")
        .select("id, hackathon_id, mentor_user_id, date, start_time, end_time, slot_duration_minutes, timezone, created_at")
        .eq("hackathon_id", hackathonId)
        .eq("mentor_user_id", mentorUserId),
      admin
        .from("mentor_sessions")
        .select("session_date")
        .eq("hackathon_id", hackathonId)
        .eq("mentor_id", mentorUserId)
        .in("status", ["pending", "confirmed"]),
    ]);

    const blocks = (blockRows || []).map((r) =>
      dbRowToMentorAvailabilityBlock(r as Record<string, unknown>)
    );
    const heldIsos = (heldRows || []).map((s) => s.session_date as string);

    const slots = generateOpenSlots(blocks, heldIsos, new Date());

    return NextResponse.json({ data: slots });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
