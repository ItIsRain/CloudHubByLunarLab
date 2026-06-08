import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { dbRowToMentorSession } from "@/lib/supabase/mappers";
import {
  sendMentorBookingApprovedEmail,
  buildMentorBookingApprovedEmail,
  sendMentorBookingDeclinedEmail,
  sendEmailBatch,
} from "@/lib/resend";
import { UUID_RE } from "@/lib/constants";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const SESSION_SELECT =
  "*, mentor:profiles!mentor_sessions_mentor_id_fkey(*), mentee:profiles!mentor_sessions_mentee_id_fkey(*), team:teams!mentor_sessions_team_id_fkey(id, name, avatar), block:mentor_availability_blocks!mentor_sessions_availability_block_id_fkey(timezone)";

/**
 * Allowed status transitions. The mentor drives the lifecycle; the mentee may
 * only cancel a not-yet-finished session. Terminal states (completed/cancelled/
 * no_show) are immutable — this prevents re-confirming a cancelled session
 * (which would re-send emails and resurrect the slot) or completing a session
 * that was never confirmed.
 */
function canTransition(from: string, to: string, isMentor: boolean): boolean {
  if (isMentor) {
    switch (to) {
      case "confirmed":
        return from === "pending";
      case "completed":
      case "no_show":
        return from === "confirmed";
      case "cancelled":
        return from === "pending" || from === "confirmed";
      default:
        return false;
    }
  }
  // mentee
  return to === "cancelled" && (from === "pending" || from === "confirmed");
}

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
 * PATCH — update a booking. The mentor approves ('confirmed'), declines/cancels
 * ('cancelled'), completes it, and sets a per-session meeting link/phone/notes.
 * The participant may cancel their own booking. Approval/decline emails the
 * participant (link/phone fall back to the mentor's defaults).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string; sessionId: string }> }
) {
  try {
    const { hackathonId, sessionId } = await params;
    if (!UUID_RE.test(hackathonId) || !UUID_RE.test(sessionId)) {
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

    const admin = getSupabaseAdminClient();

    const { data: session } = await admin
      .from("mentor_sessions")
      .select("id, mentor_id, mentee_id, hackathon_id, status, session_date, meeting_url, meeting_phone")
      .eq("id", sessionId)
      .eq("hackathon_id", hackathonId)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const isMentor = session.mentor_id === auth.userId;
    const isMentee = session.mentee_id === auth.userId;
    if (!isMentor && !isMentee) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const update: Record<string, unknown> = {};

    if (body.status !== undefined) {
      const target = String(body.status);
      if (!canTransition(session.status as string, target, isMentor)) {
        return NextResponse.json(
          { error: `Cannot change a ${session.status} booking to ${target}.` },
          { status: 400 }
        );
      }
      update.status = target;
      if (target === "cancelled") {
        update.cancelled_by = auth.userId;
        if (body.cancellationReason) {
          update.cancellation_reason = String(body.cancellationReason).slice(0, 500);
        }
      }
    }

    // Only the mentor can set meeting details / notes.
    if (isMentor) {
      if (body.meetingUrl !== undefined) {
        update.meeting_url = body.meetingUrl ? String(body.meetingUrl).slice(0, 500) : null;
      }
      if (body.meetingPhone !== undefined) {
        update.meeting_phone = body.meetingPhone ? String(body.meetingPhone).slice(0, 50) : null;
      }
      if (body.notes !== undefined) {
        update.notes = body.notes ? String(body.notes).slice(0, 2000) : null;
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data: updated, error } = await admin
      .from("mentor_sessions")
      .update(update)
      .eq("id", sessionId)
      .eq("hackathon_id", hackathonId)
      // Atomic guard: only apply if the status hasn't changed since we read it
      // (prevents lost updates / duplicate side effects under concurrency).
      .eq("status", session.status as string)
      .select(SESSION_SELECT)
      .single();

    if (error || !updated) {
      return NextResponse.json(
        { error: "This booking was just updated. Please refresh and try again." },
        { status: 409 }
      );
    }

    const mapped = dbRowToMentorSession(updated as Record<string, unknown>);
    const newStatus = update.status as string | undefined;

    // Side effects on status change (best effort).
    if (newStatus && (newStatus === "confirmed" || newStatus === "cancelled")) {
      const blockJoin = Array.isArray(updated.block) ? updated.block[0] : updated.block;
      const blockTz = (blockJoin as { timezone?: string } | null)?.timezone || "UTC";
      const slotLabel = formatSlot(mapped.sessionDate, blockTz);

      // Fetch REAL emails/names from profiles — the embedded session profiles
      // are mapped via profileToPublicUser, which strips email.
      const [{ data: hk }, { data: parties }] = await Promise.all([
        admin.from("hackathons").select("name").eq("id", hackathonId).single(),
        admin.from("profiles").select("id, name, email").in("id", [session.mentor_id, session.mentee_id]),
      ]);
      const hackathonName = (hk?.name as string) || "the competition";
      const menteeRow = (parties || []).find((p) => p.id === session.mentee_id);
      const mentorRow = (parties || []).find((p) => p.id === session.mentor_id);
      const menteeEmail = menteeRow?.email as string | undefined;
      const menteeName = (menteeRow?.name as string) || "Participant";
      const mentorName = (mentorRow?.name as string) || "Your mentor";

      if (newStatus === "confirmed" && isMentor) {
        // Effective link/phone: per-session value or the mentor's default.
        const { data: rosterDefaults } = await admin
          .from("hackathon_mentors")
          .select("default_meeting_url, default_meeting_phone")
          .eq("hackathon_id", hackathonId)
          .eq("user_id", session.mentor_id)
          .maybeSingle();
        const meetingUrl =
          mapped.meetingUrl || (rosterDefaults?.default_meeting_url as string) || undefined;
        const meetingPhone =
          mapped.meetingPhone || (rosterDefaults?.default_meeting_phone as string) || undefined;

        const base = {
          mentorName,
          hackathonName,
          slotLabel,
          meetingUrl,
          meetingPhone,
          sessionUrl: `${SITE_URL}/hackathons/${hackathonId}/mentors`,
        };
        const teamId = mapped.teamId;
        const teamName = mapped.team?.name;

        if (teamId) {
          // Team booking → notify EVERY team member with the meeting details.
          const { data: members } = await admin
            .from("team_members")
            .select("user_id, user:profiles!team_members_user_id_fkey(name, email)")
            .eq("team_id", teamId);

          const recipients = (members || [])
            .map((m) => {
              const prof = (Array.isArray(m.user) ? m.user[0] : m.user) as
                | { name?: string; email?: string }
                | null;
              return prof?.email
                ? { userId: m.user_id as string, name: prof.name || "Participant", email: prof.email }
                : null;
            })
            .filter((r): r is { userId: string; name: string; email: string } => r !== null);

          if (recipients.length > 0) {
            const emails = recipients.map((r) =>
              buildMentorBookingApprovedEmail({
                ...base,
                participantName: r.name,
                teamName: teamName || undefined,
                bookedByName: menteeName,
              })
            );
            sendEmailBatch(
              recipients.map((r, i) => ({ to: r.email, subject: emails[i].subject, html: emails[i].html }))
            ).catch((e) => console.error("[mentor-booking] team approve emails failed:", e));

            admin
              .from("notifications")
              .insert(
                recipients.map((r) => ({
                  user_id: r.userId,
                  type: "team-message",
                  title: "Mentoring session confirmed",
                  message: `${mentorName} confirmed your team's session (${slotLabel}).`,
                  link: `/hackathons/${hackathonId}/mentors`,
                }))
              )
              .then(() => {}, () => {});
          } else if (menteeEmail) {
            // No member emails resolved — fall back to the booker.
            sendMentorBookingApprovedEmail({ to: menteeEmail, participantName: menteeName, ...base }).catch(
              (e) => console.error("[mentor-booking] approve email failed:", e)
            );
          }
        } else if (menteeEmail) {
          // Solo booking (no team) → just the booker.
          sendMentorBookingApprovedEmail({ to: menteeEmail, participantName: menteeName, ...base }).catch(
            (e) => console.error("[mentor-booking] approve email failed:", e)
          );
          admin
            .from("notifications")
            .insert({
              user_id: session.mentee_id,
              type: "team-message",
              title: "Mentoring session confirmed",
              message: `${mentorName} confirmed your session (${slotLabel}).`,
              link: `/hackathons/${hackathonId}/mentors`,
            })
            .then(() => {}, () => {});
        }
      }

      if (newStatus === "cancelled" && isMentor && menteeEmail) {
        sendMentorBookingDeclinedEmail({
          to: menteeEmail,
          participantName: menteeName,
          mentorName,
          hackathonName,
          slotLabel,
          reason: update.cancellation_reason as string | undefined,
          browseUrl: `${SITE_URL}/hackathons/${hackathonId}/mentors`,
        }).catch((e) => console.error("[mentor-booking] decline email failed:", e));

        admin
          .from("notifications")
          .insert({
            user_id: session.mentee_id,
            type: "hackathon-update",
            title: "Mentoring request declined",
            message: `Your session request (${slotLabel}) could not be confirmed.`,
            link: `/hackathons/${hackathonId}/mentors`,
          })
          .then(() => {}, () => {});
      }
    }

    return NextResponse.json({ data: mapped });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
