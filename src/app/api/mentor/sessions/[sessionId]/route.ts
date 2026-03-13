import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToMentorSession } from "@/lib/supabase/mappers";
import { z } from "zod";

const SESSION_SELECT = `
  *,
  mentor:profiles!mentor_sessions_mentor_id_fkey(*),
  mentee:profiles!mentor_sessions_mentee_id_fkey(*)
`;

const updateSessionSchema = z.object({
  status: z.enum(["confirmed", "completed", "cancelled", "no_show"]).optional(),
  cancellation_reason: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  meeting_url: z.string().url().optional(),
  mentor_feedback_rating: z.number().int().min(1).max(5).optional(),
  mentor_feedback_comment: z.string().max(1000).optional(),
  mentee_feedback_rating: z.number().int().min(1).max(5).optional(),
  mentee_feedback_comment: z.string().max(1000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Fetch the existing session
    const { data: existing } = await supabase
      .from("mentor_sessions")
      .select("id, mentor_id, mentee_id, status, title")
      .eq("id", sessionId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const isMentor = existing.mentor_id === user.id;
    const isMentee = existing.mentee_id === user.id;

    if (!isMentor && !isMentee) {
      return NextResponse.json(
        { error: "You are not a participant in this session" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = updateSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};

    // Status transitions
    if (parsed.data.status) {
      const newStatus = parsed.data.status;
      const currentStatus = existing.status;

      // Define allowed transitions per role
      if (newStatus === "confirmed") {
        if (!isMentor) {
          return NextResponse.json(
            { error: "Only the mentor can confirm a session" },
            { status: 403 }
          );
        }
        if (currentStatus !== "pending") {
          return NextResponse.json(
            { error: "Can only confirm pending sessions" },
            { status: 400 }
          );
        }
      }

      if (newStatus === "completed") {
        if (!isMentor) {
          return NextResponse.json(
            { error: "Only the mentor can mark a session as completed" },
            { status: 403 }
          );
        }
        if (currentStatus !== "confirmed") {
          return NextResponse.json(
            { error: "Can only complete confirmed sessions" },
            { status: 400 }
          );
        }
      }

      if (newStatus === "cancelled") {
        if (currentStatus === "completed" || currentStatus === "cancelled") {
          return NextResponse.json(
            { error: `Cannot cancel a ${currentStatus} session` },
            { status: 400 }
          );
        }
        updates.cancelled_by = user.id;
        if (parsed.data.cancellation_reason) {
          updates.cancellation_reason = parsed.data.cancellation_reason;
        }
      }

      if (newStatus === "no_show") {
        if (!isMentor) {
          return NextResponse.json(
            { error: "Only the mentor can mark a session as no-show" },
            { status: 403 }
          );
        }
        if (currentStatus !== "confirmed") {
          return NextResponse.json(
            { error: "Can only mark confirmed sessions as no-show" },
            { status: 400 }
          );
        }
      }

      updates.status = newStatus;
    }

    // Notes and meeting URL (both can update)
    if (parsed.data.notes !== undefined) {
      updates.notes = parsed.data.notes;
    }
    if (parsed.data.meeting_url !== undefined) {
      updates.meeting_url = parsed.data.meeting_url;
    }

    // Mentor feedback (only mentor)
    if (parsed.data.mentor_feedback_rating !== undefined || parsed.data.mentor_feedback_comment !== undefined) {
      if (!isMentor) {
        return NextResponse.json(
          { error: "Only the mentor can leave mentor feedback" },
          { status: 403 }
        );
      }
      if (existing.status !== "completed" && updates.status !== "completed") {
        return NextResponse.json(
          { error: "Can only leave feedback on completed sessions" },
          { status: 400 }
        );
      }
      if (parsed.data.mentor_feedback_rating !== undefined) {
        updates.mentor_feedback_rating = parsed.data.mentor_feedback_rating;
      }
      if (parsed.data.mentor_feedback_comment !== undefined) {
        updates.mentor_feedback_comment = parsed.data.mentor_feedback_comment;
      }
    }

    // Mentee feedback (only mentee)
    if (parsed.data.mentee_feedback_rating !== undefined || parsed.data.mentee_feedback_comment !== undefined) {
      if (!isMentee) {
        return NextResponse.json(
          { error: "Only the mentee can leave mentee feedback" },
          { status: 403 }
        );
      }
      if (existing.status !== "completed" && updates.status !== "completed") {
        return NextResponse.json(
          { error: "Can only leave feedback on completed sessions" },
          { status: 400 }
        );
      }
      if (parsed.data.mentee_feedback_rating !== undefined) {
        updates.mentee_feedback_rating = parsed.data.mentee_feedback_rating;
      }
      if (parsed.data.mentee_feedback_comment !== undefined) {
        updates.mentee_feedback_comment = parsed.data.mentee_feedback_comment;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("mentor_sessions")
      .update(updates)
      .eq("id", sessionId)
      .select(SESSION_SELECT)
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update session" },
        { status: 400 }
      );
    }

    // Send notification to the other party on status change
    if (parsed.data.status) {
      const otherUserId = isMentor ? existing.mentee_id : existing.mentor_id;
      const statusMessages: Record<string, string> = {
        confirmed: `Your mentoring session "${existing.title}" has been confirmed!`,
        completed: `Your mentoring session "${existing.title}" has been marked as completed.`,
        cancelled: `Your mentoring session "${existing.title}" has been cancelled.`,
        no_show: `Your mentoring session "${existing.title}" was marked as no-show.`,
      };

      await supabase.from("notifications").insert({
        user_id: otherUserId,
        type: "team-message" as const,
        title: `Session ${parsed.data.status}`,
        message: statusMessages[parsed.data.status] || `Session status updated to ${parsed.data.status}`,
        link: "/mentor/sessions",
      });
    }

    return NextResponse.json({
      data: dbRowToMentorSession(updated as Record<string, unknown>),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
