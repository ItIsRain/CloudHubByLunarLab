import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/invites/late/[token]
 *
 * Public — no auth required. The user has the token; they just need to know
 * which hackathon it belongs to so the UI can drop them into the right
 * registration flow.
 *
 * Returns the minimum data needed to render an invite landing page:
 *   - hackathon: { id, slug, name, tagline, coverImage }
 *   - status: "valid" | "expired" | "revoked" | "exhausted" | "not_found"
 *   - emailLock: optional email this invite is locked to
 *
 * Never returns the raw token or any details that would let a recipient
 * enumerate other invites.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token || typeof token !== "string" || token.length < 8 || token.length > 128) {
      return NextResponse.json({ status: "not_found" });
    }

    const admin = getSupabaseAdminClient();
    const { data: invite, error } = await admin
      .from("late_registration_invites")
      .select(
        "id, hackathon_id, email, max_uses, uses, expires_at, revoked_at"
      )
      .eq("token", token)
      .maybeSingle();

    if (error) {
      console.error("Late invite lookup error:", error);
      return NextResponse.json({ status: "not_found" });
    }

    if (!invite) {
      return NextResponse.json({ status: "not_found" });
    }

    let status: "valid" | "expired" | "revoked" | "exhausted" = "valid";
    if (invite.revoked_at) status = "revoked";
    else if (
      invite.expires_at &&
      new Date(invite.expires_at as string).getTime() < Date.now()
    )
      status = "expired";
    else if ((invite.uses as number) >= (invite.max_uses as number))
      status = "exhausted";

    const { data: hackathon } = await admin
      .from("hackathons")
      .select(
        "id, slug, name, tagline, cover_image, registration_close, hacking_start"
      )
      .eq("id", invite.hackathon_id as string)
      .single();

    return NextResponse.json({
      status,
      hackathon: hackathon
        ? {
            id: hackathon.id,
            slug: hackathon.slug,
            name: hackathon.name,
            tagline: hackathon.tagline,
            coverImage: hackathon.cover_image,
            registrationClose: hackathon.registration_close,
            hackingStart: hackathon.hacking_start,
          }
        : null,
      emailLock: invite.email ?? null,
    });
  } catch (err) {
    console.error("Late invite check error:", err);
    return NextResponse.json({ status: "not_found" });
  }
}
