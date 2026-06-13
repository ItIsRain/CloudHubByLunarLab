import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";
import { checkHackathonAccess, canEdit } from "@/lib/check-hackathon-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { emailWrapper, escapeHtml } from "@/lib/resend";
import { getSiteUrl } from "@/lib/site-url";
import { renderCertificatePdf, fetchTemplatePdfBytes } from "@/lib/certificate-render";
import crypto from "crypto";

type RouteParams = {
  params: Promise<{ hackathonId: string; templateId: string }>;
};

// Reasonable hard cap so the route doesn't run for minutes / blow up memory.
// Larger blasts should be split client-side or queued (TODO).
const MAX_RECIPIENTS = 500;

// Statuses we treat as "an active participant" — same set used elsewhere.
const ACTIVE_STATUSES = new Set([
  "accepted",
  "approved",
  "confirmed",
  "eligible",
]);

type AudienceBody = {
  audience:
    | "all"
    | "status"
    | "winners"
    | "registration_ids"
    | "team_ids";
  statuses?: string[];
  registrationIds?: string[];
  teamIds?: string[];
  /** Track restriction (winner audience). */
  trackIds?: string[];
  /** Override email subject/body — same placeholder set as winners email. */
  subject: string;
  body: string;
};

type Recipient = {
  registrationId: string | null;
  userId: string | null;
  email: string;
  name: string;
  teamName: string | null;
  awardLabel: string | null;
};

/**
 * Resolve the recipient list for a given audience filter. For team-based
 * hackathons each team member is still treated individually (every member
 * gets their own certificate with their own name on it). The team name is
 * surfaced for use as a placeholder.
 */
