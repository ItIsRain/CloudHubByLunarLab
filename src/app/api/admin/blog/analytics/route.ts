import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/admin/blog/analytics
 * Returns aggregated engagement analytics for all blog posts.
 * Admin-only endpoint.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();

    // Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("roles")
      .eq("id", user.id)
      .single();

    const roles = (profile?.roles as string[]) || [];
    if (!roles.includes("admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = getSupabaseAdminClient();

    // Fetch aggregated analytics from the view
    const { data: analytics, error: analyticsError } = await admin
      .from("blog_analytics")
      .select("*")
      .order("view_count", { ascending: false });

    if (analyticsError) {
      console.error("Failed to fetch blog analytics:", analyticsError.message);
      return NextResponse.json(
        { error: "Failed to fetch analytics" },
        { status: 400 }
      );
    }

    // Fetch daily engagement data for the last 30 days (for chart)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Group engagements by day for the last 30 days
    let dailyEngagement: { date: string; views: number; visitors: number }[] =
      [];

    {
      const { data: rawEngagements } = await admin
        .from("blog_engagements")
        .select("created_at, session_id")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (rawEngagements) {
        const dayMap = new Map<string, Set<string>>();
        for (const e of rawEngagements) {
          const day = (e.created_at as string).slice(0, 10);
          if (!dayMap.has(day)) dayMap.set(day, new Set());
          dayMap.get(day)!.add(e.session_id as string);
        }
        dailyEngagement = Array.from(dayMap.entries()).map(
          ([date, sessions]) => ({
            date,
            views: sessions.size,
            visitors: sessions.size,
          })
        );
      }
    }

    // Compute totals
    const totals = (analytics || []).reduce(
      (acc, post) => {
        acc.totalViews += (post.view_count as number) || 0;
        acc.totalVisitors += (post.unique_visitors as number) || 0;
        acc.totalShares += (post.share_count as number) || 0;
        acc.totalRelatedClicks += (post.related_clicks as number) || 0;
        acc.avgTimeOnPage += (post.avg_time_on_page as number) || 0;
        acc.avgScrollDepth += (post.avg_scroll_depth as number) || 0;
        acc.avgReadCompletion += (post.avg_read_completion as number) || 0;
        acc.count += 1;
        return acc;
      },
      {
        totalViews: 0,
        totalVisitors: 0,
        totalShares: 0,
        totalRelatedClicks: 0,
        avgTimeOnPage: 0,
        avgScrollDepth: 0,
        avgReadCompletion: 0,
        count: 0,
      }
    );

    if (totals.count > 0) {
      totals.avgTimeOnPage = Math.round(totals.avgTimeOnPage / totals.count);
      totals.avgScrollDepth = Math.round(totals.avgScrollDepth / totals.count);
      totals.avgReadCompletion = Math.round(
        totals.avgReadCompletion / totals.count
      );
    }

    // Fetch top referrers
    const { data: referrerData } = await admin
      .from("blog_engagements")
      .select("referrer")
      .not("referrer", "is", null)
      .not("referrer", "eq", "")
      .limit(500);

    const referrerCounts = new Map<string, number>();
    if (referrerData) {
      for (const r of referrerData) {
        try {
          const host = new URL(r.referrer as string).hostname;
          referrerCounts.set(host, (referrerCounts.get(host) || 0) + 1);
        } catch {
          // Skip invalid URLs
        }
      }
    }
    const topReferrers = Array.from(referrerCounts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json(
      {
        posts: analytics || [],
        totals,
        dailyEngagement,
        topReferrers,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
