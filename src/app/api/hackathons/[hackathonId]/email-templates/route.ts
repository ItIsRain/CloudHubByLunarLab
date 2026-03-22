import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { sendEmail, emailWrapper, escapeHtml } from "@/lib/resend";
import { UUID_RE } from "@/lib/constants";
import { checkHackathonAccess, canEdit, type HackathonRole } from "@/lib/check-hackathon-access";

const VALID_CATEGORIES = [
  "acceptance",
  "rejection",
  "waitlist",
  "reminder",
  "announcement",
  "rsvp",
  "custom",
] as const;

type TemplateCategory = (typeof VALID_CATEGORIES)[number];

function isValidCategory(value: unknown): value is TemplateCategory {
  return (
    typeof value === "string" &&
    VALID_CATEGORIES.includes(value as TemplateCategory)
  );
}

/**
 * Authenticate and authorize the request, returning the supabase client
 * and hackathon data if the caller is the hackathon organizer.
 */
async function authenticateAndAuthorize(
  request: NextRequest,
  hackathonId: string
) {
  const auth = await authenticateRequest(request);

  if (auth.type === "unauthenticated") {
    return {
      error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }

  if (auth.type === "api_key") {
    const scopeError = assertScope(auth, "/api/hackathons");
    if (scopeError) {
      return {
        error: NextResponse.json({ error: scopeError }, { status: 403 }),
      };
    }
  }

  const supabase =
    auth.type === "api_key"
      ? getSupabaseAdminClient()
      : await getSupabaseServerClient();

  // Check access via RBAC (all collaborator roles have base access to view)
  const access = await checkHackathonAccess(supabase, hackathonId, auth.userId);
  if (!access.hasAccess) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { supabase, userId: auth.userId, role: access.role as HackathonRole };
}

// =====================================================
// GET — List all email templates for this hackathon
// =====================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json(
        { error: "Invalid hackathon ID" },
        { status: 400 }
      );
    }

    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;

    const { supabase } = result;

    // Check if requesting scheduled emails
    const { searchParams } = new URL(request.url);
    if (searchParams.get("scheduled") === "true") {
      const { data: scheduled, error: schedErr } = await supabase
        .from("scheduled_emails")
        .select("*")
        .eq("hackathon_id", hackathonId)
        .order("scheduled_at", { ascending: true });

      if (schedErr) {
        return NextResponse.json({ error: "Failed to fetch scheduled emails" }, { status: 500 });
      }
      return NextResponse.json({ data: scheduled || [] });
    }

    const { data: templates, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("hackathon_id", hackathonId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch email templates:", error);
      return NextResponse.json(
        { error: "Failed to fetch email templates" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: templates });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =====================================================
// POST — Create a new email template
// =====================================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json(
        { error: "Invalid hackathon ID" },
        { status: 400 }
      );
    }

    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;

    const { supabase, userId, role } = result;

    // POST requires owner/admin/editor
    if (!canEdit(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, subject, body: templateBody, category, placeholders } = body;

    // Validate name
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }
    if (name.length > 200) {
      return NextResponse.json(
        { error: "name must be at most 200 characters" },
        { status: 400 }
      );
    }

    // Validate subject
    if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
      return NextResponse.json(
        { error: "subject is required" },
        { status: 400 }
      );
    }
    if (subject.length > 500) {
      return NextResponse.json(
        { error: "subject must be at most 500 characters" },
        { status: 400 }
      );
    }

    // Validate body
    if (
      !templateBody ||
      typeof templateBody !== "string" ||
      templateBody.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "body is required" },
        { status: 400 }
      );
    }
    if (templateBody.length > 50000) {
      return NextResponse.json(
        { error: "body must be at most 50000 characters" },
        { status: 400 }
      );
    }

    // Validate category
    const resolvedCategory: TemplateCategory =
      category !== undefined && category !== null ? category : "custom";
    if (!isValidCategory(resolvedCategory)) {
      return NextResponse.json(
        {
          error: `category must be one of: ${VALID_CATEGORIES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate placeholders
    if (placeholders !== undefined && placeholders !== null) {
      if (!Array.isArray(placeholders)) {
        return NextResponse.json(
          { error: "placeholders must be an array" },
          { status: 400 }
        );
      }
      if (placeholders.length > 50) {
        return NextResponse.json(
          { error: "placeholders must have at most 50 items" },
          { status: 400 }
        );
      }
    }

    const { data: template, error } = await supabase
      .from("email_templates")
      .insert({
        hackathon_id: hackathonId,
        created_by: userId,
        name: name.trim(),
        subject: subject.trim(),
        body: templateBody,
        category: resolvedCategory,
        placeholders: placeholders ?? null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Failed to create email template:", error);
      return NextResponse.json(
        { error: "Failed to create email template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH — Update an email template
// =====================================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json(
        { error: "Invalid hackathon ID" },
        { status: 400 }
      );
    }

    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;

    const { supabase, role } = result;

    // PATCH requires owner/admin/editor
    if (!canEdit(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Handle cancel scheduled email
    if (body.action === "cancel_scheduled" && body.scheduledEmailId) {
      if (!UUID_RE.test(body.scheduledEmailId)) {
        return NextResponse.json({ error: "Invalid scheduled email ID" }, { status: 400 });
      }
      const { error: cancelErr } = await supabase
        .from("scheduled_emails")
        .update({ status: "cancelled" })
        .eq("id", body.scheduledEmailId)
        .eq("hackathon_id", hackathonId)
        .eq("status", "pending");

      if (cancelErr) {
        return NextResponse.json({ error: "Failed to cancel scheduled email" }, { status: 500 });
      }
      return NextResponse.json({ data: { cancelled: true } });
    }

    // Handle update scheduled email
    if (body.action === "update_scheduled" && body.scheduledEmailId) {
      if (!UUID_RE.test(body.scheduledEmailId)) {
        return NextResponse.json({ error: "Invalid scheduled email ID" }, { status: 400 });
      }

      const updateFields: Record<string, unknown> = {};

      if (body.subject !== undefined) {
        if (typeof body.subject !== "string" || body.subject.trim().length === 0 || body.subject.length > 500) {
          return NextResponse.json({ error: "Subject is required (max 500 chars)" }, { status: 400 });
        }
        updateFields.subject = body.subject.trim();
      }

      if (body.body !== undefined) {
        if (typeof body.body !== "string" || body.body.trim().length === 0 || body.body.length > 50000) {
          return NextResponse.json({ error: "Body is required (max 50000 chars)" }, { status: 400 });
        }
        updateFields.body = body.body;
      }

      if (body.scheduledAt !== undefined) {
        const scheduledDate = new Date(body.scheduledAt);
        if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
          return NextResponse.json({ error: "scheduledAt must be a valid future date" }, { status: 400 });
        }
        updateFields.scheduled_at = body.scheduledAt;
      }

      if (body.recipientFilter !== undefined) {
        updateFields.recipient_filter = body.recipientFilter;
      }

      if (Object.keys(updateFields).length === 0) {
        return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
      }

      const { data: updated, error: updateErr } = await supabase
        .from("scheduled_emails")
        .update(updateFields)
        .eq("id", body.scheduledEmailId)
        .eq("hackathon_id", hackathonId)
        .eq("status", "pending")
        .select("*")
        .single();

      if (updateErr) {
        console.error("Failed to update scheduled email:", updateErr);
        return NextResponse.json({ error: "Failed to update scheduled email" }, { status: 500 });
      }

      if (!updated) {
        return NextResponse.json({ error: "Scheduled email not found or not pending" }, { status: 404 });
      }

      return NextResponse.json({ data: updated });
    }

    const { templateId, ...updates } = body;

    if (!templateId || typeof templateId !== "string") {
      return NextResponse.json(
        { error: "templateId is required" },
        { status: 400 }
      );
    }
    if (!UUID_RE.test(templateId)) {
      return NextResponse.json(
        { error: "Invalid template ID" },
        { status: 400 }
      );
    }

    // Build the update payload with only allowed fields
    const allowedFields = [
      "name",
      "subject",
      "body",
      "category",
      "placeholders",
      "is_default",
    ] as const;
    const updatePayload: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in updates) {
        updatePayload[field] = updates[field];
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Validate individual fields if present
    if ("name" in updatePayload) {
      const name = updatePayload.name;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "name cannot be empty" },
          { status: 400 }
        );
      }
      if ((name as string).length > 200) {
        return NextResponse.json(
          { error: "name must be at most 200 characters" },
          { status: 400 }
        );
      }
      updatePayload.name = (name as string).trim();
    }

    if ("subject" in updatePayload) {
      const subject = updatePayload.subject;
      if (
        !subject ||
        typeof subject !== "string" ||
        subject.trim().length === 0
      ) {
        return NextResponse.json(
          { error: "subject cannot be empty" },
          { status: 400 }
        );
      }
      if ((subject as string).length > 500) {
        return NextResponse.json(
          { error: "subject must be at most 500 characters" },
          { status: 400 }
        );
      }
      updatePayload.subject = (subject as string).trim();
    }

    if ("body" in updatePayload) {
      const templateBody = updatePayload.body;
      if (
        !templateBody ||
        typeof templateBody !== "string" ||
        (templateBody as string).trim().length === 0
      ) {
        return NextResponse.json(
          { error: "body cannot be empty" },
          { status: 400 }
        );
      }
      if ((templateBody as string).length > 50000) {
        return NextResponse.json(
          { error: "body must be at most 50000 characters" },
          { status: 400 }
        );
      }
    }

    if ("category" in updatePayload) {
      if (!isValidCategory(updatePayload.category)) {
        return NextResponse.json(
          {
            error: `category must be one of: ${VALID_CATEGORIES.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    if ("placeholders" in updatePayload) {
      const placeholders = updatePayload.placeholders;
      if (placeholders !== null) {
        if (!Array.isArray(placeholders)) {
          return NextResponse.json(
            { error: "placeholders must be an array or null" },
            { status: 400 }
          );
        }
        if (placeholders.length > 50) {
          return NextResponse.json(
            { error: "placeholders must have at most 50 items" },
            { status: 400 }
          );
        }
      }
    }

    if ("is_default" in updatePayload) {
      if (typeof updatePayload.is_default !== "boolean") {
        return NextResponse.json(
          { error: "is_default must be a boolean" },
          { status: 400 }
        );
      }
    }

    const { data: template, error } = await supabase
      .from("email_templates")
      .update(updatePayload)
      .eq("id", templateId)
      .eq("hackathon_id", hackathonId)
      .select("*")
      .single();

    if (error) {
      console.error("Failed to update email template:", error);
      return NextResponse.json(
        { error: "Failed to update email template" },
        { status: 500 }
      );
    }

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: template });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE — Delete an email template
// =====================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json(
        { error: "Invalid hackathon ID" },
        { status: 400 }
      );
    }

    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;

    const { supabase, role } = result;

    // DELETE requires owner/admin/editor
    if (!canEdit(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { templateId } = body;

    if (!templateId || typeof templateId !== "string") {
      return NextResponse.json(
        { error: "templateId is required" },
        { status: 400 }
      );
    }
    if (!UUID_RE.test(templateId)) {
      return NextResponse.json(
        { error: "Invalid template ID" },
        { status: 400 }
      );
    }

    const { error, count } = await supabase
      .from("email_templates")
      .delete()
      .eq("id", templateId)
      .eq("hackathon_id", hackathonId);

    if (error) {
      console.error("Failed to delete email template:", error);
      return NextResponse.json(
        { error: "Failed to delete email template" },
        { status: 500 }
      );
    }

    if (count === 0) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Template deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT — Send bulk emails to hackathon registrants
// =====================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid hackathon ID" }, { status: 400 });
    }

    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) return NextResponse.json({ error: scopeError }, { status: 403 });
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    // Check access via RBAC (owner/admin/editor can send emails)
    const putAccess = await checkHackathonAccess(supabase, hackathonId, auth.userId);
    if (!putAccess.hasAccess || !canEdit(putAccess.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id, name, hacking_start, hacking_end, organizer:profiles!hackathons_organizer_id_fkey(display_name, full_name)")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    const body = await request.json();
    const { subject, body: emailBody, recipientFilter, templateId, scheduledAt } = body as {
      subject: string;
      body: string;
      recipientFilter?: { status?: string[]; campuses?: string[] };
      templateId?: string;
      scheduledAt?: string;
    };

    if (!subject || typeof subject !== "string" || subject.length > 500) {
      return NextResponse.json({ error: "Subject is required (max 500 chars)" }, { status: 400 });
    }
    if (!emailBody || typeof emailBody !== "string" || emailBody.length > 50000) {
      return NextResponse.json({ error: "Body is required (max 50000 chars)" }, { status: 400 });
    }

    // ── Schedule for later instead of sending now ──
    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        return NextResponse.json({ error: "scheduledAt must be a valid future date" }, { status: 400 });
      }

      const { data: scheduled, error: schedErr } = await supabase
        .from("scheduled_emails")
        .insert({
          hackathon_id: hackathonId,
          template_id: templateId || null,
          subject,
          body: emailBody,
          recipient_filter: recipientFilter || {},
          scheduled_at: scheduledAt,
          status: "pending",
          created_by: auth.userId,
        })
        .select("id")
        .single();

      if (schedErr) {
        console.error("Failed to schedule email:", schedErr);
        return NextResponse.json({ error: "Failed to schedule email" }, { status: 500 });
      }

      return NextResponse.json({
        data: { scheduled: true, id: scheduled.id, scheduledAt },
      });
    }

    let regQuery = supabase
      .from("hackathon_registrations")
      .select("id, user_id, status, form_data, created_at, user:profiles!hackathon_registrations_user_id_fkey(email, full_name, display_name)")
      .eq("hackathon_id", hackathonId);

    if (recipientFilter?.status && recipientFilter.status.length > 0) {
      regQuery = regQuery.in("status", recipientFilter.status);
    } else {
      regQuery = regQuery.not("status", "in", '("cancelled","declined")');
    }

    const { data: registrations, error: regError } = await regQuery;

    if (regError) {
      return NextResponse.json({ error: "Failed to fetch recipients" }, { status: 400 });
    }

    if (!registrations || registrations.length === 0) {
      return NextResponse.json({
        data: { sent: 0, failed: 0, message: "No recipients match the selected filters." },
      });
    }

    const BATCH_SIZE = 10;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const hackathonName = hackathon.name as string;
    const organizerProfile = hackathon.organizer as { display_name?: string; full_name?: string } | null;
    const organizerName = organizerProfile?.display_name || organizerProfile?.full_name || "Organizer";
    const startDate = hackathon.hacking_start ? new Date(hackathon.hacking_start as string).toLocaleDateString() : "TBD";
    const endDate = hackathon.hacking_end ? new Date(hackathon.hacking_end as string).toLocaleDateString() : "TBD";
    let sent = 0;
    let failed = 0;

    const emailTasks: (() => Promise<void>)[] = [];

    for (const reg of registrations) {
      const profile = reg.user as { email?: string; full_name?: string; display_name?: string } | null;
      const recipientEmail = profile?.email;
      if (!recipientEmail) continue;

      const recipientName = profile?.display_name || profile?.full_name || "Participant";
      const regCreatedAt = (reg as Record<string, unknown>).created_at;
      const registrationDate = regCreatedAt ? new Date(regCreatedAt as string).toLocaleDateString() : "";

      const replacements: Record<string, string> = {
        "{{applicant_name}}": recipientName,
        "{{applicant_email}}": recipientEmail,
        "{{hackathon_name}}": hackathonName,
        "{{status}}": (reg.status as string) || "",
        "{{hackathon_url}}": `${siteUrl}/hackathons/${hackathonId}`,
        "{{registration_date}}": registrationDate,
        "{{hackathon_start_date}}": startDate,
        "{{hackathon_end_date}}": endDate,
        "{{organizer_name}}": organizerName,
        "{{dashboard_url}}": `${siteUrl}/dashboard`,
      };

      let finalSubject = subject;
      let finalBody = emailBody;
      for (const [key, value] of Object.entries(replacements)) {
        finalSubject = finalSubject.replaceAll(key, value);
        finalBody = finalBody.replaceAll(key, value);
      }

      emailTasks.push(async () => {
        try {
          await sendEmail({
            to: recipientEmail,
            subject: finalSubject,
            html: emailWrapper(`
              <div style="padding:28px 32px;">
                <p style="color:#e4e4e7;font-size:15px;line-height:1.7;margin:0 0 16px;">
                  Hi <strong style="color:#ffffff;">${escapeHtml(recipientName)}</strong>,
                </p>
                <div style="color:#e4e4e7;font-size:15px;line-height:1.7;margin:0 0 16px;">
                  ${finalBody.replace(/\n/g, "<br/>")}
                </div>
                <div style="text-align:center;padding:16px 0;">
                  <a href="${siteUrl}/hackathons/${hackathonId}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#e8440a,#ff5722);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">
                    View Hackathon
                  </a>
                </div>
              </div>
            `),
          });

          supabase.from("email_log").insert({
            hackathon_id: hackathonId,
            template_id: templateId || null,
            recipient_email: recipientEmail,
            recipient_user_id: reg.user_id,
            subject: finalSubject,
            status: "sent",
          }).then(() => {}, () => {});

          sent++;
        } catch {
          failed++;
          supabase.from("email_log").insert({
            hackathon_id: hackathonId,
            template_id: templateId || null,
            recipient_email: recipientEmail,
            recipient_user_id: reg.user_id,
            subject: finalSubject,
            status: "failed",
          }).then(() => {}, () => {});
        }
      });
    }

    for (let i = 0; i < emailTasks.length; i += BATCH_SIZE) {
      const batch = emailTasks.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(batch.map((fn) => fn()));
    }

    return NextResponse.json({
      data: { sent, failed, total: registrations.length },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