async function resolveRecipients(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  hackathonId: string,
  body: AudienceBody
): Promise<{ ok: true; recipients: Recipient[] } | { ok: false; error: string; status: number }> {
  const audience = body.audience;

  // 1. Pull the candidate registration set per audience type.
  let registrationIds: string[] = [];

  if (audience === "all") {
    const { data } = await supabase
      .from("hackathon_registrations")
      .select("id")
      .eq("hackathon_id", hackathonId)
      .in("status", [...ACTIVE_STATUSES]);
    registrationIds = (data ?? []).map((r: { id: string }) => r.id);
  } else if (audience === "status") {
    const statuses = (body.statuses ?? []).filter((s) => typeof s === "string");
    if (statuses.length === 0) {
      return { ok: false, error: "statuses is required when audience='status'", status: 400 };
    }
    const { data } = await supabase
      .from("hackathon_registrations")
      .select("id")
      .eq("hackathon_id", hackathonId)
      .in("status", statuses);
    registrationIds = (data ?? []).map((r: { id: string }) => r.id);
  } else if (audience === "registration_ids") {
    const ids = (body.registrationIds ?? []).filter(
      (id) => typeof id === "string" && UUID_RE.test(id)
    );
    if (ids.length === 0) {
      return { ok: false, error: "registrationIds is required", status: 400 };
    }
    // Confirm every id actually belongs to this hackathon.
    const { data } = await supabase
      .from("hackathon_registrations")
      .select("id")
      .eq("hackathon_id", hackathonId)
      .in("id", ids);
    registrationIds = (data ?? []).map((r: { id: string }) => r.id);
  } else if (audience === "team_ids") {
    const teamIds = (body.teamIds ?? []).filter(
      (id) => typeof id === "string" && UUID_RE.test(id)
    );
    if (teamIds.length === 0) {
      return { ok: false, error: "teamIds is required", status: 400 };
    }
    const { data: memberRows } = await supabase
      .from("team_members")
      .select("user_id, teams!inner(hackathon_id)")
      .in("team_id", teamIds)
      .eq("teams.hackathon_id", hackathonId);
    const userIds = [
      ...new Set(
        (memberRows ?? [])
          .map((m: { user_id: string }) => m.user_id)
          .filter(Boolean)
      ),
    ];
    if (userIds.length === 0) {
      return { ok: true, recipients: [] };
    }
    const { data: regs } = await supabase
      .from("hackathon_registrations")
      .select("id")
      .eq("hackathon_id", hackathonId)
      .in("user_id", userIds)
      .in("status", [...ACTIVE_STATUSES]);
    registrationIds = (regs ?? []).map((r: { id: string }) => r.id);
  } else if (audience === "winners") {
    let wq = supabase
      .from("competition_winners")
      .select("registration_id")
      .eq("hackathon_id", hackathonId)
      .not("registration_id", "is", null);
    if (body.trackIds && body.trackIds.length > 0) {
      wq = wq.in("award_track_id", body.trackIds);
    }
    const { data } = await wq;
    const winnerRegIds = (data ?? [])
      .map((w: { registration_id: string }) => w.registration_id)
      .filter(Boolean);

    // For team-based comps, expand the rep registration to every member of
    // that rep's team so every teammate also receives a winner certificate.
    if (winnerRegIds.length === 0) {
      return { ok: true, recipients: [] };
    }

    const { data: regUserRows } = await supabase
      .from("hackathon_registrations")
      .select("user_id")
      .in("id", winnerRegIds);
    const winnerUserIds = (regUserRows ?? [])
      .map((r: { user_id: string }) => r.user_id)
      .filter(Boolean);

    const { data: membershipRows } = await supabase
      .from("team_members")
      .select("user_id, team_id, teams!inner(hackathon_id)")
      .in("user_id", winnerUserIds)
      .eq("teams.hackathon_id", hackathonId);

    const teamIdsForWinners = [
      ...new Set(
        (membershipRows ?? []).map((m: { team_id: string }) => m.team_id)
      ),
    ];
    const allMemberUserIds = new Set<string>(winnerUserIds);
    if (teamIdsForWinners.length > 0) {
      const { data: teamMembers } = await supabase
        .from("team_members")
        .select("user_id")
        .in("team_id", teamIdsForWinners);
      for (const m of teamMembers ?? []) {
        allMemberUserIds.add((m as { user_id: string }).user_id);
      }
    }

    const { data: regs } = await supabase
      .from("hackathon_registrations")
      .select("id")
      .eq("hackathon_id", hackathonId)
      .in("user_id", [...allMemberUserIds])
      .in("status", [...ACTIVE_STATUSES]);
    registrationIds = (regs ?? []).map((r: { id: string }) => r.id);
  } else {
    return { ok: false, error: "Invalid audience", status: 400 };
  }

  // De-dup.
  registrationIds = [...new Set(registrationIds)];

  if (registrationIds.length === 0) {
    return { ok: true, recipients: [] };
  }

  // 2. Enrich each registration with user + team + (optional) winner award.
  const { data: regsFull } = await supabase
    .from("hackathon_registrations")
    .select(
      "id, user_id, user:profiles!hackathon_registrations_user_id_fkey(id, name, email)"
    )
    .in("id", registrationIds);

  const userIds = [
    ...new Set(
      (regsFull ?? [])
        .map((r: { user_id: string }) => r.user_id)
        .filter(Boolean)
    ),
  ];

  const userTeam: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: tms } = await supabase
      .from("team_members")
      .select("user_id, teams!inner(name, hackathon_id)")
      .in("user_id", userIds)
      .eq("teams.hackathon_id", hackathonId);
    for (const m of tms ?? []) {
      const row = m as Record<string, unknown>;
      const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
      if (team) {
        userTeam[row.user_id as string] = (team as { name: string }).name;
      }
    }
  }

  // Winners (used for award placeholder if audience='winners')
  const winnerAward: Record<string, string> = {};
  if (audience === "winners") {
    const { data: winners } = await supabase
      .from("competition_winners")
      .select("registration_id, award_label, registration:hackathon_registrations!competition_winners_registration_id_fkey(user_id)")
      .eq("hackathon_id", hackathonId);
    // Map the award to every team member of the rep registration's user.
    const regUserMap = new Map<string, string>();
    for (const r of regsFull ?? []) {
      regUserMap.set((r as { id: string; user_id: string }).id, (r as { user_id: string }).user_id);
    }
    for (const w of winners ?? []) {
      const row = w as Record<string, unknown>;
      const reg = Array.isArray(row.registration) ? row.registration[0] : row.registration;
      const repUserId = reg && (reg as { user_id?: string }).user_id;
      if (!repUserId) continue;
      // Find the rep's team, then label every teammate's recipient row.
      const team = userTeam[repUserId];
      const label = row.award_label as string;
      if (team) {
        for (const [uid, tname] of Object.entries(userTeam)) {
          if (tname === team) winnerAward[uid] = label;
        }
      } else {
        winnerAward[repUserId] = label;
      }
    }
  }

  const recipients: Recipient[] = [];
  for (const reg of regsFull ?? []) {
    const r = reg as { id: string; user_id: string };
    const u = Array.isArray((reg as { user?: unknown }).user)
      ? ((reg as { user?: unknown[] }).user as unknown[])[0]
      : (reg as { user?: unknown }).user;
    const user = (u as { name?: string; email?: string } | null) || null;
    if (!user?.email) continue;
    recipients.push({
      registrationId: r.id,
      userId: r.user_id,
      email: user.email,
      name: user.name || "Participant",
      teamName: userTeam[r.user_id] || null,
      awardLabel: winnerAward[r.user_id] || null,
    });
  }

  return { ok: true, recipients };
}

