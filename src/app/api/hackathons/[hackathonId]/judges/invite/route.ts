import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { sendEmail, emailWrapper } from "@/lib/resend";

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

    // Verify caller is the hackathon organizer and get hackathon details
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id, name, slug")
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

    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: "email and name are required" },
        { status: 400 }
      );
    }

    // Upsert into judge_invitations — regenerate token if re-inviting
    const { data: invitation, error: insertError } = await supabase
      .from("judge_invitations")
      .upsert(
        {
          hackathon_id: hackathonId,
          email: email.toLowerCase().trim(),
          name,
          token: crypto.randomUUID(),
          status: "pending",
        },
        { onConflict: "hackathon_id,email" }
      )
      .select("token")
      .single();

    if (insertError || !invitation) {
      return NextResponse.json(
        { error: insertError?.message || "Failed to create invitation" },
        { status: 500 }
      );
    }

    const token = invitation.token as string;
    const hackathonName = hackathon.name as string;
    const judgeUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/judge/${hackathonId}?token=${token}`;

    await sendEmail({
      to: email,
      subject: `You're Invited to Judge ${hackathonName}`,
      html: emailWrapper(`
        <h1 style="margin:0 0 16px;color:#fff;font-size:24px;font-weight:700;">
          You're Invited to Judge!
        </h1>
        <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 8px;">
          Hi <strong style="color:#fff;">${name}</strong>,
        </p>
        <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 24px;">
          You've been invited to serve as a judge for
          <strong style="color:#e8440a;">${hackathonName}</strong>.
          We'd love your expertise to help evaluate the amazing projects
          our participants have built.
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${judgeUrl}"
             style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#e8440a,#d946a8);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">
            Accept Invitation
          </a>
        </div>
        <p style="color:#a1a1aa;font-size:13px;line-height:1.5;margin:0;">
          Click the button above or copy this link into your browser:<br/>
          <a href="${judgeUrl}" style="color:#e8440a;text-decoration:underline;word-break:break-all;">${judgeUrl}</a>
        </p>
      `),
    });

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}`,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
