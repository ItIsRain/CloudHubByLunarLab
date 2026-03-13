import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/blog/[slug]/engage
 * Tracks engagement metrics for a blog post (view, scroll depth, time on page, etc.)
 * Works for both anonymous and authenticated users via session ID.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();

    const {
      sessionId,
      timeOnPage,
      scrollDepth,
      readCompletion,
      clickedRelated,
      shared,
      referrer,
      deviceType,
    } = body;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdminClient();

    // Look up the blog post by slug
    const { data: post } = await admin
      .from("blog_posts")
      .select("id")
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (!post) {
      return NextResponse.json(
        { error: "Blog post not found" },
        { status: 404 }
      );
    }

    const userAgent = request.headers.get("user-agent") || undefined;

    // Upsert engagement — update if session already exists, insert otherwise
    const { error } = await admin.from("blog_engagements").upsert(
      {
        blog_post_id: post.id,
        session_id: sessionId,
        time_on_page: Math.min(
          3600,
          Math.max(0, Math.round(Number(timeOnPage) || 0))
        ),
        scroll_depth: Math.min(
          100,
          Math.max(0, Math.round(Number(scrollDepth) || 0))
        ),
        read_completion: Math.min(
          100,
          Math.max(0, Math.round(Number(readCompletion) || 0))
        ),
        clicked_related: Boolean(clickedRelated),
        shared: Boolean(shared),
        referrer:
          typeof referrer === "string" ? referrer.slice(0, 2000) : undefined,
        user_agent:
          typeof userAgent === "string" ? userAgent.slice(0, 500) : undefined,
        device_type: ["desktop", "tablet", "mobile"].includes(deviceType)
          ? deviceType
          : undefined,
      },
      {
        onConflict: "blog_post_id,session_id",
        ignoreDuplicates: false,
      }
    );

    if (error) {
      console.error("Failed to track engagement:", error.message);
      return NextResponse.json(
        { error: "Failed to track engagement" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
