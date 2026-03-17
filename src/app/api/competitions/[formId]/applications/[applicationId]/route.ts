import { type NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbRowToApplication } from "@/lib/supabase/mappers";
import { writeAuditLog } from "@/lib/audit";
import {
  sendApplicationAcceptedEmail,
  sendApplicationRejectedEmail,
  sendApplicationWaitlistedEmail,
  sendApplicationUnderReviewEmail,
  sendApplicationEligibleEmail,
  sendApplicationIneligibleEmail,
} from "@/lib/resend";

interface Params {
  params: Promise<{ formId: string; applicationId: string }>;
}

// ── GET — single application detail ─────────────────────
export async function GET(request: NextRequest, { params }: Params) {
  const { formId, applicationId } = await params;
  const auth = await authenticateRequest(request);
  if (auth.type === "unauthenticated") {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from("competition_applications")
    .select("*, application_files(*), screening_results(*, screening_rules:rule_id(*)), screening_flags(*)")
    .eq("id", applicationId)
    .eq("form_id", formId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  // Check access: applicant or organizer/admin
  const { data: form } = await admin
    .from("competition_forms")
    .select("organizer_id")
    .eq("id", formId)
    .single();

  const isOwner = data.applicant_id === auth.userId;
  const isOrganizer = form?.organizer_id === auth.userId;
  let isAdmin = false;

  if (!isOwner && !isOrganizer) {
    const { data: profile } = await admin
      .from("profiles")
      .select("roles")
      .eq("id", auth.userId)
      .single();
    isAdmin = ((profile?.roles as string[]) || []).includes("admin");
  }

  if (!isOwner && !isOrganizer && !isAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Strip internal notes for applicants
  const row = data as Record<string, unknown>;
  if (isOwner && !isOrganizer && !isAdmin) {
    row.internal_notes = null;
    row.screening_results = [];
    row.screening_flags = [];
  }

  return NextResponse.json({ data: dbRowToApplication(row) });
}

// ── PATCH — update application ──────────────────────────
export async function PATCH(request: NextRequest, { params }: Params) {
  const { formId, applicationId } = await params;
  const auth = await authenticateRequest(request);
  if (auth.type === "unauthenticated") {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();

  const { data: existing } = await admin
    .from("competition_applications")
    .select("*, form:competition_forms!form_id(organizer_id, allow_edit_after_submit, fields, name)")
    .eq("id", applicationId)
    .eq("form_id", formId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const form = existing.form as Record<string, unknown>;
  const isOwner = existing.applicant_id === auth.userId;
  const isOrganizer = form?.organizer_id === auth.userId;
  let isAdmin = false;

  if (!isOwner && !isOrganizer) {
    const { data: profile } = await admin
      .from("profiles")
      .select("roles")
      .eq("id", auth.userId)
      .single();
    isAdmin = ((profile?.roles as string[]) || []).includes("admin");
  }

  if (!isOwner && !isOrganizer && !isAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  if (isOwner && !isOrganizer && !isAdmin) {
    // Applicant can only update draft/submitted applications
    if (existing.status === "draft") {
      // Can update anything
      if (body.data !== undefined) updateData.data = body.data;
      if (body.applicantName !== undefined) updateData.applicant_name = body.applicantName;
      if (body.applicantEmail !== undefined) updateData.applicant_email = body.applicantEmail;
      if (body.applicantPhone !== undefined) updateData.applicant_phone = body.applicantPhone;
      if (body.startupName !== undefined) updateData.startup_name = body.startupName;
      if (body.campus !== undefined) updateData.campus = body.campus;
      if (body.sector !== undefined) updateData.sector = body.sector;

      // Submit draft — validate required fields before allowing submission
      if (body.status === "submitted") {
        const formFields = ((form as Record<string, unknown>).fields as { id: string; label: string; required?: boolean; type?: string }[]) || [];
        const appData = (body.data ?? existing.data ?? {}) as Record<string, unknown>;
        const missingFields: string[] = [];
        for (const field of formFields) {
          if (!field.required) continue;
          if (field.type === "heading" || field.type === "paragraph") continue;
          const value = appData[field.id];
          const isEmpty = value === null || value === undefined ||
            (typeof value === "string" && value.trim() === "") ||
            (Array.isArray(value) && value.length === 0);
          if (isEmpty) {
            missingFields.push(field.label || field.id);
          }
        }
        if (missingFields.length > 0) {
          return NextResponse.json(
            { error: `Required fields are missing: ${missingFields.join(", ")}` },
            { status: 400 }
          );
        }
        updateData.status = "submitted";
        updateData.submitted_at = new Date().toISOString();
      }
    } else if (existing.status === "submitted" && form.allow_edit_after_submit) {
      if (body.data !== undefined) updateData.data = body.data;
    } else if (existing.status === "accepted" && body.status === "confirmed") {
      updateData.status = "confirmed";
    } else if (existing.status === "accepted" && body.status === "declined") {
      updateData.status = "declined";
    } else if (body.status === "withdrawn") {
      updateData.status = "withdrawn";
    } else {
      return NextResponse.json({ error: "Cannot modify application in current status" }, { status: 400 });
    }
  } else {
    // Organizer/admin can update status and notes
    const validStatuses = [
      "under_review", "eligible", "ineligible",
      "accepted", "waitlisted", "rejected",
    ];
    if (body.status !== undefined) {
      if (!validStatuses.includes(body.status as string)) {
        return NextResponse.json({ error: `Invalid status. Valid: ${validStatuses.join(", ")}` }, { status: 400 });
      }
      updateData.status = body.status;
      updateData.reviewed_by = auth.userId;
      updateData.reviewed_at = new Date().toISOString();
    }
    if (body.internalNotes !== undefined) updateData.internal_notes = body.internalNotes;
    if (body.screeningNotes !== undefined) updateData.screening_notes = body.screeningNotes;
    if (body.eligibilityPassed !== undefined) {
      updateData.eligibility_passed = body.eligibilityPassed;
      updateData.screening_completed_at = new Date().toISOString();
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("competition_applications")
    .update(updateData)
    .eq("id", applicationId)
    .select("*, application_files(*), screening_results(*, screening_rules:rule_id(*)), screening_flags(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  void writeAuditLog({
    actorId: auth.userId,
    action: "update",
    entityType: "competition_application",
    entityId: applicationId,
    oldValues: { status: existing.status },
    newValues: updateData,
  });

  // Send email/notification when status changes (organizer or system action)
  const newStatus = updateData.status as string | undefined;
  if (newStatus && newStatus !== existing.status) {
    const applicantEmail = (existing.applicant_email || (data as Record<string, unknown>).applicant_email) as string | null;
    const applicantName = ((existing.applicant_name || (data as Record<string, unknown>).applicant_name) as string) || "Applicant";
    const formName = ((form as Record<string, unknown>).name as string) || "the competition";

    if (applicantEmail) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const emailParams = { to: applicantEmail, applicantName, hackathonName: formName, hackathonId: formId, linkUrl: `${siteUrl}/apply/${formId}` };
      const emailSenders: Record<string, () => Promise<unknown>> = {
        accepted: () => sendApplicationAcceptedEmail(emailParams),
        rejected: () => sendApplicationRejectedEmail(emailParams),
        waitlisted: () => sendApplicationWaitlistedEmail(emailParams),
        under_review: () => sendApplicationUnderReviewEmail(emailParams),
        eligible: () => sendApplicationEligibleEmail(emailParams),
        ineligible: () => sendApplicationIneligibleEmail(emailParams),
      };
      const sender = emailSenders[newStatus];
      if (sender) sender().catch((e) => console.error(`Failed to send ${newStatus} email:`, e));
    }

    // In-app notification for the applicant
    if (existing.applicant_id) {
      const notifMessages: Record<string, { title: string; message: string }> = {
        accepted: { title: "Application Accepted", message: `Your application for ${formName} has been accepted!` },
        rejected: { title: "Application Update", message: `Your application for ${formName} was not accepted.` },
        waitlisted: { title: "Application Waitlisted", message: `Your application for ${formName} has been waitlisted.` },
        under_review: { title: "Application Under Review", message: `Your application for ${formName} is being reviewed.` },
        eligible: { title: "Application Eligible", message: `Your application for ${formName} has passed screening.` },
        ineligible: { title: "Application Ineligible", message: `Your application for ${formName} did not meet eligibility criteria.` },
      };
      const notif = notifMessages[newStatus];
      if (notif) {
        admin.from("notifications").insert({
          user_id: existing.applicant_id,
          type: "hackathon-update",
          title: notif.title,
          message: notif.message,
          link: `/apply/${formId}`,
        }).then(({ error: notifErr }) => {
          if (notifErr) console.error("Failed to insert notification:", notifErr);
        });
      }
    }
  }

  return NextResponse.json({ data: dbRowToApplication(data as Record<string, unknown>) });
}
