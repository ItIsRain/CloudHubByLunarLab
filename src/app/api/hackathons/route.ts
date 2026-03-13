import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbRowToHackathon } from "@/lib/supabase/mappers";
import { slugify } from "@/lib/utils";
import { UUID_RE, categories } from "@/lib/constants";
import { canCreateHackathon, getHackathonLimit } from "@/lib/plan-limits";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import type { SubscriptionTier } from "@/lib/types";
import { getCurrentPhase, rowToTimeline } from "@/lib/hackathon-phases";
import { writeAuditLog } from "@/lib/audit";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Dual auth: session cookies OR API key
    const auth = await authenticateRequest(request);

    // If a Bearer token was provided but invalid, reject immediately
    const hasBearer = request.headers.get("authorization")?.startsWith("Bearer ");
    if (hasBearer && auth.type === "unauthenticated") {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // For API key auth, verify the "hackathons" scope
    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    // API key requests use admin client (no session cookies);
    // session requests use the regular server client
    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const featured = searchParams.get("featured");
    const organizerId = searchParams.get("organizerId");
    const sortBy = searchParams.get("sortBy") || "newest";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20") || 20));

    // Validate organizerId format if provided
    if (organizerId && !UUID_RE.test(organizerId)) {
      return NextResponse.json({ error: "Invalid organizerId format" }, { status: 400 });
    }

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

    // Visibility filtering
    // For API key auth, use auth.userId directly; for session auth, call getUser()
    let authUserId: string | null = null;
    if (organizerId) {
      if (auth.type === "api_key") {
        authUserId = auth.userId;
      } else if (auth.type === "session") {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        authUserId = authUser?.id ?? null;
      }
    }
    const isOwnHackathons = organizerId && authUserId === organizerId;

    if (!isOwnHackathons) {
      const idsParam = searchParams.get("ids");
      if (idsParam && auth.type === "session") {
        // bookmarks (session only): include unlisted, hide private
        query = query.neq("visibility", "private");
      } else {
        // explore / API key / other user's profile: only public
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
      console.error("Failed to fetch hackathons:", error.message);
      return NextResponse.json({ error: "Failed to fetch hackathons" }, { status: 400 });
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

    // Only use public cache headers when response contains exclusively public data
    const cacheHeaders: Record<string, string> = isOwnHackathons
      ? { "Cache-Control": "private, no-store" }
      : { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };

    return NextResponse.json(
      {
        data: hackathons,
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
    // Dual auth: session cookies OR API key
    const auth = await authenticateRequest(request);

    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    // Check plan limits and organizer role
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, roles")
      .eq("id", auth.userId)
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
      .eq("organizer_id", auth.userId)
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
      "tags", "type", "status", "visibility", "location",
      "min_team_size", "max_team_size", "allow_solo", "total_prize_pool",
      "registration_start", "registration_end", "hacking_start", "hacking_end",
      "submission_deadline", "judging_start", "judging_end", "winners_announcement",
      "tracks", "prizes", "rules", "eligibility", "requirements", "resources", "sponsors",
      "faqs", "schedule", "judges", "mentors", "judging_criteria",
    ];
    const insertData: Record<string, unknown> = {
      slug,
      organizer_id: auth.userId,
    };
    for (const key of HACK_FIELDS) {
      if (key in body) insertData[key] = body[key];
    }

    // Validate enum fields
    const VALID_CATEGORIES = categories.map((c) => c.value);
    if (insertData.category && !VALID_CATEGORIES.includes(insertData.category as string)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    const VALID_TYPES = ["in-person", "virtual", "hybrid"];
    if (insertData.type && !VALID_TYPES.includes(insertData.type as string)) {
      return NextResponse.json({ error: "Invalid hackathon type" }, { status: 400 });
    }

    // Validate status (only draft or published on create)
    if (insertData.status) {
      if (!["draft", "published"].includes(insertData.status as string)) {
        return NextResponse.json(
          { error: 'Hackathons can only be created with status "draft" or "published"' },
          { status: 400 }
        );
      }
    }

    // Validate visibility
    if (insertData.visibility) {
      if (!["public", "unlisted", "private"].includes(insertData.visibility as string)) {
        return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
      }
    }

    // Validate tags
    if (insertData.tags && (!Array.isArray(insertData.tags) || (insertData.tags as string[]).length > 20)) {
      return NextResponse.json({ error: "Tags must be an array of up to 20 items" }, { status: 400 });
    }

    // Validate total_prize_pool
    if (insertData.total_prize_pool !== undefined) {
      if (typeof insertData.total_prize_pool !== "number" || (insertData.total_prize_pool as number) < 0) {
        return NextResponse.json({ error: "total_prize_pool must be a non-negative number" }, { status: 400 });
      }
    }

    // Validate team sizes
    if (insertData.min_team_size !== undefined) {
      if (typeof insertData.min_team_size !== "number" || !Number.isInteger(insertData.min_team_size) || (insertData.min_team_size as number) < 1) {
        return NextResponse.json({ error: "min_team_size must be a positive integer" }, { status: 400 });
      }
    }
    if (insertData.max_team_size !== undefined) {
      if (typeof insertData.max_team_size !== "number" || !Number.isInteger(insertData.max_team_size) || (insertData.max_team_size as number) < 1) {
        return NextResponse.json({ error: "max_team_size must be a positive integer" }, { status: 400 });
      }
    }
    if (insertData.min_team_size !== undefined && insertData.max_team_size !== undefined) {
      if ((insertData.min_team_size as number) > (insertData.max_team_size as number)) {
        return NextResponse.json({ error: "min_team_size cannot exceed max_team_size" }, { status: 400 });
      }
    }

    // Validate date formats for all timeline fields
    const DATE_FIELDS = [
      "registration_start", "registration_end", "hacking_start", "hacking_end",
      "submission_deadline", "judging_start", "judging_end", "winners_announcement",
    ];
    for (const field of DATE_FIELDS) {
      if (insertData[field] !== undefined) {
        if (typeof insertData[field] !== "string" || !ISO_DATE_RE.test(insertData[field] as string) || isNaN(Date.parse(insertData[field] as string))) {
          return NextResponse.json({ error: `Invalid ${field} format. Use ISO 8601.` }, { status: 400 });
        }
      }
    }

    // Validate date chronology across the timeline
    const dates: Record<string, Date> = {};
    for (const field of DATE_FIELDS) {
      if (insertData[field]) dates[field] = new Date(insertData[field] as string);
    }
    if (dates.registration_start && dates.registration_end && dates.registration_start >= dates.registration_end) {
      return NextResponse.json({ error: "registration_end must be after registration_start" }, { status: 400 });
    }
    if (dates.hacking_start && dates.hacking_end && dates.hacking_start >= dates.hacking_end) {
      return NextResponse.json({ error: "hacking_end must be after hacking_start" }, { status: 400 });
    }
    if (dates.hacking_end && dates.submission_deadline && dates.submission_deadline < dates.hacking_end) {
      return NextResponse.json({ error: "submission_deadline must be on or after hacking_end" }, { status: 400 });
    }
    if (dates.judging_start && dates.judging_end && dates.judging_start >= dates.judging_end) {
      return NextResponse.json({ error: "judging_end must be after judging_start" }, { status: 400 });
    }

    // Prevent publishing without required timeline dates
    if (insertData.status === "published") {
      if (!insertData.hacking_start || !insertData.hacking_end || !insertData.submission_deadline) {
        return NextResponse.json(
          { error: "hacking_start, hacking_end, and submission_deadline are required before publishing" },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from("hackathons")
      .insert(insertData)
      .select("*, organizer:profiles!organizer_id(*), teams(count), submissions(count)")
      .single();

    if (error) {
      console.error("Failed to create hackathon:", error.message);
      return NextResponse.json({ error: "Failed to create hackathon" }, { status: 400 });
    }

    await writeAuditLog({
      actorId: auth.userId,
      action: "create",
      entityType: "hackathon",
      entityId: data.id as string,
      newValues: { title: body.title, status: insertData.status || "draft" },
    }, request);

    return NextResponse.json({
      data: dbRowToHackathon(data as Record<string, unknown>),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
