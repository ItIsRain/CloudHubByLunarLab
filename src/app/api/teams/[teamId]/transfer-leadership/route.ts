import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { UUID_RE } from "@/lib/constants";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    if (!UUID_RE.test(teamId)) {
      return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const toUserId = (body as Record<string, unknown>).to_user_id;
    if (typeof toUserId !== "string" || !UUID_RE.test(toUserId)) {
      return NextResponse.json(
        { error: "to_user_id is required" },
        { status: 400 }
      );
    }
    if (toUserId === user.id) {
      return NextResponse.json(
        { error: "You are already the leader" },
        { status: 400 }
      );
    }

    // Pull all team members so we can verify caller is leader and target is a member.
    const { data: members, error: membersError } = await supabase
      .from("team_members")
      .select("user_id, is_leader")
      .eq("team_id", teamId);

    if (membersError || !members) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const caller = members.find((m) => m.user_id === user.id);
    if (!caller?.is_leader) {
      return NextResponse.json(
        { error: "Only the current team leader can transfer leadership" },
        { status: 403 }
      );
    }
    const target = members.find((m) => m.user_id === toUserId);
    if (!target) {
      return NextResponse.json(
        { error: "Target user is not a member of this team" },
        { status: 404 }
      );
    }

    // Promote the new leader first. If anything fails afterwards the team
    // still has a leader (the old one), so the worst case is "two leaders"
    // until the demotion succeeds — recoverable on retry.
    const { error: promoteError } = await supabase
      .from("team_members")
      .update({ is_leader: true })
      .eq("team_id", teamId)
      .eq("user_id", toUserId);

    if (promoteError) {
      return NextResponse.json(
        { error: "Failed to transfer leadership" },
        { status: 400 }
      );
    }

    const { error: demoteError } = await supabase
      .from("team_members")
      .update({ is_leader: false })
      .eq("team_id", teamId)
      .eq("user_id", user.id);

    if (demoteError) {
      return NextResponse.json(
        { error: "Leadership partially transferred. Please retry." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
