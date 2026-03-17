import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { UUID_RE } from "@/lib/constants";

/**
 * Public endpoint: returns per-option fill counts for the quota-linked field
 * so the registration form can show quota status.
 *
 * Only returns data when quotaEnforcement is "registration".
 * Never exposes screening-internal data (softFlagMessages, rejectionMessages).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid hackathon ID" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("screening_config")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    const config = (hackathon.screening_config as Record<string, unknown>) || {};
    const quotaFieldId = config.quotaFieldId as string | undefined;
    const quotaEnforcement = (config.quotaEnforcement as string) || "screening";
    const quotas = (config.quotas as { campus: string; quota: number; rejected?: boolean; softFlagged?: boolean }[]) || [];

    // Only expose quota data when enforcement is "registration".
    // In "screening" mode, the form should not show fill counts.
    if (quotaEnforcement !== "registration" || !quotaFieldId || quotas.length === 0) {
      return NextResponse.json({
        quotaFieldId: null,
        quotas: {},
        fills: {},
        rejected: {},
        quotaEnforcement,
      });
    }

    // Count registrations per field value (exclude cancelled/rejected/etc)
    const { data: registrations } = await supabase
      .from("hackathon_registrations")
      .select("form_data")
      .eq("hackathon_id", hackathonId)
      .not("status", "in", '("cancelled","rejected","ineligible","declined","withdrawn")');

    const fills: Record<string, number> = {};
    if (registrations) {
      for (const reg of registrations) {
        const formData = reg.form_data as Record<string, unknown> | null;
        if (formData) {
          const fieldValue = String(formData[quotaFieldId] || "");
          if (fieldValue) {
            fills[fieldValue] = (fills[fieldValue] || 0) + 1;
          }
        }
      }
    }

    // Build public-safe quota map — only expose quotas and whether an option is rejected.
    // Never expose rejectionMessages, softFlagMessages, or softFlagged status to public.
    const quotaMap: Record<string, number> = {};
    const rejected: Record<string, boolean> = {};
    for (const q of quotas) {
      quotaMap[q.campus] = q.quota;
      if (q.rejected) {
        rejected[q.campus] = true;
      }
    }

    return NextResponse.json({
      quotaFieldId,
      quotas: quotaMap,
      fills,
      rejected,
      quotaEnforcement,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
