import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { sendEmail, emailWrapper } from "@/lib/resend";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase
      .from("event_emails")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
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
  } catch {
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
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: event } = await supabase
      .from("events")
      .select("organizer_id, title")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.organizer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { subject, body, recipientFilter } = await request.json();

    if (!subject || !body) {
      return NextResponse.json(
        { error: "subject and body are required" },
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
      <h1 style="margin:0 0 16px;color:#fff;font-size:22px;font-weight:700;">${subject}</h1>
      <div style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 24px;">
        ${body.replace(/\n/g, "<br/>")}
      </div>
      <p style="color:#a1a1aa;font-size:13px;margin:0;">This email is regarding <strong style="color:#fff;">${event.title}</strong></p>
    `);

    let sentCount = 0;
    for (const email of emails) {
      try {
        await sendEmail({ to: email, subject, html: htmlContent });
        sentCount++;
      } catch {
        // Skip individual send failures
      }
    }

    // Record in database
    const { error: insertError } = await supabase
      .from("event_emails")
      .insert({
        event_id: eventId,
        sent_by: user.id,
        subject,
        body,
        recipient_filter: recipientFilter || "all",
        recipient_count: sentCount,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ sent: sentCount });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
