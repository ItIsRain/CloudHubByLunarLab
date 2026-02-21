import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();

    const [eventsRes, hackathonsRes, attendeesRes, prizesRes] =
      await Promise.all([
        supabase
          .from("events")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("hackathons")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("events")
          .select("registration_count"),
        supabase
          .from("hackathons")
          .select("total_prize_pool"),
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

    return NextResponse.json({
      data: {
        eventsHosted,
        totalAttendees,
        hackathonsHosted,
        totalPrizePool,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
