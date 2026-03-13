import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbRowToCommunity } from "@/lib/supabase/mappers";
import { slugify } from "@/lib/utils";
import { UUID_RE } from "@/lib/constants";
import { authenticateRequest, assertScope } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const auth = await authenticateRequest(request);

    const hasBearer = request.headers.get("authorization")?.startsWith("Bearer ");
    if (hasBearer && auth.type === "unauthenticated") {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/communities");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    const search = searchParams.get("search");
    const tags = searchParams.get("tags");
    const organizerId = searchParams.get("organizerId");
    const sortBy = searchParams.get("sortBy") || "newest";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20") || 20));

    if (organizerId && !UUID_RE.test(organizerId)) {
      return NextResponse.json({ error: "Invalid organizerId format" }, { status: 400 });
    }

    let query = supabase
      .from("communities")
      .select("*, organizer:profiles!organizer_id(*)", { count: "exact" });

    if (search) {
      const safe = search.replace(/[%_,.()\\]/g, (c) => `\\${c}`);
      query = query.or(
        `name.ilike.%${safe}%,description.ilike.%${safe}%`
      );
    }

    if (tags) {
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        query = query.overlaps("tags", tagList);
      }
    }

    if (organizerId) {
      query = query.eq("organizer_id", organizerId);
    }

    // Only show public communities unless viewing own
    let authUserId: string | null = null;
    if (organizerId) {
      if (auth.type === "api_key") {
        authUserId = auth.userId;
      } else if (auth.type === "session") {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        authUserId = authUser?.id ?? null;
      }
    }
    const isOwnCommunities = organizerId && authUserId === organizerId;

    if (!isOwnCommunities) {
      query = query.eq("visibility", "public");
    }

    // Only show active communities (unless own)
    if (!isOwnCommunities) {
      query = query.eq("status", "active");
    }

    // Sorting
    switch (sortBy) {
      case "members":
        query = query.order("member_count", { ascending: false });
        break;
      case "name":
        query = query.order("name", { ascending: true });
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
      console.error("Failed to fetch communities:", error.message);
      return NextResponse.json({ error: "Failed to fetch communities" }, { status: 400 });
    }

    const communities = (data || []).map((row: Record<string, unknown>) =>
      dbRowToCommunity(row)
    );

    const cacheHeaders: Record<string, string> = isOwnCommunities
      ? { "Cache-Control": "private, no-store" }
      : { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };

    return NextResponse.json(
      {
        data: communities,
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
    const auth = await authenticateRequest(request);

    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/communities");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    const body = await request.json();

    // Validate required name
    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (body.name.length > 200) {
      return NextResponse.json({ error: "name must be under 200 characters" }, { status: 400 });
    }

    // Generate unique slug
    let slug = slugify(body.name);
    const { data: existing } = await supabase
      .from("communities")
      .select("slug")
      .like("slug", `${slug}%`);
    if (existing && existing.length > 0) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Allowlist fields
    const COMMUNITY_FIELDS = [
      "name", "description", "logo", "cover_image", "coverImage",
      "website", "visibility", "tags", "socials",
    ];
    const insertData: Record<string, unknown> = {
      slug,
      organizer_id: auth.userId,
      status: "active",
    };
    for (const key of COMMUNITY_FIELDS) {
      if (key in body) {
        // Normalize camelCase to snake_case
        const dbKey = key === "coverImage" ? "cover_image" : key;
        insertData[dbKey] = body[key];
      }
    }

    // Validate visibility
    if (insertData.visibility) {
      if (!["public", "private"].includes(insertData.visibility as string)) {
        return NextResponse.json({ error: "Invalid visibility. Must be public or private." }, { status: 400 });
      }
    }

    // Validate tags
    if (insertData.tags && (!Array.isArray(insertData.tags) || (insertData.tags as string[]).length > 20)) {
      return NextResponse.json({ error: "Tags must be an array of up to 20 items" }, { status: 400 });
    }

    // Validate socials is an object
    if (insertData.socials && (typeof insertData.socials !== "object" || Array.isArray(insertData.socials))) {
      return NextResponse.json({ error: "socials must be a JSON object" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("communities")
      .insert(insertData)
      .select("*, organizer:profiles!organizer_id(*)")
      .single();

    if (error) {
      console.error("Failed to create community:", error.message);
      return NextResponse.json({ error: "Failed to create community" }, { status: 400 });
    }

    // Auto-create organizer as admin member
    const { error: memberError } = await supabase
      .from("community_members")
      .insert({
        community_id: data.id,
        user_id: auth.userId,
        role: "admin",
      });

    if (memberError) {
      console.error("Failed to add organizer as member:", memberError.message);
    }

    // Update member count
    await supabase
      .from("communities")
      .update({ member_count: 1 })
      .eq("id", data.id);

    return NextResponse.json({
      data: dbRowToCommunity(data as Record<string, unknown>),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
