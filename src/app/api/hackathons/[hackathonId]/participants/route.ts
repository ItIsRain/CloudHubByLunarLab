import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { profileToPublicUser } from "@/lib/supabase/mappers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify user is the hackathon organizer
    const { data: hackathonCheck } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .eq("id", hackathonId)
      .single();

    if (!hackathonCheck) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }
    if (hackathonCheck.organizer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Fetch registrations with user profiles
    let query = supabase
      .from("hackathon_registrations")
      .select("*, user:profiles!hackathon_registrations_user_id_fkey(*)")
      .eq("hackathon_id", hackathonId)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data: registrations, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Fetch teams for this hackathon with their members so we can resolve
    // each participant's team name
    const { data: teams } = await supabase
      .from("teams")
      .select("id, name, hackathon_id, team_members(user_id)")
      .eq("hackathon_id", hackathonId);

    // Build a user_id -> team name lookup
    const userTeamMap: Record<string, string> = {};
    if (teams) {
      for (const team of teams) {
        const members = (team.team_members as { user_id: string }[]) || [];
        for (const member of members) {
          userTeamMap[member.user_id] = team.name;
        }
      }
    }

    // Fetch hackathon tracks for track name resolution
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("tracks")
      .eq("id", hackathonId)
      .single();

    const tracks = (hackathon?.tracks as { id?: string; name: string }[]) || [];
    const firstTrackName = tracks.length > 0 ? tracks[0].name : null;

    // Map registrations to response shape
    let participants = (registrations || []).map(
      (reg: Record<string, unknown>) => {
        const userProfile = reg.user as Record<string, unknown>;
        const userId = reg.user_id as string;

        return {
          id: reg.id as string,
          userId,
          hackathonId: reg.hackathon_id as string,
          status: reg.status as string,
          createdAt: reg.created_at as string,
          user: userProfile ? profileToPublicUser(userProfile) : null,
          teamName: userTeamMap[userId] || null,
          trackName: firstTrackName,
        };
      }
    );

    // Apply search filter on name/email (done in JS since it spans joined data)
    if (search) {
      const term = search.toLowerCase();
      participants = participants.filter((p) => {
        if (!p.user) return false;
        return (
          p.user.name.toLowerCase().includes(term) ||
          p.user.email.toLowerCase().includes(term)
        );
      });
    }

    return NextResponse.json({ data: participants });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;
    const supabase = await getSupabaseServerClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify caller is the hackathon organizer
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json(
        { error: "Hackathon not found" },
        { status: 404 }
      );
    }
    if (hackathon.organizer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { registrationId, status } = await request.json();

    if (!registrationId || !status) {
      return NextResponse.json(
        { error: "registrationId and status are required" },
        { status: 400 }
      );
    }

    const validStatuses = ["approved", "rejected", "confirmed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("hackathon_registrations")
      .update({ status })
      .eq("id", registrationId)
      .eq("hackathon_id", hackathonId)
      .select("*, user:profiles!hackathon_registrations_user_id_fkey(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      );
    }

    // Send notification to the participant when their status changes
    if (status === "cancelled" || status === "rejected" || status === "approved") {
      const { data: hackathonInfo } = await supabase
        .from("hackathons")
        .select("name")
        .eq("id", hackathonId)
        .single();

      const hackathonName = hackathonInfo?.name || "the hackathon";
      const messages: Record<string, { title: string; message: string }> = {
        cancelled: {
          title: "Registration Cancelled",
          message: `Your registration for ${hackathonName} has been cancelled by the organizer.`,
        },
        rejected: {
          title: "Registration Rejected",
          message: `Your registration for ${hackathonName} has been rejected by the organizer.`,
        },
        approved: {
          title: "Registration Approved",
          message: `Your registration for ${hackathonName} has been approved! You're all set to participate.`,
        },
      };

      const notif = messages[status];
      if (notif) {
        await supabase.from("notifications").insert({
          user_id: data.user_id,
          type: "hackathon-update",
          title: notif.title,
          message: notif.message,
          link: `/hackathons/${hackathonId}`,
        });
      }
    }

    const userProfile = (data as Record<string, unknown>)
      .user as Record<string, unknown>;

    return NextResponse.json({
      data: {
        id: data.id,
        userId: data.user_id,
        hackathonId: data.hackathon_id,
        status: data.status,
        createdAt: data.created_at,
        user: userProfile ? profileToPublicUser(userProfile) : null,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
