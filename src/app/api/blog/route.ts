import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbRowToBlogPost } from "@/lib/supabase/mappers";
import { slugify } from "@/lib/utils";
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
      const scopeError = assertScope(auth, "/api/blog");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const tag = searchParams.get("tag");
    const authorId = searchParams.get("authorId");
    const status = searchParams.get("status");
    const sortBy = searchParams.get("sortBy") || "newest";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20") || 20));

    let query = supabase
      .from("blog_posts")
      .select("*, author:profiles!author_id(*)", { count: "exact" });

    if (search) {
      const safe = search.replace(/[%_,.()\\]/g, (c) => `\\${c}`);
      query = query.or(
        `title.ilike.%${safe}%,excerpt.ilike.%${safe}%`
      );
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (tag) {
      query = query.contains("tags", [tag]);
    }

    if (authorId) {
      query = query.eq("author_id", authorId);
    }

    // Status filtering - only show published to public, author can see own drafts
    if (authorId && status) {
      // When viewing own posts, allow filtering by status
      let authUserId: string | null = null;
      if (auth.type === "api_key") {
        authUserId = auth.userId;
      } else if (auth.type === "session") {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        authUserId = authUser?.id ?? null;
      }

      if (authUserId === authorId) {
        if (status !== "all") {
          query = query.eq("status", status);
        }
      } else {
        query = query.eq("status", "published");
      }
    } else {
      query = query.eq("status", "published");
    }

    // Sorting
    switch (sortBy) {
      case "popular":
        query = query.order("view_count", { ascending: false });
        break;
      case "oldest":
        query = query.order("published_at", { ascending: true, nullsFirst: false });
        break;
      case "newest":
      default:
        query = query.order("published_at", { ascending: false, nullsFirst: false });
        break;
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("Failed to fetch blog posts:", error.message);
      return NextResponse.json({ error: "Failed to fetch blog posts" }, { status: 400 });
    }

    const posts = (data || []).map((row: Record<string, unknown>) =>
      dbRowToBlogPost(row)
    );

    const isOwnPosts = authorId && auth.type !== "unauthenticated" && authorId === auth.userId;
    const cacheHeaders: Record<string, string> = isOwnPosts
      ? { "Cache-Control": "private, no-store" }
      : { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };

    return NextResponse.json(
      {
        data: posts,
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
      const scopeError = assertScope(auth, "/api/blog");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    const body = await request.json();

    // Validate required title
    if (!body.title || typeof body.title !== "string" || body.title.trim().length === 0) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (body.title.length > 300) {
      return NextResponse.json({ error: "title must be under 300 characters" }, { status: 400 });
    }

    // Validate content
    if (!body.content || typeof body.content !== "string" || body.content.trim().length === 0) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    // Generate unique slug from title
    let slug = slugify(body.title);
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("slug")
      .like("slug", `${slug}%`);
    if (existing && existing.length > 0) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Calculate read time (rough: ~200 words per minute)
    const wordCount = body.content.replace(/<[^>]*>/g, "").split(/\s+/).length;
    const readTime = Math.max(1, Math.round(wordCount / 200));

    // Allowlist fields
    const insertData: Record<string, unknown> = {
      slug,
      author_id: auth.userId,
      title: body.title.trim(),
      excerpt: (body.excerpt || "").trim(),
      content: body.content,
      read_time: readTime,
      status: body.status === "published" ? "published" : "draft",
      view_count: 0,
    };

    if (body.coverImage || body.cover_image) {
      insertData.cover_image = body.coverImage || body.cover_image;
    }

    if (body.category) {
      insertData.category = body.category;
    }

    if (body.tags) {
      if (!Array.isArray(body.tags) || body.tags.length > 20) {
        return NextResponse.json({ error: "Tags must be an array of up to 20 items" }, { status: 400 });
      }
      insertData.tags = body.tags;
    }

    // Set published_at if publishing
    if (insertData.status === "published") {
      insertData.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .insert(insertData)
      .select("*, author:profiles!author_id(*)")
      .single();

    if (error) {
      console.error("Failed to create blog post:", error.message);
      return NextResponse.json({ error: "Failed to create blog post" }, { status: 400 });
    }

    return NextResponse.json({
      data: dbRowToBlogPost(data as Record<string, unknown>),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
