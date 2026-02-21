import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToHackathon } from "@/lib/supabase/mappers";
import { slugify } from "@/lib/utils";
import { canCreateHackathon, getHackathonLimit } from "@/lib/stripe/plan-limits";
import type { SubscriptionTier } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const featured = searchParams.get("featured");
    const organizerId = searchParams.get("organizerId");
    const sortBy = searchParams.get("sortBy") || "newest";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    let query = supabase
      .from("hackathons")
      .select("*, organizer:profiles!organizer_id(*), teams(count), submissions(count)", { count: "exact" });

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,tagline.ilike.%${search}%,description.ilike.%${search}%`
      );
    }
    if (category) {
      const cats = category.split(",");
      query = query.in("category", cats);
    }
    if (status) {
      const statuses = status.split(",");
      query = query.in("status", statuses);
    }
    if (featured === "true") {
      query = query.eq("is_featured", true);
    }
    if (organizerId) {
      query = query.eq("organizer_id", organizerId);
    }

    // Filter by specific IDs (for bookmarks page)
    const ids = searchParams.get("ids");
    if (ids) {
      query = query.in("id", ids.split(","));
    }

    // Sorting
    switch (sortBy) {
      case "date":
        query = query.order("hacking_start", { ascending: true, nullsFirst: false });
        break;
      case "prize":
        query = query.order("total_prize_pool", { ascending: false });
        break;
      case "participants":
        query = query.order("participant_count", { ascending: false });
        break;
      case "newest":
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const hackathons = (data || []).map((row: Record<string, unknown>) =>
      dbRowToHackathon(row)
    );

    return NextResponse.json({
      data: hackathons,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
      hasMore: from + pageSize < (count || 0),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check plan limits
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    const tier = (profile?.subscription_tier as SubscriptionTier) || "free";

    // Count hackathons created this month by this user
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: monthlyCount } = await supabase
      .from("hackathons")
      .select("id", { count: "exact", head: true })
      .eq("organizer_id", user.id)
      .gte("created_at", startOfMonth.toISOString());

    if (!canCreateHackathon(tier, monthlyCount || 0)) {
      const limit = getHackathonLimit(tier);
      return NextResponse.json(
        {
          error: `You've reached your monthly limit of ${limit} hackathon${limit !== 1 ? "s" : ""} on the ${tier} plan. Upgrade to Pro for unlimited hackathons.`,
          code: "PLAN_LIMIT_REACHED",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Generate unique slug
    let slug = slugify(body.name || "hackathon");
    const { data: existing } = await supabase
      .from("hackathons")
      .select("slug")
      .like("slug", `${slug}%`);
    if (existing && existing.length > 0) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const insertData = {
      ...body,
      slug,
      organizer_id: user.id,
    };

    // Remove fields that shouldn't be in insert
    delete insertData.id;
    delete insertData.created_at;
    delete insertData.updated_at;
    delete insertData.organizer;

    const { data, error } = await supabase
      .from("hackathons")
      .insert(insertData)
      .select("*, organizer:profiles!organizer_id(*), teams(count), submissions(count)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      data: dbRowToHackathon(data as Record<string, unknown>),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
