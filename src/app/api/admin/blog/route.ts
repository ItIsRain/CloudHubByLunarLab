import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbRowToBlogPost } from "@/lib/supabase/mappers";
import { slugify } from "@/lib/utils";
import { writeAuditLog } from "@/lib/audit";
import { verifyAdmin } from "@/lib/verify-admin";

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await verifyAdmin();
    if (adminCheck.error) return adminCheck.error;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const sortBy = searchParams.get("sortBy") || "newest";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50") || 50));

    const admin = getSupabaseAdminClient();

    let query = admin
      .from("blog_posts")
      .select("*, author:profiles!author_id(*)", { count: "exact" });

    if (search) {
      const safe = search.replace(/[%_,.()\\]/g, (c) => `\\${c}`);
      query = query.or(`title.ilike.%${safe}%,excerpt.ilike.%${safe}%`);
    }

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    // Sorting
    switch (sortBy) {
      case "popular":
        query = query.order("view_count", { ascending: false });
        break;
      case "oldest":
        query = query.order("created_at", { ascending: true });
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
      console.error("Failed to fetch blog posts:", error.message);
      return NextResponse.json({ error: "Failed to fetch blog posts" }, { status: 400 });
    }

    const posts = (data || []).map((row: Record<string, unknown>) =>
      dbRowToBlogPost(row)
    );

    return NextResponse.json(
      {
        data: posts,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
        hasMore: from + pageSize < (count || 0),
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

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await verifyAdmin();
    if (adminCheck.error) return adminCheck.error;

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

    const admin = getSupabaseAdminClient();

    // Generate unique slug from title
    let slug = slugify(body.title);
    const { data: existing } = await admin
      .from("blog_posts")
      .select("slug")
      .like("slug", `${slug}%`);
    if (existing && existing.length > 0) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Calculate read time (~200 words per minute)
    const wordCount = body.content.replace(/<[^>]*>/g, "").split(/\s+/).length;
    const readTime = Math.max(1, Math.round(wordCount / 200));

    // Allowlist fields
    const insertData: Record<string, unknown> = {
      slug,
      author_id: adminCheck.userId,
      title: body.title.trim(),
      excerpt: (body.excerpt || "").trim(),
      content: body.content,
      read_time: readTime,
      status: ["draft", "published"].includes(body.status) ? body.status : "draft",
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

    const { data, error } = await admin
      .from("blog_posts")
      .insert(insertData)
      .select("*, author:profiles!author_id(*)")
      .single();

    if (error) {
      console.error("Failed to create blog post:", error.message);
      return NextResponse.json({ error: "Failed to create blog post" }, { status: 400 });
    }

    // Write audit log (best-effort)
    await writeAuditLog(
      {
        actorId: adminCheck.userId,
        action: "create",
        entityType: "blog_post",
        entityId: (data as Record<string, unknown>).id as string,
        newValues: { title: body.title, status: insertData.status, slug },
        status: "success",
      },
      request
    );

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
