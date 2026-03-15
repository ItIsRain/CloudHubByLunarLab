import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getHackathonTimeline, hasPrivateEntityAccess } from "@/lib/supabase/auth-helpers";
import { canRegister, getPhaseMessage } from "@/lib/hackathon-phases";
import { fireWebhooks } from "@/lib/webhook-delivery";

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
    const { data: hackathonInfo } = await supabase
      .from("hackathons")
      .select("registration_fields")
      .eq("id", hackathonId)
      .single();

    const hasFormFields = Array.isArray(hackathonInfo?.registration_fields) &&
      hackathonInfo.registration_fields.length > 0;
    const initialStatus = hasFormFields && Object.keys(formData).length > 0
      ? "pending"
      : "confirmed";

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
        status: "confirmed",
      });
    }

    // Update participant_count on the hackathon
    const { count: participantCount } = await supabase
      .from("hackathon_registrations")
      .select("id", { count: "exact", head: true })
      .eq("hackathon_id", hackathonId)
      .in("status", ["confirmed", "approved"]);

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

    // Soft-delete: mark as cancelled (consistent with event registration pattern)
    const { error } = await supabase
      .from("hackathon_registrations")
      .update({ status: "cancelled" })
      .eq("hackathon_id", hackathonId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to cancel registration" }, { status: 400 });
    }

    // Fire webhook for the hackathon organizer
    const { data: hackCancelOrg } = await supabase
      .from("hackathons")
      .select("organizer_id, name")
      .eq("id", hackathonId)
      .single();

    if (hackCancelOrg?.organizer_id) {
      fireWebhooks(hackCancelOrg.organizer_id, "hackathon.registration.cancelled", {
        hackathonId,
        hackathonName: hackCancelOrg.name,
        userId: user.id,
      });
    }

    // Update participant_count
    const { count: participantCount } = await supabase
      .from("hackathon_registrations")
      .select("id", { count: "exact", head: true })
      .eq("hackathon_id", hackathonId)
      .in("status", ["confirmed", "approved"]);

    if (participantCount !== null) {
      await supabase
        .from("hackathons")
        .update({ participant_count: participantCount })
        .eq("id", hackathonId);
    }

    return NextResponse.json({ message: "Registration cancelled" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
