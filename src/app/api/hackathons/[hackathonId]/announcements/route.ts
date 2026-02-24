import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { profileToPublicUser } from "@/lib/supabase/mappers";
import { sendEmail, emailWrapper, escapeHtml } from "@/lib/resend";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;
    const supabase = await getSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify user is either the organizer or a registered participant
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    const isOrganizer = hackathon.organizer_id === user.id;
    if (!isOrganizer) {
      const { data: registration } = await supabase
        .from("hackathon_registrations")
        .select("id")
        .eq("hackathon_id", hackathonId)
        .eq("user_id", user.id)
        .in("status", ["confirmed", "approved"])
        .maybeSingle();

      if (!registration) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from("hackathon_announcements")
      .select("*, sender:profiles!hackathon_announcements_sent_by_fkey(*)")
      .eq("hackathon_id", hackathonId)
      .order("sent_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const announcements = (data || []).map((row: Record<string, unknown>) => {
      const senderProfile = row.sender as Record<string, unknown>;
      return {
        id: row.id as string,
        hackathonId: row.hackathon_id as string,
        title: row.title as string,
        message: row.message as string,
        sentBy: senderProfile ? profileToPublicUser(senderProfile) : null,
        recipientCount: (row.recipient_count as number) || 0,
        sentAt: row.sent_at as string,
      };
    });

    return NextResponse.json({ data: announcements });
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

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify caller is the hackathon organizer and get hackathon name
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id, name")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json(
        { error: "Hackathon not found" },
        { status: 404 }
      );
    }
    if (hackathon.organizer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, message } = await request.json();

    if (!title || !message) {
      return NextResponse.json(
        { error: "title and message are required" },
        { status: 400 }
      );
    }

    if (typeof title !== "string" || title.length > 200) {
      return NextResponse.json(
        { error: "Title must be a string under 200 characters" },
        { status: 400 }
      );
    }

    if (typeof message !== "string" || message.length > 10000) {
      return NextResponse.json(
        { error: "Message must be a string under 10,000 characters" },
        { status: 400 }
      );
    }

    // Get all registered participants' emails
    const { data: registrations, error: regError } = await supabase
      .from("hackathon_registrations")
      .select("user:profiles!hackathon_registrations_user_id_fkey(email, name)")
      .eq("hackathon_id", hackathonId)
      .in("status", ["confirmed", "approved"]);

    if (regError) {
      return NextResponse.json({ error: regError.message }, { status: 400 });
    }

    const recipients = (registrations || [])
      .map((r: Record<string, unknown>) => {
        const profile = r.user as { email: string; name: string } | null;
        return profile ? { email: profile.email, name: profile.name } : null;
      })
      .filter(Boolean) as { email: string; name: string }[];

    // Insert the announcement
    const { data: announcement, error: insertError } = await supabase
      .from("hackathon_announcements")
      .insert({
        hackathon_id: hackathonId,
        title,
        message,
        sent_by: user.id,
        recipient_count: recipients.length,
      })
      .select("*, sender:profiles!hackathon_announcements_sent_by_fkey(*)")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      );
    }

    // Send emails to all participants (fire-and-forget, don't block response)
    const hackathonName = hackathon.name as string;
    let emailsSent = 0;

    for (const recipient of recipients) {
      sendEmail({
        to: recipient.email,
        subject: `[${hackathonName}] ${title}`,
        html: emailWrapper(`
          <h1 style="margin:0 0 8px;color:#fff;font-size:22px;font-weight:700;">${escapeHtml(title)}</h1>
          <p style="margin:0 0 4px;color:#a1a1aa;font-size:13px;">Announcement from <strong style="color:#e8440a;">${escapeHtml(hackathonName)}</strong></p>
          <hr style="border:none;border-top:1px solid #27272a;margin:16px 0;" />
          <div style="color:#d4d4d8;font-size:15px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(message)}</div>
          <hr style="border:none;border-top:1px solid #27272a;margin:24px 0 16px;" />
          <p style="margin:0;color:#71717a;font-size:12px;">
            You are receiving this because you are registered for ${escapeHtml(hackathonName)}.
          </p>
        `),
      }).catch(() => {
        // Silently ignore individual email failures
      });
      emailsSent++;
    }

    const senderProfile = (announcement as Record<string, unknown>)
      .sender as Record<string, unknown>;

    return NextResponse.json({
      data: {
        id: announcement.id,
        hackathonId: announcement.hackathon_id,
        title: announcement.title,
        message: announcement.message,
        sentBy: senderProfile ? profileToPublicUser(senderProfile) : null,
        recipientCount: announcement.recipient_count,
        sentAt: announcement.sent_at,
      },
      emailsSent,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
