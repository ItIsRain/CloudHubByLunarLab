import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE, SAFE_SLUG_RE } from "@/lib/constants";

function communityFilter(id: string) {
  return UUID_RE.test(id) ? `id.eq.${id}` : `slug.eq.${id}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ communityId: string }> }
) {
  try {
    const { communityId } = await params;

    if (!UUID_RE.test(communityId) && !SAFE_SLUG_RE.test(communityId)) {
      return NextResponse.json({ error: "Invalid community ID" }, { status: 400 });
    }

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
      .select("id, visibility, status")
      .or(communityFilter(communityId))
      .single();

    if (communityError || !community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    if (community.status !== "active") {
      return NextResponse.json({ error: "Community is archived" }, { status: 400 });
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from("community_members")
      .select("id")
      .eq("community_id", community.id)
      .eq("user_id", auth.userId)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: "Already a member of this community" }, { status: 409 });
    }

    // Join the community
    const { error: joinError } = await supabase
      .from("community_members")
      .insert({
        community_id: community.id,
        user_id: auth.userId,
        role: "member",
      });

    if (joinError) {
      console.error("Failed to join community:", joinError.message);
      return NextResponse.json({ error: "Failed to join community" }, { status: 400 });
    }

    // Member count is auto-updated by the on_community_member_change trigger

    return NextResponse.json({ message: "Successfully joined community" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
