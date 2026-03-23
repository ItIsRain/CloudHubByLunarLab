import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { sendEmail, emailWrapper, escapeHtml } from "@/lib/resend";
import { UUID_RE } from "@/lib/constants";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const VALID_REMINDER_TYPES = [
  "incomplete_application",
  "deadline_approaching",
  "rsvp_confirmation",
] as const;

type ReminderType = (typeof VALID_REMINDER_TYPES)[number];

function isValidReminderType(value: unknown): value is ReminderType {
  return (
    typeof value === "string" &&
    VALID_REMINDER_TYPES.includes(value as ReminderType)
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

  const { data: hackathon } = await supabase
    .from("hackathons")
    .select("organizer_id")
    .eq("id", hackathonId)
    .single();

  if (!hackathon) {
    return {
      error: NextResponse.json(
        { error: "Hackathon not found" },
        { status: 404 }
      ),
    };
  }

  if (hackathon.organizer_id !== auth.userId) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { supabase, userId: auth.userId };
}

// =====================================================
// GET — List all reminder rules for this hackathon
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

    const { data: rules, error } = await supabase
      .from("reminder_rules")
      .select("*")
      .eq("hackathon_id", hackathonId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch reminder rules:", error);
      return NextResponse.json(
        { error: "Failed to fetch reminder rules" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: rules ?? [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =====================================================
// POST — Create a reminder rule OR trigger a manual send
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

    const { supabase, userId } = result;
    const body = await request.json();

    // ── Manual trigger ──
    if (body.action === "trigger" && body.ruleId) {
      // Rate limit: max 5 triggers per 10 minutes to prevent email spam
      const ip = getClientIp(request);
      const rl = checkRateLimit(`${ip}:reminder-trigger:${hackathonId}`, {
        namespace: "reminder-trigger",
        limit: 5,
        windowMs: 10 * 60 * 1000,
      });
      if (rl.limited) {
        return NextResponse.json(
          { error: "Too many trigger requests. Please try again later." },
          { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
        );
      }
      if (!UUID_RE.test(body.ruleId)) {
        return NextResponse.json(
          { error: "Invalid rule ID" },
          { status: 400 }
        );
      }

      const { data: rule } = await supabase
        .from("reminder_rules")
        .select("*")
        .eq("id", body.ruleId)
        .eq("hackathon_id", hackathonId)
        .single();

      if (!rule) {
        return NextResponse.json(
          { error: "Reminder rule not found" },
          { status: 404 }
        );
      }

      // Fetch hackathon details for placeholders
      const { data: hackathon } = await supabase
        .from("hackathons")
        .select(
          "name, hacking_start, hacking_end, registration_end, organizer:profiles!hackathons_organizer_id_fkey(display_name, full_name)"
        )
        .eq("id", hackathonId)
        .single();

      if (!hackathon) {
        return NextResponse.json(
          { error: "Hackathon not found" },
          { status: 404 }
        );
      }

      // Build recipient query based on reminder type
      const reminderType = rule.reminder_type as ReminderType;
      let regQuery = supabase
        .from("hackathon_registrations")
        .select(
          "id, user_id, status, user:profiles!hackathon_registrations_user_id_fkey(email, full_name, display_name)"
        )
        .eq("hackathon_id", hackathonId);

      if (reminderType === "incomplete_application") {
        regQuery = regQuery.eq("status", "draft");
      } else if (reminderType === "deadline_approaching") {
        regQuery = regQuery.not(
          "status",
          "in",
          '("cancelled","declined","rejected","ineligible")'
        );
      } else if (reminderType === "rsvp_confirmation") {
        regQuery = regQuery.in("status", ["accepted", "approved"]);
      }

      // Apply recipient_filter if present
      const recipientFilter = rule.recipient_filter as Record<string, unknown> | null;
      if (
        recipientFilter?.status &&
        Array.isArray(recipientFilter.status) &&
        (recipientFilter.status as string[]).length > 0
      ) {
        regQuery = regQuery.in("status", recipientFilter.status as string[]);
      }

      const { data: registrations, error: regError } = await regQuery;

      if (regError) {
        return NextResponse.json(
          { error: "Failed to fetch recipients" },
          { status: 500 }
        );
      }

      if (!registrations || registrations.length === 0) {
        return NextResponse.json({
          data: {
            sent: 0,
            failed: 0,
            message: "No recipients match this reminder's criteria.",
          },
        });
      }

      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const hackathonName = hackathon.name as string;
      const organizerProfile = hackathon.organizer as {
        display_name?: string;
        full_name?: string;
      } | null;
      const organizerName =
        organizerProfile?.display_name ||
        organizerProfile?.full_name ||
        "Organizer";
      const startDate = hackathon.hacking_start
        ? new Date(hackathon.hacking_start as string).toLocaleDateString()
        : "TBD";
      const endDate = hackathon.hacking_end
        ? new Date(hackathon.hacking_end as string).toLocaleDateString()
        : "TBD";
      const regDeadline = hackathon.registration_end
        ? new Date(hackathon.registration_end as string).toLocaleDateString()
        : "TBD";

      let sent = 0;
      let failed = 0;
      const BATCH_SIZE = 10;

      const emailTasks: (() => Promise<void>)[] = [];

      for (const reg of registrations) {
        const profile = reg.user as {
          email?: string;
          full_name?: string;
          display_name?: string;
        } | null;
        const recipientEmail = profile?.email;
        if (!recipientEmail) continue;

        const recipientName =
          profile?.display_name || profile?.full_name || "Participant";

        const replacements: Record<string, string> = {
          "{{applicant_name}}": recipientName,
          "{{applicant_email}}": recipientEmail,
          "{{hackathon_name}}": hackathonName,
          "{{status}}": (reg.status as string) || "",
          "{{hackathon_url}}": `${siteUrl}/hackathons/${hackathonId}`,
          "{{hackathon_start_date}}": startDate,
          "{{hackathon_end_date}}": endDate,
          "{{organizer_name}}": organizerName,
          "{{dashboard_url}}": `${siteUrl}/dashboard`,
          "{{registration_deadline}}": regDeadline,
        };

        let finalSubject = rule.email_subject as string;
        let finalBody = rule.email_body as string;
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
                  <div style="color:#e4e4e7;font-size:15px;line-height:1.7;margin:0 0 16px;white-space:pre-wrap;">
                    ${escapeHtml(finalBody)}
                  </div>
                  <div style="text-align:center;padding:16px 0;">
                    <a href="${siteUrl}/hackathons/${hackathonId}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#e8440a,#ff5722);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">
                      View Hackathon
                    </a>
                  </div>
                </div>
              `),
            });
            sent++;
          } catch {
            failed++;
          }
        });
      }

      for (let i = 0; i < emailTasks.length; i += BATCH_SIZE) {
        const batch = emailTasks.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(batch.map((fn) => fn()));
      }

      // Update last_sent_at
      await supabase
        .from("reminder_rules")
        .update({ last_sent_at: new Date().toISOString() })
        .eq("id", body.ruleId)
        .eq("hackathon_id", hackathonId);

      return NextResponse.json({
        data: { sent, failed, total: registrations.length },
      });
    }

    // ── Create a new reminder rule ──
    const {
      name,
      reminder_type,
      enabled,
      trigger_days_before,
      trigger_hours_before,
      email_subject,
      email_body,
      recipient_filter,
    } = body;

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

    // Validate reminder_type
    if (!isValidReminderType(reminder_type)) {
      return NextResponse.json(
        {
          error: `reminder_type must be one of: ${VALID_REMINDER_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate trigger timing
    if (
      trigger_days_before === undefined &&
      trigger_hours_before === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "At least one of trigger_days_before or trigger_hours_before is required",
        },
        { status: 400 }
      );
    }
    if (
      trigger_days_before !== undefined &&
      (typeof trigger_days_before !== "number" || trigger_days_before < 0 || trigger_days_before > 365)
    ) {
      return NextResponse.json(
        { error: "trigger_days_before must be a number between 0 and 365" },
        { status: 400 }
      );
    }
    if (
      trigger_hours_before !== undefined &&
      (typeof trigger_hours_before !== "number" || trigger_hours_before < 0 || trigger_hours_before > 8760)
    ) {
      return NextResponse.json(
        { error: "trigger_hours_before must be a number between 0 and 8760" },
        { status: 400 }
      );
    }

    // Validate email_subject
    if (
      !email_subject ||
      typeof email_subject !== "string" ||
      email_subject.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "email_subject is required" },
        { status: 400 }
      );
    }
    if (email_subject.length > 500) {
      return NextResponse.json(
        { error: "email_subject must be at most 500 characters" },
        { status: 400 }
      );
    }

    // Validate email_body
    if (
      !email_body ||
      typeof email_body !== "string" ||
      email_body.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "email_body is required" },
        { status: 400 }
      );
    }
    if (email_body.length > 50000) {
      return NextResponse.json(
        { error: "email_body must be at most 50000 characters" },
        { status: 400 }
      );
    }

    const { data: rule, error } = await supabase
      .from("reminder_rules")
      .insert({
        hackathon_id: hackathonId,
        created_by: userId,
        name: name.trim(),
        reminder_type,
        enabled: enabled !== undefined ? Boolean(enabled) : true,
        trigger_days_before: trigger_days_before ?? null,
        trigger_hours_before: trigger_hours_before ?? null,
        email_subject: email_subject.trim(),
        email_body,
        recipient_filter: recipient_filter ?? {},
      })
      .select("*")
      .single();

    if (error) {
      console.error("Failed to create reminder rule:", error);
      return NextResponse.json(
        { error: "Failed to create reminder rule" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: rule }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH — Update a reminder rule
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

    const { supabase } = result;
    const body = await request.json();
    const { ruleId, ...updates } = body;

    if (!ruleId || typeof ruleId !== "string") {
      return NextResponse.json(
        { error: "ruleId is required" },
        { status: 400 }
      );
    }
    if (!UUID_RE.test(ruleId)) {
      return NextResponse.json(
        { error: "Invalid rule ID" },
        { status: 400 }
      );
    }

    const allowedFields = [
      "name",
      "reminder_type",
      "enabled",
      "trigger_days_before",
      "trigger_hours_before",
      "email_subject",
      "email_body",
      "recipient_filter",
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

    if ("reminder_type" in updatePayload) {
      if (!isValidReminderType(updatePayload.reminder_type)) {
        return NextResponse.json(
          {
            error: `reminder_type must be one of: ${VALID_REMINDER_TYPES.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    if ("enabled" in updatePayload) {
      if (typeof updatePayload.enabled !== "boolean") {
        return NextResponse.json(
          { error: "enabled must be a boolean" },
          { status: 400 }
        );
      }
    }

    if ("trigger_days_before" in updatePayload) {
      const val = updatePayload.trigger_days_before;
      if (val !== null && (typeof val !== "number" || val < 0 || val > 365)) {
        return NextResponse.json(
          { error: "trigger_days_before must be a number between 0 and 365 or null" },
          { status: 400 }
        );
      }
    }

    if ("trigger_hours_before" in updatePayload) {
      const val = updatePayload.trigger_hours_before;
      if (val !== null && (typeof val !== "number" || val < 0 || val > 8760)) {
        return NextResponse.json(
          { error: "trigger_hours_before must be a number between 0 and 8760 or null" },
          { status: 400 }
        );
      }
    }

    if ("email_subject" in updatePayload) {
      const s = updatePayload.email_subject;
      if (!s || typeof s !== "string" || s.trim().length === 0) {
        return NextResponse.json(
          { error: "email_subject cannot be empty" },
          { status: 400 }
        );
      }
      if ((s as string).length > 500) {
        return NextResponse.json(
          { error: "email_subject must be at most 500 characters" },
          { status: 400 }
        );
      }
      updatePayload.email_subject = (s as string).trim();
    }

    if ("email_body" in updatePayload) {
      const b = updatePayload.email_body;
      if (!b || typeof b !== "string" || (b as string).trim().length === 0) {
        return NextResponse.json(
          { error: "email_body cannot be empty" },
          { status: 400 }
        );
      }
      if ((b as string).length > 50000) {
        return NextResponse.json(
          { error: "email_body must be at most 50000 characters" },
          { status: 400 }
        );
      }
    }

    const { data: rule, error } = await supabase
      .from("reminder_rules")
      .update(updatePayload)
      .eq("id", ruleId)
      .eq("hackathon_id", hackathonId)
      .select("*")
      .single();

    if (error) {
      console.error("Failed to update reminder rule:", error);
      return NextResponse.json(
        { error: "Failed to update reminder rule" },
        { status: 500 }
      );
    }

    if (!rule) {
      return NextResponse.json(
        { error: "Reminder rule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: rule });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE — Delete a reminder rule
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

    const { supabase } = result;
    const body = await request.json();
    const { ruleId } = body;

    if (!ruleId || typeof ruleId !== "string") {
      return NextResponse.json(
        { error: "ruleId is required" },
        { status: 400 }
      );
    }
    if (!UUID_RE.test(ruleId)) {
      return NextResponse.json(
        { error: "Invalid rule ID" },
        { status: 400 }
      );
    }

    const { error, count } = await supabase
      .from("reminder_rules")
      .delete()
      .eq("id", ruleId)
      .eq("hackathon_id", hackathonId);

    if (error) {
      console.error("Failed to delete reminder rule:", error);
      return NextResponse.json(
        { error: "Failed to delete reminder rule" },
        { status: 500 }
      );
    }

    if (count === 0) {
      return NextResponse.json(
        { error: "Reminder rule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Reminder rule deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
