import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailWrapper, escapeHtml } from "@/lib/resend";
import { checkRateLimit } from "@/lib/rate-limit";
import { authenticateRequest, assertScope } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    // Dual auth: session cookies OR API key
    const auth = await authenticateRequest(request);

    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/events");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    // Verify user is the event organizer
    const { data: event } = await supabase
      .from("events")
      .select("organizer_id")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("event_emails")
      .select("id, event_id, subject, body, recipient_filter, recipient_count, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch emails" }, { status: 400 });
    }

    const emails = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      eventId: row.event_id as string,
      subject: row.subject as string,
      body: row.body as string,
      recipientFilter: row.recipient_filter as string,
      recipientCount: row.recipient_count as number,
      createdAt: row.created_at as string,
    }));

    return NextResponse.json({ data: emails });
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
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    // Dual auth: session cookies OR API key
    const auth = await authenticateRequest(request);

    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/events");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    // Rate limit by authenticated user (not IP) to prevent abuse
    const rl = checkRateLimit(auth.userId, {
      namespace: "event-emails",
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many emails sent. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    const { data: event } = await supabase
      .from("events")
      .select("organizer_id, title")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { subject, body, recipientFilter } = await request.json();

    if (!subject || !body) {
      return NextResponse.json(
        { error: "subject and body are required" },
        { status: 400 }
      );
    }

    if (typeof subject !== "string" || subject.length > 200) {
      return NextResponse.json(
        { error: "Subject must be a string under 200 characters" },
        { status: 400 }
      );
    }

    if (typeof body !== "string" || body.length > 10000) {
      return NextResponse.json(
        { error: "Body must be a string under 10,000 characters" },
        { status: 400 }
      );
    }

    // Validate recipientFilter against allowed values
    const allowedFilters = ["all", "confirmed", "pending", "cancelled"];
    if (recipientFilter && !allowedFilters.includes(recipientFilter)) {
      return NextResponse.json(
        { error: "Invalid recipient filter" },
        { status: 400 }
      );
    }

    // Fetch recipients based on filter
    let regQuery = supabase
      .from("event_registrations")
      .select("user:profiles!event_registrations_user_id_fkey(email)")
      .eq("event_id", eventId);

    if (recipientFilter && recipientFilter !== "all") {
      regQuery = regQuery.eq("status", recipientFilter);
    }

    const { data: registrations } = await regQuery;

    const emails: string[] = [];
    for (const reg of registrations || []) {
      const u = reg.user as unknown as { email: string } | null;
      if (u?.email) emails.push(u.email);
    }

    // Send emails via Resend
    const htmlContent = emailWrapper(`
      <h1 style="margin:0 0 16px;color:#fff;font-size:22px;font-weight:700;">${escapeHtml(subject)}</h1>
      <div style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 24px;">
        ${escapeHtml(body).replace(/\n/g, "<br/>")}
      </div>
      <p style="color:#a1a1aa;font-size:13px;margin:0;">This email is regarding <strong style="color:#fff;">${escapeHtml(event.title)}</strong></p>
    `);

    let sentCount = 0;
    for (const email of emails) {
      try {
        await sendEmail({ to: email, subject, html: htmlContent });
        sentCount++;
      } catch (err) {
        // Skip individual send failures
      }
    }

    // Record in database
    const { error: insertError } = await supabase
      .from("event_emails")
      .insert({
        event_id: eventId,
        sent_by: auth.userId,
        subject,
        body,
        recipient_filter: recipientFilter || "all",
        recipient_count: sentCount,
      });

    if (insertError) {
      return NextResponse.json({ error: "Failed to send email" }, { status: 400 });
    }

    return NextResponse.json({ sent: sentCount });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
