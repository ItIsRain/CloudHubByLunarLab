import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbRowToBlogPost } from "@/lib/supabase/mappers";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";

function postFilter(idOrSlug: string) {
  return UUID_RE.test(idOrSlug) ? `id.eq.${idOrSlug}` : `slug.eq.${idOrSlug}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

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

    const { data, error } = await supabase
      .from("blog_posts")
      .select("*, author:profiles!author_id(*)")
      .or(postFilter(slug))
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    const row = data as Record<string, unknown>;

    // Drafts are only visible to the author
    if (row.status !== "published") {
      const userId = auth.type !== "unauthenticated" ? auth.userId : undefined;
      if (!userId || userId !== row.author_id) {
        return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
      }
    }

    // Increment view count (fire-and-forget)
    if (row.status === "published") {
      void supabase
        .from("blog_posts")
        .update({ view_count: ((row.view_count as number) || 0) + 1 })
        .eq("id", row.id as string)
        .then();
    }

    const headers: Record<string, string> = row.status === "published"
      ? { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" }
      : {};

    return NextResponse.json(
      { data: dbRowToBlogPost(row) },
      { headers }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

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

    // Verify authorship
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("author_id, status, published_at")
      .or(postFilter(slug))
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }
    if (existing.author_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Allowlist + camelCase-to-snake_case key mapping
    const keyMap: Record<string, string> = {
      title: "title",
      excerpt: "excerpt",
      content: "content",
      cover_image: "cover_image",
      coverImage: "cover_image",
      category: "category",
      tags: "tags",
      status: "status",
    };
    const updates: Record<string, unknown> = {};
    for (const [key, dbKey] of Object.entries(keyMap)) {
      if (key in body) updates[dbKey] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Validate status
    if (updates.status) {
      if (!["draft", "published", "archived"].includes(updates.status as string)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
    }

    // Validate tags
    if (updates.tags && (!Array.isArray(updates.tags) || (updates.tags as string[]).length > 20)) {
      return NextResponse.json({ error: "Tags must be an array of up to 20 items" }, { status: 400 });
    }

    // Recalculate read time if content changed
    if (updates.content && typeof updates.content === "string") {
      const wordCount = (updates.content as string).replace(/<[^>]*>/g, "").split(/\s+/).length;
      updates.read_time = Math.max(1, Math.round(wordCount / 200));
    }

    // Set published_at when publishing for the first time
    if (updates.status === "published" && !existing.published_at) {
      updates.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .update(updates)
      .or(postFilter(slug))
      .eq("author_id", auth.userId)
      .select("*, author:profiles!author_id(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update blog post" }, { status: 400 });
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

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

    // Verify authorship
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("author_id")
      .or(postFilter(slug))
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }
    if (existing.author_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("blog_posts")
      .delete()
      .or(postFilter(slug))
      .eq("author_id", auth.userId);

    if (error) {
      return NextResponse.json({ error: "Failed to delete blog post" }, { status: 400 });
    }

    return NextResponse.json({ message: "Blog post deleted successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
