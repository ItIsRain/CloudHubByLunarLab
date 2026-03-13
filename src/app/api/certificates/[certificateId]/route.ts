import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToCertificate } from "@/lib/supabase/mappers";
import { UUID_RE } from "@/lib/constants";

/**
 * GET /api/certificates/[certificateId]
 * Get a single certificate. Public access for verification purposes.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ certificateId: string }> }
) {
  try {
    const { certificateId } = await params;

    if (!certificateId || !UUID_RE.test(certificateId)) {
      return NextResponse.json(
        { error: "Invalid certificate ID format" },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase
      .from("certificates")
      .select(
        "*, user:profiles!certificates_user_id_fkey(name, username, avatar), event:events!certificates_event_id_fkey(title, slug), hackathon:hackathons!certificates_hackathon_id_fkey(name, slug)"
      )
      .eq("id", certificateId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: dbRowToCertificate(data as Record<string, unknown>),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
