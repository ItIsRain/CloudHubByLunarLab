import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToTeam } from "@/lib/supabase/mappers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("teams")
      .select(
        "*, team_members(*, user:profiles!team_members_user_id_fkey(*))"
      )
      .eq("id", teamId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({
      data: dbRowToTeam(data as Record<string, unknown>),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.track !== undefined) updates.track = body.track;
    if (body.looking_for_roles !== undefined)
      updates.looking_for_roles = body.looking_for_roles;
    if (body.max_size !== undefined) updates.max_size = body.max_size;
    if (body.status !== undefined) updates.status = body.status;
    if (body.join_password !== undefined) updates.join_password = body.join_password;

    const { data, error } = await supabase
      .from("teams")
      .update(updates)
      .eq("id", teamId)
      .select(
        "*, team_members(*, user:profiles!team_members_user_id_fkey(*))"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      data: dbRowToTeam(data as Record<string, unknown>),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get the hackathon_id before deleting so we can update team_count
    const { data: team } = await supabase
      .from("teams")
      .select("hackathon_id")
      .eq("id", teamId)
      .single();

    const { error } = await supabase
      .from("teams")
      .delete()
      .eq("id", teamId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Update team_count on the hackathon
    if (team?.hackathon_id) {
      const { count: teamCount } = await supabase
        .from("teams")
        .select("id", { count: "exact", head: true })
        .eq("hackathon_id", team.hackathon_id);

      if (teamCount !== null) {
        await supabase
          .from("hackathons")
          .update({ team_count: teamCount })
          .eq("id", team.hackathon_id);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
