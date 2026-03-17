import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getHackathonTimeline, hasPrivateEntityAccess } from "@/lib/supabase/auth-helpers";
import { canRegister, getPhaseMessage } from "@/lib/hackathon-phases";
import { fireWebhooks } from "@/lib/webhook-delivery";
import { sendApplicationAcceptedEmail } from "@/lib/resend";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ registered: false });
    }

    const { data, error } = await supabase
      .from("hackathon_registrations")
      .select("id, status, created_at")
      .eq("hackathon_id", hackathonId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ registered: false });
    }

    const rejectedStatuses = ["rejected", "ineligible", "declined"];
    const activeStatuses = ["confirmed", "approved", "pending", "under_review", "eligible", "accepted", "waitlisted"];

    return NextResponse.json({
      registered: !!data && activeStatuses.includes(data.status),
      rejected: !!data && rejectedStatuses.includes(data.status),
      registration: data,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Parse optional form_data from request body
    let formData: Record<string, unknown> = {};
    try {
      const body = await request.json();
      if (body && typeof body.formData === "object" && body.formData !== null) {
        formData = body.formData as Record<string, unknown>;
      }
    } catch {
      // No body or invalid JSON — that's fine, form_data is optional
    }

    // Check visibility — private hackathons require an invitation
    const canAccess = await hasPrivateEntityAccess(supabase, "hackathon", hackathonId, user.id, user.email ?? undefined);
    if (!canAccess) {
      return NextResponse.json(
        { error: "This is a private hackathon. You need an invitation to register." },
        { status: 403 }
      );
    }

    // Verify registration window is open
    const timeline = await getHackathonTimeline(supabase, hackathonId);
    if (timeline && !canRegister(timeline)) {
      return NextResponse.json(
        { error: getPhaseMessage(timeline, "register") },
        { status: 403 }
      );
    }

    // Check if a registration already exists (e.g. previously cancelled)
    const { data: existing, error: existingError } = await supabase
      .from("hackathon_registrations")
      .select("id, status")
      .eq("hackathon_id", hackathonId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: "Failed to check registration status" }, { status: 500 });
    }

    // Determine initial status: if hackathon has registration fields (application form),
    // new registrations start as "pending" for organizer review. Otherwise auto-confirm.
    // If the applicant selected a quota option that is already full, auto-waitlist them.
    const { data: hackathonInfo } = await supabase
      .from("hackathons")
      .select("registration_fields, screening_config")
      .eq("id", hackathonId)
      .single();

    if (!hackathonInfo) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    const hasFormFields = Array.isArray(hackathonInfo.registration_fields) &&
      hackathonInfo.registration_fields.length > 0;
    let initialStatus = hasFormFields && Object.keys(formData).length > 0
      ? "pending"
      : "confirmed";

    // Check if applicant selected a full quota option → auto-waitlist
    // ONLY enforce quotas at registration time when mode is "registration".
    // In "screening" mode, everyone registers as "pending" and screening decides.
    const screeningConfig = (hackathonInfo?.screening_config as Record<string, unknown>) || {};
    const quotaEnforcement = (screeningConfig.quotaEnforcement as string) || "screening";
    const quotaFieldId = screeningConfig.quotaFieldId as string | undefined;
    const quotaEntries = (screeningConfig.quotas as { campus: string; quota: number; rejected?: boolean }[]) || [];

    if (quotaEnforcement === "registration" && quotaFieldId && Object.keys(formData).length > 0) {
      const selectedValue = String(formData[quotaFieldId] || "");
      if (selectedValue) {
        const quotaEntry = quotaEntries.find((q) => q.campus === selectedValue);
        if (quotaEntry && !quotaEntry.rejected) {
          // Count current fills for this option (exclude cancelled/rejected/ineligible/declined/withdrawn)
          const { data: existingRegs } = await supabase
            .from("hackathon_registrations")
            .select("form_data")
            .eq("hackathon_id", hackathonId)
            .not("status", "in", '("cancelled","rejected","ineligible","declined","withdrawn")');

          let fillCount = 0;
          if (existingRegs) {
            for (const reg of existingRegs) {
              const regForm = reg.form_data as Record<string, unknown> | null;
              if (regForm && String(regForm[quotaFieldId] || "") === selectedValue) {
                fillCount++;
              }
            }
          }

          if (fillCount >= quotaEntry.quota) {
            initialStatus = "waitlisted";
          }
        }
      }
    }

    let data;
    let error;

    if (existing) {
      // Block re-registration for rejected/ineligible applicants
      if (existing.status === "rejected" || existing.status === "ineligible") {
        return NextResponse.json(
          { error: "Your application has been rejected. You cannot re-register for this hackathon." },
          { status: 403 }
        );
      }
      if (existing.status !== "cancelled") {
        return NextResponse.json(
          { error: "Already registered for this hackathon" },
          { status: 409 }
        );
      }
      // Re-register from cancelled status only
      ({ data, error } = await supabase
        .from("hackathon_registrations")
        .update({ status: initialStatus, form_data: formData })
        .eq("id", existing.id)
        .select("id, status, created_at, form_data")
        .single());
    } else {
      ({ data, error } = await supabase
        .from("hackathon_registrations")
        .insert({
          hackathon_id: hackathonId,
          user_id: user.id,
          status: initialStatus,
          form_data: formData,
        })
        .select("id, status, created_at, form_data")
        .single());
    }

    if (error) {
      return NextResponse.json({ error: "Failed to register" }, { status: 400 });
    }

    // Fire webhook for the hackathon organizer
    const { data: hackOrg } = await supabase
      .from("hackathons")
      .select("organizer_id, name")
      .eq("id", hackathonId)
      .single();

    if (hackOrg?.organizer_id) {
      fireWebhooks(hackOrg.organizer_id, "hackathon.registration.created", {
        hackathonId,
        hackathonName: hackOrg.name,
        registrationId: data?.id,
        userId: user.id,
        status: data?.status || initialStatus,
      });
    }

    // Update participant_count on the hackathon
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

    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Fetch current registration to check status before cancelling
    const { data: currentReg } = await supabase
      .from("hackathon_registrations")
      .select("id, status, form_data")
      .eq("hackathon_id", hackathonId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!currentReg) {
      return NextResponse.json({ error: "No registration found" }, { status: 404 });
    }

    if (currentReg.status === "cancelled") {
      return NextResponse.json({ error: "Registration already cancelled" }, { status: 409 });
    }

    // Block cancellation from terminal rejection statuses — prevents
    // rejected→cancelled→re-register bypass of the rejection decision.
    const nonCancellableStatuses = ["rejected", "ineligible", "declined"];
    if (nonCancellableStatuses.includes(currentReg.status)) {
      return NextResponse.json(
        { error: `Cannot cancel a registration with status "${currentReg.status}"` },
        { status: 400 }
      );
    }

    const wasAccepted = currentReg.status === "accepted" || currentReg.status === "approved" || currentReg.status === "confirmed";

    // Soft-delete: mark as cancelled
    const { error } = await supabase
      .from("hackathon_registrations")
      .update({ status: "cancelled" })
      .eq("id", currentReg.id);

    if (error) {
      return NextResponse.json({ error: "Failed to cancel registration" }, { status: 400 });
    }

    // Fetch hackathon info for webhooks, name, and screening config
    const { data: hackInfo } = await supabase
      .from("hackathons")
      .select("organizer_id, name, screening_config")
      .eq("id", hackathonId)
      .single();

    if (hackInfo?.organizer_id) {
      fireWebhooks(hackInfo.organizer_id, "hackathon.registration.cancelled", {
        hackathonId,
        hackathonName: hackInfo.name,
        userId: user.id,
      });
    }

    // Automatic waitlist backfill: if the departing user was accepted,
    // promote the next waitlisted person from the same campus (FCFS by created_at).
    // Only auto-promote in "registration" enforcement mode; in "screening" mode
    // the slot stays open for the next screening run to handle.
    let promotedUser: { id: string; email: string; name: string } | null = null;
    const cancelScreeningConfig = (hackInfo?.screening_config as Record<string, unknown>) || {};
    const cancelQuotaEnforcement = (cancelScreeningConfig.quotaEnforcement as string) || "screening";

    if (wasAccepted && hackInfo && cancelQuotaEnforcement === "registration") {
      // Use admin client for backfill: the server client's RLS policies prevent
      // User A from updating User B's registration row. The admin client bypasses
      // both RLS and the restrict_registration_self_update trigger.
      const adminClient = getSupabaseAdminClient();
      const screeningConfig = (hackInfo.screening_config as Record<string, unknown>) || {};
      const quotaFieldId = screeningConfig.quotaFieldId as string | undefined;
      const leavingFormData = (currentReg.form_data as Record<string, unknown>) || {};
      const leavingCampus = quotaFieldId ? String(leavingFormData[quotaFieldId] || "") : "";

      // Find waitlisted registrations for this hackathon, ordered by created_at (FCFS)
      const { data: waitlisted } = await adminClient
        .from("hackathon_registrations")
        .select("id, user_id, form_data, created_at")
        .eq("hackathon_id", hackathonId)
        .eq("status", "waitlisted")
        .order("created_at", { ascending: true });

      if (waitlisted && waitlisted.length > 0) {
        // Find the first waitlisted person from the same campus (or first overall if no quota field)
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
              promotedUser = { id: nextInLine.user_id, email: profile.email, name: displayName };

              // Send acceptance email (fire-and-forget)
              sendApplicationAcceptedEmail({
                to: profile.email,
                applicantName: displayName,
                hackathonName: hackInfo.name,
                hackathonId,
              }).catch(() => { /* non-critical */ });

              // Create in-app notification for the promoted user
              adminClient.from("notifications").insert({
                user_id: nextInLine.user_id,
                type: "hackathon-update",
                title: `You've been accepted to ${hackInfo.name}!`,
                message: "A spot opened up and you've been moved from the waitlist. You're now an accepted participant!",
                link: `/hackathons/${hackathonId}`,
              }).then(() => {}, () => {});

              // Fire webhook for the waitlist promotion
              fireWebhooks(hackInfo.organizer_id as string, "hackathon.participant.status_changed", {
                hackathonId,
                hackathonName: hackInfo.name,
                registrationId: nextInLine.id,
                userId: nextInLine.user_id,
                previousStatus: "waitlisted",
                newStatus: "accepted",
                source: "waitlist_backfill",
              });
            }
          }
        }
      }
    }

    // Update participant_count (include accepted status)
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

    return NextResponse.json({
      message: "Registration cancelled",
      backfill: promotedUser ? { userId: promotedUser.id, name: promotedUser.name } : null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
