import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkHackathonAccess, canEdit } from "@/lib/check-hackathon-access";
import { sendEmail, emailWrapper, escapeHtml } from "@/lib/resend";
import { profileToPublicUser } from "@/lib/supabase/mappers";

const VALID_AUDIENCES = [
  "all",
  "accepted",
  "waitlisted",
  "rejected",
  "confirmed",
  "pending",
  "eligible",
  "ineligible",
] as const;

type Audience = (typeof VALID_AUDIENCES)[number];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid hackathon ID" }, { status: 400 });
    }

    // Dual auth: session cookies OR API key
    const auth = await authenticateRequest(request);

    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    // Verify user is either a collaborator or a registered participant
    const access = await checkHackathonAccess(supabase, hackathonId, auth.userId);
    const isCollaborator = access.hasAccess;

    if (!isCollaborator) {
      // For API key auth, only collaborators can list announcements
      if (auth.type === "api_key") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const { data: registration } = await supabase
        .from("hackathon_registrations")
        .select("id")
        .eq("hackathon_id", hackathonId)
        .eq("user_id", auth.userId)
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
      return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 400 });
    }

    const announcements = (data || []).map((row: Record<string, unknown>) => {
      const senderProfile = row.sender as Record<string, unknown>;
      return {
        id: row.id as string,
        hackathonId: row.hackathon_id as string,
        title: row.title as string,
        message: row.message as string,
        audience: (row.audience as string) || "all",
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

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid hackathon ID" }, { status: 400 });
    }

    // Dual auth: session cookies OR API key
    const auth = await authenticateRequest(request);

    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    // Verify caller has access (owner/admin/editor can send announcements)
    const postAccess = await checkHackathonAccess(supabase, hackathonId, auth.userId);
    if (!postAccess.hasAccess || !canEdit(postAccess.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Rate limit: 5 announcements per organizer per 10 minutes
    const rl = checkRateLimit(`${auth.userId}:${hackathonId}`, {
      namespace: "announcements",
      limit: 5,
      windowMs: 10 * 60 * 1000,
    });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many announcements sent. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

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

    const body = await request.json();
    const { title, message, audience: rawAudience } = body;

    // Validate title
    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }
    if (title.length > 200) {
      return NextResponse.json(
        { error: "Title must be under 200 characters" },
        { status: 400 }
      );
    }

    // Validate message
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }
    if (message.length > 5000) {
      return NextResponse.json(
        { error: "Message must be under 5,000 characters" },
        { status: 400 }
      );
    }

    // Validate audience
    const audience: Audience = VALID_AUDIENCES.includes(rawAudience as Audience)
      ? (rawAudience as Audience)
      : "all";

    // Query hackathon_registrations filtered by audience status to get recipient emails
    const adminClient = getSupabaseAdminClient();
    let registrationsQuery = adminClient
      .from("hackathon_registrations")
      .select("user_id, user:profiles!hackathon_registrations_user_id_fkey(email, name)")
      .eq("hackathon_id", hackathonId);

    if (audience !== "all") {
      registrationsQuery = registrationsQuery.eq("status", audience);
    }

    const { data: registrations, error: regError } = await registrationsQuery;

    if (regError) {
      return NextResponse.json({ error: "Failed to query recipients" }, { status: 400 });
    }

    const recipients = (registrations || [])
      .map((r: Record<string, unknown>) => {
        const profile = r.user as { email: string; name: string } | null;
        return profile ? { email: profile.email, name: profile.name } : null;
      })
      .filter(Boolean) as { email: string; name: string }[];

    // Insert the announcement record using admin client (bypasses RLS for the write)
    const { data: announcement, error: insertError } = await adminClient
      .from("hackathon_announcements")
      .insert({
        hackathon_id: hackathonId,
        title: title.trim(),
        message: message.trim(),
        audience,
        sent_by: auth.userId,
        recipient_count: recipients.length,
      })
      .select("id, title, audience, recipient_count")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to save announcement" },
        { status: 400 }
      );
    }

    // Send emails in batches of 50 using Promise.allSettled
    const hackathonName = hackathon.name as string;
    const BATCH_SIZE = 50;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map((recipient) =>
          sendEmail({
            to: recipient.email,
            subject: `[${hackathonName}] ${title.trim()}`,
            html: emailWrapper(`
            <div style="padding:28px 32px;">
              <h1 style="margin:0 0 8px;color:#fff;font-size:22px;font-weight:700;">${escapeHtml(title.trim())}</h1>
              <p style="margin:0 0 4px;color:#a1a1aa;font-size:13px;">Announcement from <strong style="color:#e8440a;">${escapeHtml(hackathonName)}</strong></p>
              <hr style="border:none;border-top:1px solid #27272a;margin:16px 0;" />
              <div style="color:#d4d4d8;font-size:15px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(message.trim())}</div>
              <hr style="border:none;border-top:1px solid #27272a;margin:24px 0 16px;" />
              <p style="margin:0;color:#71717a;font-size:12px;">
                You are receiving this because you are registered for ${escapeHtml(hackathonName)}.
              </p>
            </div>
          `),
          })
        )
      );
    }

    // Create in-app notifications for all recipients
    const notifPayloads = (registrations || [])
      .map((r: Record<string, unknown>) => {
        const uid = r.user_id as string | undefined;
        if (!uid) return null;
        return {
          user_id: uid,
          type: "hackathon-update" as const,
          title: `Announcement: ${title.trim().slice(0, 100)}`,
          message: `New announcement from ${hackathonName}: ${message.trim().slice(0, 200)}`,
          link: `/hackathons/${hackathonId}`,
        };
      })
      .filter(Boolean);

    if (notifPayloads.length > 0) {
      adminClient.from("notifications").insert(notifPayloads)
        .then(() => {}, (err: unknown) => console.error("Failed to insert announcement notifications:", err));
    }

    return NextResponse.json({
      data: {
        id: announcement.id,
        title: announcement.title,
        audience: announcement.audience,
        recipientCount: announcement.recipient_count,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