function applyPlaceholders(
  text: string,
  ctx: Record<string, string>
): string {
  let out = text;
  for (const [k, v] of Object.entries(ctx)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

// ── POST — bulk send certificates ─────────────────────────
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, templateId } = await params;
    if (!UUID_RE.test(hackathonId) || !UUID_RE.test(templateId)) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
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

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    const access = await checkHackathonAccess(supabase, hackathonId, auth.userId);
    if (!access.hasAccess || !canEdit(access.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Bulk sending shares the email rate limit budget — 3 blasts per hour.
    const rl = checkRateLimit(auth.userId, {
      namespace: "hackathon-cert-send",
      limit: 3,
      windowMs: 60 * 60 * 1000,
    });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many certificate blasts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
        }
      );
    }

    const admin = getSupabaseAdminClient();

    const { data: template, error: tErr } = await admin
      .from("certificate_templates")
      .select("*")
      .eq("id", templateId)
      .eq("hackathon_id", hackathonId)
      .maybeSingle();

    if (tErr || !template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const { data: hackathon } = await admin
      .from("hackathons")
      .select("name, slug, organizer:profiles!organizer_id(name)")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }

    let body: AudienceBody;
    try {
      body = (await request.json()) as AudienceBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body.subject || typeof body.subject !== "string" || body.subject.length > 500) {
      return NextResponse.json(
        { error: "subject is required (max 500 chars)" },
        { status: 400 }
      );
    }
    if (!body.body || typeof body.body !== "string" || body.body.length > 50000) {
      return NextResponse.json(
        { error: "body is required (max 50000 chars)" },
        { status: 400 }
      );
    }

    const recipientsResult = await resolveRecipients(admin, hackathonId, body);
    if (!recipientsResult.ok) {
      return NextResponse.json(
        { error: recipientsResult.error },
        { status: recipientsResult.status }
      );
    }
    const recipients = recipientsResult.recipients;

    if (recipients.length === 0) {
      return NextResponse.json({
        data: { sent: 0, failed: 0, total: 0, message: "No recipients matched the audience filter." },
      });
    }

    if (recipients.length > MAX_RECIPIENTS) {
      return NextResponse.json(
        { error: `Too many recipients (${recipients.length}). Cap is ${MAX_RECIPIENTS} per blast.` },
        { status: 400 }
      );
    }

    // Fetch the source PDF once and re-use the buffer for every recipient so
    // we don't hammer Cloudinary with N requests.
    let templatePdfBytes: Uint8Array;
    try {
      templatePdfBytes = await fetchTemplatePdfBytes(template.pdf_url as string);
    } catch (err) {
      console.error("Failed to fetch template PDF:", err);
      return NextResponse.json(
        { error: "Failed to load the template PDF. Re-upload it and try again." },
        { status: 502 }
      );
    }

    const siteUrl = getSiteUrl(request);
    const hackathonName = hackathon.name as string;
    const hackathonSlug = (hackathon.slug as string) || hackathonId;
    const organizer = Array.isArray(hackathon.organizer) ? hackathon.organizer[0] : hackathon.organizer;
    const organizerName = (organizer as { name?: string } | null)?.name || "Organizer";

    let sent = 0;
    let failed = 0;
    const sendsLog: Record<string, unknown>[] = [];

    // sendEmail in lib/resend has no attachments API, so we call Resend
    // directly here (lazy-imported so the route doesn't blow up at import
    // time when RESEND_API_KEY is missing in some environments).
    const { Resend } = await import("resend");
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      );
    }
    const resend = new Resend(resendKey);
    const FROM = "CloudHub by Lunar Limited <noreply@1i1.ae>";

    for (const recipient of recipients) {
      const verificationCode = `CERT-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

      const placeholderCtx: Record<string, string> = {
        recipient_name: recipient.name,
        recipient_email: recipient.email,
        team_name: recipient.teamName || recipient.name,
        award_label: recipient.awardLabel || "",
        hackathon_name: hackathonName,
        organizer_name: organizerName,
        hackathon_url: `${siteUrl}/hackathons/${hackathonSlug}`,
        verification_code: verificationCode,
        verification_url: `${siteUrl}/certificates/verify/${verificationCode}`,
        issued_date: new Date().toLocaleDateString(),
      };

      let pdfBytes: Uint8Array;
      try {
        pdfBytes = await renderCertificatePdf({
          baseBytes: templatePdfBytes,
          name: recipient.name,
          pageWidth: Number(template.page_width),
          pageHeight: Number(template.page_height),
          nameBox: template.name_box as Record<string, unknown>,
        });
      } catch (renderErr) {
        failed++;
        sendsLog.push({
          hackathon_id: hackathonId,
          template_id: templateId,
          registration_id: recipient.registrationId,
          recipient_user_id: recipient.userId,
          recipient_email: recipient.email,
          recipient_name: recipient.name,
          burnt_payload: placeholderCtx,
          status: "failed",
          error: renderErr instanceof Error ? renderErr.message : "render error",
          sent_by: auth.userId,
        });
        continue;
      }

      const finalSubject = applyPlaceholders(body.subject, placeholderCtx)
        .replace(/[\r\n]/g, " ")
        .trim()
        .slice(0, 998);
      const finalBody = applyPlaceholders(body.body, placeholderCtx);

      const html = emailWrapper(`
        <div style="padding:28px 32px;">
          <p style="color:#e4e4e7;font-size:15px;line-height:1.7;margin:0 0 16px;">
            Hi <strong style="color:#ffffff;">${escapeHtml(recipient.name)}</strong>,
          </p>
          <div style="color:#e4e4e7;font-size:15px;line-height:1.7;margin:0 0 16px;">
            ${escapeHtml(finalBody).replace(/\n/g, "<br/>")}
          </div>
          <div style="padding:14px 18px;background:#1a1a20;border-radius:10px;border:1px solid #27272a;margin:0 0 20px;">
            <p style="margin:0;color:#a1a1aa;font-size:13px;line-height:1.6;">
              Your certificate is attached to this email as a PDF. Verification code:
              <code style="color:#ffffff;background:#27272a;padding:2px 6px;border-radius:4px;font-family:monospace;">${escapeHtml(verificationCode)}</code>
            </p>
          </div>
          <div style="text-align:center;padding:8px 0;">
            <a href="${siteUrl}/hackathons/${hackathonSlug}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#e8440a,#ff5722);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">
              View Competition
            </a>
          </div>
        </div>
      `);

      try {
        const fileName = `${hackathonName.replace(/[^A-Za-z0-9-_]+/g, "_")}-certificate.pdf`.slice(0, 100);
        const attachmentContent = Buffer.from(pdfBytes).toString("base64");

        const { error: sendErr } = await resend.emails.send({
          from: FROM,
          to: recipient.email,
          subject: finalSubject,
          html,
          attachments: [
            {
              filename: fileName,
              content: attachmentContent,
            },
          ],
        });

        if (sendErr) {
          failed++;
          sendsLog.push({
            hackathon_id: hackathonId,
            template_id: templateId,
            registration_id: recipient.registrationId,
            recipient_user_id: recipient.userId,
            recipient_email: recipient.email,
            recipient_name: recipient.name,
            burnt_payload: placeholderCtx,
            status: "failed",
            error: typeof sendErr === "object" && sendErr !== null && "message" in sendErr
              ? String((sendErr as { message: unknown }).message)
              : "Resend error",
            sent_by: auth.userId,
          });
        } else {
          sent++;
          sendsLog.push({
            hackathon_id: hackathonId,
            template_id: templateId,
            registration_id: recipient.registrationId,
            recipient_user_id: recipient.userId,
            recipient_email: recipient.email,
            recipient_name: recipient.name,
            burnt_payload: placeholderCtx,
            status: "sent",
            sent_by: auth.userId,
          });

          // Also issue a verifiable record in the existing certificates table
          // so it surfaces in the recipient's "My Certificates" page.
          if (recipient.userId) {
            admin
              .from("certificates")
              .insert({
                user_id: recipient.userId,
                hackathon_id: hackathonId,
                type: (template.cert_type as string) || "participation",
                title: applyPlaceholders(`${hackathonName} Certificate`, placeholderCtx).slice(0, 200),
                description: recipient.awardLabel
                  ? `Awarded "${recipient.awardLabel}" at ${hackathonName}`
                  : `Participation in ${hackathonName}`,
                verification_code: verificationCode,
                template: { template_id: templateId },
                metadata: {
                  award_label: recipient.awardLabel,
                  team_name: recipient.teamName,
                  organizer_name: organizerName,
                },
              })
              .then(() => {}, () => {});
          }
        }
      } catch (err) {
        failed++;
        sendsLog.push({
          hackathon_id: hackathonId,
          template_id: templateId,
          registration_id: recipient.registrationId,
          recipient_user_id: recipient.userId,
          recipient_email: recipient.email,
          recipient_name: recipient.name,
          burnt_payload: placeholderCtx,
          status: "failed",
          error: err instanceof Error ? err.message : "send threw",
          sent_by: auth.userId,
        });
      }

      // Resend hard rate-limits at ~2 req/s on most plans; pause briefly so a
      // 300-person blast doesn't trip 429s. Skip the wait on the last one.
      if (recipient !== recipients[recipients.length - 1]) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    if (sendsLog.length > 0) {
      admin
        .from("certificate_sends")
        .insert(sendsLog)
        .then(() => {}, (e: unknown) => {
          console.error("Failed to log certificate sends:", e);
        });
    }

    return NextResponse.json({
      data: {
        sent,
        failed,
        total: recipients.length,
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
