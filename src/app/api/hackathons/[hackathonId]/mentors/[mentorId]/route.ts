import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";

/**
 * Resolve the roster row and the caller's relationship to it.
 */
async function loadContext(hackathonId: string, mentorId: string, userId: string) {
  const admin = getSupabaseAdminClient();
  const [{ data: mentor }, { data: hackathon }] = await Promise.all([
    admin
      .from("hackathon_mentors")
      .select("id, hackathon_id, user_id, status")
      .eq("id", mentorId)
      .eq("hackathon_id", hackathonId)
      .maybeSingle(),
    admin.from("hackathons").select("organizer_id, name").eq("id", hackathonId).single(),
  ]);
  return {
    admin,
    mentor,
    hackathon,
    isOrganizer: hackathon?.organizer_id === userId,
    isSelf: !!mentor?.user_id && mentor.user_id === userId,
  };
}

/**
 * PATCH — update a roster row.
 *  - Organizer: name / expertise / bio.
 *  - Mentor (self): expertise / bio / default meeting link + phone.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string; mentorId: string }> }
) {
  try {
    const { hackathonId, mentorId } = await params;
    if (!UUID_RE.test(hackathonId) || !UUID_RE.test(mentorId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) return NextResponse.json({ error: scopeError }, { status: 403 });
    }

    const { admin, mentor, isOrganizer, isSelf } = await loadContext(
      hackathonId,
      mentorId,
      auth.userId
    );
    if (!mentor) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
    }
    if (!isOrganizer && !isSelf) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const update: Record<string, unknown> = {};

    if (body.expertise !== undefined) {
      if (!Array.isArray(body.expertise)) {
        return NextResponse.json({ error: "expertise must be an array" }, { status: 400 });
      }
      update.expertise = body.expertise.map((e: unknown) => String(e).trim()).filter(Boolean).slice(0, 20);
    }
    if (body.bio !== undefined) {
      update.bio = body.bio ? String(body.bio).slice(0, 2000) : null;
    }
    if (isOrganizer && body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name || name.length > 200) {
        return NextResponse.json({ error: "name must be 1-200 characters" }, { status: 400 });
      }
      update.name = name;
    }
    // Default meeting link/phone are the mentor's personal contact details —
    // only the mentor themselves may set them (not the organizer).
    if (isSelf) {
      if (body.defaultMeetingUrl !== undefined) {
        update.default_meeting_url = body.defaultMeetingUrl
          ? String(body.defaultMeetingUrl).slice(0, 500)
          : null;
      }
      if (body.defaultMeetingPhone !== undefined) {
        update.default_meeting_phone = body.defaultMeetingPhone
          ? String(body.defaultMeetingPhone).slice(0, 50)
          : null;
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { error } = await admin
      .from("hackathon_mentors")
      .update(update)
      .eq("id", mentorId)
      .eq("hackathon_id", hackathonId);

    if (error) {
      return NextResponse.json({ error: "Failed to update mentor" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE — organizer removes a mentor. Cancels their open (pending/confirmed)
 * sessions for this hackathon and notifies the participants, then deletes the row.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string; mentorId: string }> }
) {
  try {
    const { hackathonId, mentorId } = await params;
    if (!UUID_RE.test(hackathonId) || !UUID_RE.test(mentorId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) return NextResponse.json({ error: scopeError }, { status: 403 });
    }

    const { admin, mentor, hackathon, isOrganizer } = await loadContext(
      hackathonId,
      mentorId,
      auth.userId
    );
    if (!mentor) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
    }
    if (!isOrganizer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Cancel the mentor's open sessions for this hackathon and notify participants.
    if (mentor.user_id) {
      const { data: openSessions } = await admin
        .from("mentor_sessions")
        .select("id, mentee_id")
        .eq("hackathon_id", hackathonId)
        .eq("mentor_id", mentor.user_id)
        .in("status", ["pending", "confirmed"]);

      if (openSessions && openSessions.length > 0) {
        await admin
          .from("mentor_sessions")
          .update({ status: "cancelled", cancelled_by: auth.userId, cancellation_reason: "Mentor removed from the competition." })
          .in("id", openSessions.map((s) => s.id));

        const notifications = openSessions.map((s) => ({
          user_id: s.mentee_id,
          type: "hackathon-update",
          title: "Mentoring session cancelled",
          message: `Your mentoring session for ${hackathon?.name ?? "the competition"} was cancelled because the mentor is no longer available.`,
          link: `/hackathons/${hackathonId}/mentors`,
        }));
        admin.from("notifications").insert(notifications).then(() => {}, () => {});
      }
    }

    const { error } = await admin
      .from("hackathon_mentors")
      .delete()
      .eq("id", mentorId)
      .eq("hackathon_id", hackathonId);

    if (error) {
      return NextResponse.json({ error: "Failed to remove mentor" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
