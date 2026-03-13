import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToCertificate } from "@/lib/supabase/mappers";

/**
 * GET /api/certificates/verify/[code]
 * Public verification endpoint. Returns certificate details if valid.
 * No auth required.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code || typeof code !== "string" || code.length < 5 || code.length > 100) {
      return NextResponse.json(
        { error: "Invalid verification code format" },
        { status: 400 }
      );
    }

    // Sanitize: only allow alphanumeric and hyphens
    if (!/^[A-Za-z0-9-]+$/.test(code)) {
      return NextResponse.json(
        { error: "Invalid verification code format" },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase
      .from("certificates")
      .select(
        "*, user:profiles!certificates_user_id_fkey(name, username, avatar), event:events!certificates_event_id_fkey(title, slug), hackathon:hackathons!certificates_hackathon_id_fkey(name, slug)"
      )
      .eq("verification_code", code)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Certificate not found. The verification code may be invalid." },
        { status: 404 }
      );
    }

    const certificate = dbRowToCertificate(data as Record<string, unknown>);

    return NextResponse.json({
      data: certificate,
      verified: true,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
