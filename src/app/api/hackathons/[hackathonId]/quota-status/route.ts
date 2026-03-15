import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Public endpoint: returns per-option fill counts for the quota-linked field
 * so the registration form can show quota status (full options are waitlisted, not disabled).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;
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
    const quotas = (config.quotas as { campus: string; quota: number; rejected?: boolean; rejectionMessage?: string; softFlagged?: boolean; softFlagMessage?: string }[]) || [];

    if (!quotaFieldId || quotas.length === 0) {
      return NextResponse.json({ quotaFieldId: null, quotas: {}, fills: {}, rejected: {}, rejectionMessages: {}, softFlagged: {}, softFlagMessages: {} });
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

    // Build quota map, rejected map, and soft flag map
    const quotaMap: Record<string, number> = {};
    const rejected: Record<string, boolean> = {};
    const rejectionMessages: Record<string, string> = {};
    const softFlagged: Record<string, boolean> = {};
    const softFlagMessages: Record<string, string> = {};
    for (const q of quotas) {
      quotaMap[q.campus] = q.quota;
      if (q.rejected) {
        rejected[q.campus] = true;
        if (q.rejectionMessage) {
          rejectionMessages[q.campus] = q.rejectionMessage;
        }
      }
      if (q.softFlagged && !q.rejected) {
        softFlagged[q.campus] = true;
        if (q.softFlagMessage) {
          softFlagMessages[q.campus] = q.softFlagMessage;
        }
      }
    }

    return NextResponse.json({
      quotaFieldId,
      quotas: quotaMap,
      fills,
      rejected,
      rejectionMessages,
      softFlagged,
      softFlagMessages,
      quotaEnforcement: (config.quotaEnforcement as string) || "screening",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
