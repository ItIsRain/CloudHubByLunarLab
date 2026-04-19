import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbRowToBlogPost } from "@/lib/supabase/mappers";
import { writeAuditLog } from "@/lib/audit";
import { UUID_RE, SAFE_SLUG_RE } from "@/lib/constants";
import { verifyAdmin } from "@/lib/verify-admin";

function postFilter(idOrSlug: string) {
  return UUID_RE.test(idOrSlug) ? `id.eq.${idOrSlug}` : `slug.eq.${idOrSlug}`;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!UUID_RE.test(slug) && !SAFE_SLUG_RE.test(slug)) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    const adminCheck = await verifyAdmin();
    if (adminCheck.error) return adminCheck.error;

    const admin = getSupabaseAdminClient();

    // Fetch existing post
    const { data: existing } = await admin
      .from("blog_posts")
      .select("id, status, published_at, title")
      .or(postFilter(slug))
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
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

    const { data, error } = await admin
      .from("blog_posts")
      .update(updates)
      .or(postFilter(slug))
      .select("*, author:profiles!author_id(*)")
      .single();

    if (error) {
      console.error("Failed to update blog post:", error.message);
      return NextResponse.json({ error: "Failed to update blog post" }, { status: 400 });
    }

    // Write audit log (best-effort)
    await writeAuditLog(
      {
        actorId: adminCheck.userId,
        action: "update",
        entityType: "blog_post",
        entityId: existing.id as string,
        oldValues: { status: existing.status, title: existing.title },
        newValues: updates,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!UUID_RE.test(slug) && !SAFE_SLUG_RE.test(slug)) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    const adminCheck = await verifyAdmin();
    if (adminCheck.error) return adminCheck.error;

    const admin = getSupabaseAdminClient();

    // Fetch existing post for audit log
    const { data: existing } = await admin
      .from("blog_posts")
      .select("id, title, slug, status")
      .or(postFilter(slug))
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    const { error } = await admin
      .from("blog_posts")
      .delete()
      .or(postFilter(slug));

    if (error) {
      console.error("Failed to delete blog post:", error.message);
      return NextResponse.json({ error: "Failed to delete blog post" }, { status: 400 });
    }

    // Write audit log (best-effort)
    await writeAuditLog(
      {
        actorId: adminCheck.userId,
        action: "delete",
        entityType: "blog_post",
        entityId: existing.id as string,
        oldValues: { title: existing.title, slug: existing.slug, status: existing.status },
        status: "success",
      },
      request
    );

    return NextResponse.json({ message: "Blog post deleted successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
