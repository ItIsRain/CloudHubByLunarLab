import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";

function communityFilter(id: string) {
  return UUID_RE.test(id) ? `id.eq.${id}` : `slug.eq.${id}`;
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

    // Find the community
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id, organizer_id")
      .or(communityFilter(communityId))
      .single();

    if (communityError || !community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    // Prevent organizer from leaving
    if (community.organizer_id === auth.userId) {
      return NextResponse.json(
        { error: "Community organizer cannot leave. Transfer ownership or delete the community instead." },
        { status: 400 }
      );
    }

    // Check if user is a member
    const { data: membership } = await supabase
      .from("community_members")
      .select("id")
      .eq("community_id", community.id)
      .eq("user_id", auth.userId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "You are not a member of this community" }, { status: 400 });
    }

    // Remove membership
    const { error: leaveError } = await supabase
      .from("community_members")
      .delete()
      .eq("community_id", community.id)
      .eq("user_id", auth.userId);

    if (leaveError) {
      console.error("Failed to leave community:", leaveError.message);
      return NextResponse.json({ error: "Failed to leave community" }, { status: 400 });
    }

    // Update member count
    const { count } = await supabase
      .from("community_members")
      .select("id", { count: "exact", head: true })
      .eq("community_id", community.id);

    await supabase
      .from("communities")
      .update({ member_count: count || 0 })
      .eq("id", community.id);

    return NextResponse.json({ message: "Successfully left community" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
