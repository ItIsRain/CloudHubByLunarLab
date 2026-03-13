import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbRowToCommunity } from "@/lib/supabase/mappers";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";

function communityFilter(id: string) {
  return UUID_RE.test(id) ? `id.eq.${id}` : `slug.eq.${id}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ communityId: string }> }
) {
  try {
    const { communityId } = await params;

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

    const { data, error } = await supabase
      .from("communities")
      .select("*, organizer:profiles!organizer_id(*)")
      .or(communityFilter(communityId))
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const row = data as Record<string, unknown>;

    // Private communities: only members can view
    if (row.visibility === "private") {
      const userId = auth.type !== "unauthenticated" ? auth.userId : undefined;
      if (!userId) {
        return NextResponse.json({ error: "Community not found" }, { status: 404 });
      }

      const { data: membership } = await supabase
        .from("community_members")
        .select("id")
        .eq("community_id", row.id as string)
        .eq("user_id", userId)
        .single();

      if (!membership) {
        return NextResponse.json({ error: "Community not found" }, { status: 404 });
      }
    }

    const community = dbRowToCommunity(row);

    // Check if current user is a member
    if (auth.type !== "unauthenticated") {
      const { data: membership } = await supabase
        .from("community_members")
        .select("role")
        .eq("community_id", row.id as string)
        .eq("user_id", auth.userId)
        .single();

      if (membership) {
        community.isMember = true;
        community.memberRole = membership.role as "admin" | "moderator" | "member";
      }
    }

    const headers: Record<string, string> = row.visibility === "public"
      ? { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" }
      : {};

    return NextResponse.json({ data: community }, { headers });
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
  { params }: { params: Promise<{ communityId: string }> }
) {
  try {
    const { communityId } = await params;

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

    // Verify ownership
    const { data: existing } = await supabase
      .from("communities")
      .select("organizer_id")
      .or(communityFilter(communityId))
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }
    if (existing.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Allowlist + camelCase-to-snake_case key mapping
    const keyMap: Record<string, string> = {
      name: "name",
      description: "description",
      logo: "logo",
      cover_image: "cover_image",
      coverImage: "cover_image",
      website: "website",
      visibility: "visibility",
      tags: "tags",
      socials: "socials",
      status: "status",
    };
    const updates: Record<string, unknown> = {};
    for (const [key, dbKey] of Object.entries(keyMap)) {
      if (key in body) updates[dbKey] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Validate visibility
    if (updates.visibility) {
      if (!["public", "private"].includes(updates.visibility as string)) {
        return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
      }
    }

    // Validate status
    if (updates.status) {
      if (!["active", "archived"].includes(updates.status as string)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
    }

    // Validate tags
    if (updates.tags && (!Array.isArray(updates.tags) || (updates.tags as string[]).length > 20)) {
      return NextResponse.json({ error: "Tags must be an array of up to 20 items" }, { status: 400 });
    }

    // Validate socials
    if (updates.socials && (typeof updates.socials !== "object" || Array.isArray(updates.socials))) {
      return NextResponse.json({ error: "socials must be a JSON object" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("communities")
      .update(updates)
      .or(communityFilter(communityId))
      .eq("organizer_id", auth.userId)
      .select("*, organizer:profiles!organizer_id(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update community" }, { status: 400 });
    }

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ communityId: string }> }
) {
  try {
    const { communityId } = await params;

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

    // Verify ownership
    const { data: existing } = await supabase
      .from("communities")
      .select("organizer_id")
      .or(communityFilter(communityId))
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }
    if (existing.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("communities")
      .delete()
      .or(communityFilter(communityId))
      .eq("organizer_id", auth.userId);

    if (error) {
      return NextResponse.json({ error: "Failed to delete community" }, { status: 400 });
    }

    return NextResponse.json({ message: "Community deleted successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
