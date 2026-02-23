import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToHackathon } from "@/lib/supabase/mappers";
import { slugify } from "@/lib/utils";
import { canCreateHackathon, getHackathonLimit } from "@/lib/stripe/plan-limits";
import type { SubscriptionTier } from "@/lib/types";
import { getCurrentPhase, rowToTimeline } from "@/lib/hackathon-phases";

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
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20") || 20));

    let query = supabase
      .from("hackathons")
      .select("*, organizer:profiles!organizer_id(*), teams(count), submissions(count)", { count: "exact" });

    if (search) {
      // Escape PostgREST special characters to prevent filter injection
      const safe = search.replace(/[%_,.()\\]/g, (c) => `\\${c}`);
      query = query.or(
        `name.ilike.%${safe}%,tagline.ilike.%${safe}%,description.ilike.%${safe}%`
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
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validIds = ids.split(",").filter((id) => uuidRe.test(id)).slice(0, 50);
      if (validIds.length > 0) {
        query = query.in("id", validIds);
      } else {
        return NextResponse.json({ data: [], total: 0, page, pageSize, totalPages: 0, hasMore: false });
      }
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

    const hackathons = (data || []).map((row: Record<string, unknown>) => {
      // Compute phase in-memory based on timeline dates
      const timeline = rowToTimeline(row);
      const computedPhase = getCurrentPhase(timeline);
      const effectiveRow =
        timeline.status !== "draft" && row.status !== computedPhase
          ? { ...row, status: computedPhase }
          : row;
      return dbRowToHackathon(effectiveRow);
    });

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

    // Check plan limits and organizer role
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, roles")
      .eq("id", user.id)
      .single();

    const roles = (Array.isArray(profile?.roles) ? profile.roles : []) as string[];
    if (!roles.includes("organizer") && !roles.includes("admin")) {
      return NextResponse.json(
        { error: "Only organizers can create hackathons" },
        { status: 403 }
      );
    }

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

    // Allowlist: only permit fields organizers should set
    const HACK_FIELDS = [
      "name", "tagline", "description", "cover_image", "logo", "category",
      "tags", "type", "status", "location",
      "min_team_size", "max_team_size", "allow_solo", "total_prize_pool",
      "registration_start", "registration_end", "hacking_start", "hacking_end",
      "submission_deadline", "judging_start", "judging_end", "winners_announcement",
      "tracks", "prizes", "rules", "eligibility", "requirements", "resources", "sponsors",
      "faqs", "schedule", "judges", "mentors", "judging_criteria",
    ];
    const insertData: Record<string, unknown> = {
      slug,
      organizer_id: user.id,
    };
    for (const key of HACK_FIELDS) {
      if (key in body) insertData[key] = body[key];
    }

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
