import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { authenticateRequest, assertScope, hasApiKeyHeader } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    // Dual auth: public access allowed, but API key requests must have analytics scope
    const auth = await authenticateRequest(request);

    // If an API key header was provided but invalid, reject immediately
    if (hasApiKeyHeader(request) && auth.type === "unauthenticated") {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // For API key auth, verify the "analytics" scope
    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/stats");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    // API key requests use admin client; otherwise use server client
    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    const [eventsRes, hackathonsRes, attendeesRes, prizesRes] =
      await Promise.all([
        supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("visibility", "public"),
        supabase
          .from("hackathons")
          .select("id", { count: "exact", head: true })
          .eq("visibility", "public"),
        supabase
          .from("events")
          .select("registration_count")
          .eq("visibility", "public"),
        supabase
          .from("hackathons")
          .select("total_prize_pool")
          .eq("visibility", "public"),
      ]);

    const eventsHosted = eventsRes.count || 0;
    const hackathonsHosted = hackathonsRes.count || 0;

    const totalAttendees = (attendeesRes.data || []).reduce(
      (sum, row) => sum + ((row.registration_count as number) || 0),
      0
    );

    const totalPrizePool = (prizesRes.data || []).reduce(
      (sum, row) => sum + ((row.total_prize_pool as number) || 0),
      0
    );

    return NextResponse.json(
      {
        data: {
          eventsHosted,
          totalAttendees,
          hackathonsHosted,
          totalPrizePool,
        },
      },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
