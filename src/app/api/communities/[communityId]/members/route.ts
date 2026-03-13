import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbRowToCommunityMember } from "@/lib/supabase/mappers";
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

    // Find community and check access
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id, visibility")
      .or(communityFilter(communityId))
      .single();

    if (communityError || !community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    // Private communities: only members can view members list
    if (community.visibility === "private") {
      const userId = auth.type !== "unauthenticated" ? auth.userId : undefined;
      if (!userId) {
        return NextResponse.json({ error: "Community not found" }, { status: 404 });
      }

      const { data: membership } = await supabase
        .from("community_members")
        .select("id")
        .eq("community_id", community.id)
        .eq("user_id", userId)
        .single();

      if (!membership) {
        return NextResponse.json({ error: "Community not found" }, { status: 404 });
      }
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20") || 20));
    const role = searchParams.get("role");

    let query = supabase
      .from("community_members")
      .select("*, user:profiles!community_members_user_id_fkey(*)", { count: "exact" })
      .eq("community_id", community.id);

    if (role && ["admin", "moderator", "member"].includes(role)) {
      query = query.eq("role", role);
    }

    query = query.order("joined_at", { ascending: false });

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("Failed to fetch community members:", error.message);
      return NextResponse.json({ error: "Failed to fetch members" }, { status: 400 });
    }

    const members = (data || []).map((row: Record<string, unknown>) =>
      dbRowToCommunityMember(row)
    );

    return NextResponse.json({
      data: members,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
      hasMore: from + pageSize < (count || 0),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
