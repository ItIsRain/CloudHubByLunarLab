import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { UUID_RE } from "@/lib/constants";
import { sendApplicationAcceptedEmail } from "@/lib/resend";
import { fireWebhooks } from "@/lib/webhook-delivery";

type RouteParams = { params: Promise<{ hackathonId: string }> };

/** POST - Applicant confirms or declines RSVP */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid competition ID" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Parse and validate body
    let body: { response?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { response } = body;
    if (response !== "confirmed" && response !== "declined") {
      return NextResponse.json(
        { error: 'response must be "confirmed" or "declined"' },
        { status: 400 }
      );
    }

    // Fetch user's registration
    const { data: registration, error: regError } = await supabase
      .from("hackathon_registrations")
      .select("id, status, form_data")
      .eq("hackathon_id", hackathonId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (regError) {
      return NextResponse.json({ error: "Failed to fetch registration" }, { status: 500 });
    }

    if (!registration) {
      return NextResponse.json({ error: "No registration found" }, { status: 404 });
    }

    // Registration must be accepted or approved to RSVP
    const rsvpEligibleStatuses = ["accepted", "approved"];
    if (!rsvpEligibleStatuses.includes(registration.status)) {
      return NextResponse.json(
        { error: `Cannot RSVP with registration status "${registration.status}". Must be accepted or approved.` },
        { status: 403 }
      );
    }

    // Check RSVP deadline
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("rsvp_deadline, organizer_id, name, screening_config")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }

    if (hackathon.rsvp_deadline) {
      const deadline = new Date(hackathon.rsvp_deadline);
      if (new Date() > deadline) {
        return NextResponse.json(
          { error: "RSVP deadline has passed" },
          { status: 403 }
        );
      }
    }

    // Build update payload
    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      rsvp_status: response,
      rsvp_responded_at: now,
    };

    // If declining, also mark registration status as "declined"
    if (response === "declined") {
      updatePayload.status = "declined";
    }

    const { error: updateError } = await supabase
      .from("hackathon_registrations")
      .update(updatePayload)
      .eq("id", registration.id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update RSVP" }, { status: 400 });
    }

    // If declined, trigger waitlist backfill (same pattern as DELETE in register/route.ts)
    if (response === "declined" && hackathon) {
      const screeningConfig = (hackathon.screening_config as Record<string, unknown>) || {};
      const quotaEnforcement = (screeningConfig.quotaEnforcement as string) || "screening";

      if (quotaEnforcement === "registration") {
        const adminClient = getSupabaseAdminClient();
        const quotaFieldId = screeningConfig.quotaFieldId as string | undefined;
        const leavingFormData = (registration.form_data as Record<string, unknown>) || {};
        const leavingCampus = quotaFieldId ? String(leavingFormData[quotaFieldId] || "") : "";

        // Find waitlisted registrations, ordered FCFS by created_at
        const { data: waitlisted } = await adminClient
          .from("hackathon_registrations")
          .select("id, user_id, form_data, created_at")
          .eq("hackathon_id", hackathonId)
          .eq("status", "waitlisted")
          .order("created_at", { ascending: true });

        if (waitlisted && waitlisted.length > 0) {
          // Find next person from same campus (or first overall if no quota field)
          const nextInLine = leavingCampus && quotaFieldId
            ? waitlisted.find((w) => {
                const wForm = (w.form_data as Record<string, unknown>) || {};
                return String(wForm[quotaFieldId] || "") === leavingCampus;
              })
            : waitlisted[0];

          if (nextInLine) {
            // Promote to accepted via admin client (bypasses RLS)
            const { error: promoteError } = await adminClient
              .from("hackathon_registrations")
              .update({ status: "accepted" })
              .eq("id", nextInLine.id);

            if (!promoteError) {
              // Fetch promoted user's profile for email
              const { data: profile } = await adminClient
                .from("profiles")
                .select("email, full_name, display_name")
                .eq("id", nextInLine.user_id)
                .single();

              if (profile?.email) {
                const displayName = profile.display_name || profile.full_name || "Participant";

                // Send acceptance email (fire-and-forget)
                sendApplicationAcceptedEmail({
                  to: profile.email,
                  applicantName: displayName,
                  hackathonName: hackathon.name,
                  hackathonId,
                }).catch(() => { /* non-critical */ });

                // Create in-app notification for the promoted user
                adminClient.from("notifications").insert({
                  user_id: nextInLine.user_id,
                  type: "hackathon-update",
                  title: `You've been accepted to ${hackathon.name}!`,
                  message: "A spot opened up and you've been moved from the waitlist. You're now an accepted participant!",
                  link: `/hackathons/${hackathonId}`,
                }).then(() => {}, () => {});

                // Fire webhook for the waitlist promotion
                fireWebhooks(hackathon.organizer_id as string, "hackathon.participant.status_changed", {
                  hackathonId,
                  hackathonName: hackathon.name,
                  registrationId: nextInLine.id,
                  userId: nextInLine.user_id,
                  previousStatus: "waitlisted",
                  newStatus: "accepted",
                  source: "rsvp_decline_backfill",
                });
              }
            }
          }
        }
      }

      // Update participant_count after decline
      const { count: participantCount } = await supabase
        .from("hackathon_registrations")
        .select("id", { count: "exact", head: true })
        .eq("hackathon_id", hackathonId)
        .in("status", ["confirmed", "approved", "accepted"]);

      if (participantCount !== null) {
        await supabase
          .from("hackathons")
          .update({ participant_count: participantCount })
          .eq("id", hackathonId);
      }
    }

    return NextResponse.json({ data: { rsvpStatus: response } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** GET - Get RSVP stats (organizer only) */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid competition ID" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify user is the organizer
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id, rsvp_deadline")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }

    if (hackathon.organizer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch accepted/approved registrations with their rsvp_status
    const { data: registrations, error: regError } = await supabase
      .from("hackathon_registrations")
      .select("rsvp_status")
      .eq("hackathon_id", hackathonId)
      .in("status", ["accepted", "approved"]);

    if (regError) {
      return NextResponse.json({ error: "Failed to fetch RSVP stats" }, { status: 500 });
    }

    const stats = { confirmed: 0, pending: 0, declined: 0, total: 0 };

    for (const reg of registrations || []) {
      stats.total++;
      const rsvpStatus = reg.rsvp_status as string | null;
      if (rsvpStatus === "confirmed") {
        stats.confirmed++;
      } else if (rsvpStatus === "declined") {
        stats.declined++;
      } else {
        // null or "pending" both count as pending
        stats.pending++;
      }
    }

    return NextResponse.json({
      data: {
        ...stats,
        deadline: hackathon.rsvp_deadline || null,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
