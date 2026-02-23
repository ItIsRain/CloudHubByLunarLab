import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * GET /api/bookmarks?type=event|hackathon
 * Returns the current user's bookmarks. Optionally filter by entity_type.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ data: [] });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "event" | "hackathon" | null

    let query = supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (type && (type === "event" || type === "hackathon")) {
      query = query.eq("entity_type", type);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookmarks
 * Toggle a bookmark. If it exists, delete it. If not, create it.
 * Body: { entityType: "event" | "hackathon", entityId: string }
 */
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

    const body = await request.json();
    const { entityType, entityId } = body;

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "entityType and entityId are required" },
        { status: 400 }
      );
    }

    if (entityType !== "event" && entityType !== "hackathon") {
      return NextResponse.json(
        { error: "entityType must be 'event' or 'hackathon'" },
        { status: 400 }
      );
    }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof entityId !== "string" || !UUID_RE.test(entityId)) {
      return NextResponse.json(
        { error: "entityId must be a valid UUID" },
        { status: 400 }
      );
    }

    // Check if bookmark already exists
    const { data: existing } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", user.id)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .maybeSingle();

    if (existing) {
      // Remove bookmark
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("id", existing.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data: { bookmarked: false, entityType, entityId } });
    } else {
      // Create bookmark
      const { error } = await supabase.from("bookmarks").insert({
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(
        { data: { bookmarked: true, entityType, entityId } },
        { status: 201 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
