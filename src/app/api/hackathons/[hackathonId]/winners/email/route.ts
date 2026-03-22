import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";
import { checkHackathonAccess, canManage } from "@/lib/check-hackathon-access";
import { sendEmail, emailWrapper, statusBanner, bodySection, greeting, ctaButton, COLORS } from "@/lib/resend";

/**
 * POST /api/hackathons/[hackathonId]/winners/email
 *
 * Send a bulk email to all winners of this hackathon.
 * Requires owner/admin access.
 */
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

    const supabase = getSupabaseAdminClient();

    const access = await checkHackathonAccess(supabase, hackathonId, auth.userId);
    if (!access.hasAccess || !canManage(access.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { subject, body: emailBody } = body as {
      subject: string;
      body: string;
    };

    if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }
    if (subject.length > 500) {
      return NextResponse.json({ error: "Subject too long (max 500)" }, { status: 400 });
    }
    if (!emailBody || typeof emailBody !== "string" || emailBody.trim().length === 0) {
      return NextResponse.json({ error: "Email body is required" }, { status: 400 });
    }
    if (emailBody.length > 50000) {
      return NextResponse.json({ error: "Email body too long (max 50000)" }, { status: 400 });
    }

    // Fetch hackathon details for template replacements
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("name, hacking_start, hacking_end, organizer:profiles!organizer_id(name, email)")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    // Fetch all winners with registration_id
    const { data: winners, error: winnersErr } = await supabase
      .from("competition_winners")
      .select("id, award_label, rank, registration_id")
      .eq("hackathon_id", hackathonId);

    if (winnersErr) {
      console.error("Failed to fetch winners for email:", winnersErr);
      return NextResponse.json({ error: "Failed to fetch winners" }, { status: 500 });
    }

    if (!winners || winners.length === 0) {
      return NextResponse.json({
        data: { sent: 0, failed: 0, message: "No winners found." },
      });
    }

    // Fetch registrations + profiles separately (avoids nested FK join issues)
    const regIds = winners.map((w) => w.registration_id);
    const { data: regs } = await supabase
      .from("hackathon_registrations")
      .select("id, user_id")
      .in("id", regIds);

    const userIds = (regs ?? []).map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, name")
      .in("id", userIds);

    // Build lookup maps
    const regMap = new Map((regs ?? []).map((r) => [r.id, r]));
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const hackathonName = hackathon.name as string;
    const organizer = Array.isArray(hackathon.organizer) ? hackathon.organizer[0] : hackathon.organizer;
    const organizerName = (organizer as { name?: string } | null)?.name || "Organizer";

    let sent = 0;
    let failed = 0;

    for (const w of winners) {
      const reg = regMap.get(w.registration_id);
      const user = reg ? profileMap.get(reg.user_id) : null;

      if (!user?.email) {
        console.error(`Winner ${w.id}: no email found (reg=${w.registration_id}, userId=${reg?.user_id})`);
        failed++;
        continue;
      }

      const recipientName = (user.name as string) || "Winner";

      const replacements: Record<string, string> = {
        "{{applicant_name}}": recipientName as string,
        "{{winner_name}}": recipientName as string,
        "{{applicant_email}}": user.email as string,
        "{{hackathon_name}}": hackathonName,
        "{{award_label}}": (w.award_label as string) || "",
        "{{rank}}": w.rank != null ? String(w.rank) : "",
        "{{hackathon_url}}": `${siteUrl}/hackathons/${hackathonId}`,
        "{{organizer_name}}": organizerName,
        "{{dashboard_url}}": `${siteUrl}/dashboard`,
      };

      let finalSubject = subject;
      let finalBody = emailBody;
      for (const [key, value] of Object.entries(replacements)) {
        finalSubject = finalSubject.replaceAll(key, value);
        finalBody = finalBody.replaceAll(key, value);
      }

      try {
        // Allow HTML formatting (bold, italic, lists, etc.) in the body.
        // Only plain-text line breaks need converting; HTML tags pass through.
        const htmlBody = finalBody.replace(/\n/g, "<br/>");

        const result = await sendEmail({
          to: user.email as string,
          subject: finalSubject,
          html: emailWrapper(`
            ${statusBanner(COLORS.amber, `${COLORS.amber}18`, "&#127942;", "Winner")}
            ${bodySection(`
              ${greeting(recipientName as string)}
              <div style="color:#e4e4e7;font-size:15px;line-height:1.7;margin:0 0 16px;">
                ${htmlBody}
              </div>
              ${ctaButton(`${siteUrl}/hackathons/${hackathonId}`, "View Hackathon")}
            `)}
          `),
        });
        console.log(`[winners-email] Sent to ${user.email}, result:`, JSON.stringify(result));
        sent++;
      } catch (err) {
        console.error(`[winners-email] Failed to email winner ${user.email}:`, err);
        failed++;
      }
    }

    return NextResponse.json({
      data: { sent, failed, total: winners.length },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
