import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToEvent } from "@/lib/supabase/mappers";
import { slugify } from "@/lib/utils";
import { UUID_RE, categories } from "@/lib/constants";
import { canCreateEvent, getEventLimit } from "@/lib/plan-limits";
import type { SubscriptionTier } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const featured = searchParams.get("featured");
    const organizerId = searchParams.get("organizerId");
    const sortBy = searchParams.get("sortBy") || "newest";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20") || 20));

    let query = supabase
      .from("events")
      .select("*, organizer:profiles!organizer_id(*)", { count: "exact" });

    if (search) {
      // Escape PostgREST special characters to prevent filter injection
      const safe = search.replace(/[%_,.()\\]/g, (c) => `\\${c}`);
      query = query.or(
        `title.ilike.%${safe}%,tagline.ilike.%${safe}%,description.ilike.%${safe}%`
      );
    }
    if (category) {
      const cats = category.split(",");
      query = query.in("category", cats);
    }
    if (type) {
      const types = type.split(",");
      query = query.in("type", types);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (featured === "true") {
      query = query.eq("is_featured", true);
    }
    if (organizerId) {
      query = query.eq("organizer_id", organizerId);
    }

    // Visibility filtering
    // Only call getUser() when we actually need auth context (organizer's own events)
    let user = null;
    if (organizerId) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      user = authUser;
    }
    const isOwnEvents = organizerId && user?.id === organizerId;

    if (!isOwnEvents) {
      const idsParam = searchParams.get("ids");
      if (idsParam) {
        // bookmarks: include unlisted, hide private
        query = query.neq("visibility", "private");
      } else {
        // explore / other user's profile: only public
        query = query.eq("visibility", "public");
      }
    }

    // Filter by specific IDs (for bookmarks page)
    const ids = searchParams.get("ids");
    if (ids) {
      const validIds = ids.split(",").filter((id) => UUID_RE.test(id)).slice(0, 50);
      if (validIds.length > 0) {
        query = query.in("id", validIds);
      } else {
        return NextResponse.json({ data: [], total: 0, page, pageSize, totalPages: 0, hasMore: false });
      }
    }

    // Sorting
    switch (sortBy) {
      case "date":
        query = query.order("start_date", { ascending: true, nullsFirst: false });
        break;
      case "popularity":
        query = query.order("registration_count", { ascending: false });
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
      console.error("Failed to fetch events:", error.message);
      return NextResponse.json({ error: "Failed to fetch events" }, { status: 400 });
    }

    const events = (data || []).map((row: Record<string, unknown>) =>
      dbRowToEvent(row)
    );

    // Only use public cache headers when response contains exclusively public data
    const cacheHeaders: Record<string, string> = isOwnEvents
      ? { "Cache-Control": "private, no-store" }
      : { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };

    return NextResponse.json(
      {
        data: events,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
        hasMore: from + pageSize < (count || 0),
      },
      { headers: cacheHeaders }
    );
  } catch (err) {
    console.error(err);
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
        { error: "Only organizers can create events" },
        { status: 403 }
      );
    }

    const tier = (profile?.subscription_tier as SubscriptionTier) || "free";

    // Count events created this month by this user
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: monthlyCount } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("organizer_id", user.id)
      .gte("created_at", startOfMonth.toISOString());

    if (!canCreateEvent(tier, monthlyCount || 0)) {
      const limit = getEventLimit(tier);
      return NextResponse.json(
        {
          error: `You've reached your monthly limit of ${limit} event${limit !== 1 ? "s" : ""} on the ${tier} plan. Upgrade to Pro for unlimited events.`,
          code: "PLAN_LIMIT_REACHED",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Generate unique slug
    let slug = slugify(body.title || "event");
    const { data: existing } = await supabase
      .from("events")
      .select("slug")
      .like("slug", `${slug}%`);
    if (existing && existing.length > 0) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Allowlist: only permit fields organizers should set
    const EVENT_FIELDS = [
      "title", "tagline", "description", "cover_image", "category", "tags",
      "type", "status", "visibility", "location", "start_date", "end_date", "timezone",
      "tickets", "speakers", "agenda", "faq", "capacity",
    ];
    const insertData: Record<string, unknown> = {
      slug,
      organizer_id: user.id,
    };
    for (const key of EVENT_FIELDS) {
      if (key in body) insertData[key] = body[key];
    }

    // Validate enum fields
    const VALID_CATEGORIES = categories.map((c) => c.value);
    if (insertData.category && !VALID_CATEGORIES.includes(insertData.category as string)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    const VALID_TYPES = ["in-person", "virtual", "hybrid"];
    if (insertData.type && !VALID_TYPES.includes(insertData.type as string)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }
    if (insertData.tags && (!Array.isArray(insertData.tags) || (insertData.tags as string[]).length > 20)) {
      return NextResponse.json({ error: "Tags must be an array of up to 20 items" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("events")
      .insert(insertData)
      .select("*, organizer:profiles!organizer_id(*)")
      .single();

    if (error) {
      console.error("Failed to create event:", error.message);
      return NextResponse.json({ error: "Failed to create event" }, { status: 400 });
    }

    return NextResponse.json({
      data: dbRowToEvent(data as Record<string, unknown>),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
