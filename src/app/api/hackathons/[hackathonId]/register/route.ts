import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getHackathonTimeline } from "@/lib/supabase/auth-helpers";
import { canRegister, getPhaseMessage } from "@/lib/hackathon-phases";

export async function GET(
  _request: NextRequest,
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
      return NextResponse.json({ registered: false });
    }

    const { data, error } = await supabase
      .from("hackathon_registrations")
      .select("id, status, created_at")
      .eq("hackathon_id", hackathonId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ registered: false });
    }

    return NextResponse.json({
      registered: !!data && data.status !== "cancelled",
      registration: data,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  _request: NextRequest,
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

    // Verify registration window is open
    const timeline = await getHackathonTimeline(supabase, hackathonId);
    if (timeline && !canRegister(timeline)) {
      return NextResponse.json(
        { error: getPhaseMessage(timeline, "register") },
        { status: 403 }
      );
    }

    // Check if a registration already exists (e.g. previously cancelled)
    const { data: existing, error: existingError } = await supabase
      .from("hackathon_registrations")
      .select("id, status")
      .eq("hackathon_id", hackathonId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: "Failed to check registration status" }, { status: 500 });
    }

    let data;
    let error;

    if (existing) {
      if (existing.status !== "cancelled" && existing.status !== "rejected") {
        return NextResponse.json(
          { error: "Already registered for this hackathon" },
          { status: 409 }
        );
      }
      // Re-register: update the cancelled/rejected row back to confirmed
      ({ data, error } = await supabase
        .from("hackathon_registrations")
        .update({ status: "confirmed" })
        .eq("id", existing.id)
        .select("id, status, created_at")
        .single());
    } else {
      ({ data, error } = await supabase
        .from("hackathon_registrations")
        .insert({
          hackathon_id: hackathonId,
          user_id: user.id,
          status: "confirmed",
        })
        .select("id, status, created_at")
        .single());
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Update participant_count on the hackathon
    const { count: participantCount } = await supabase
      .from("hackathon_registrations")
      .select("id", { count: "exact", head: true })
      .eq("hackathon_id", hackathonId)
      .in("status", ["confirmed", "approved"]);

    if (participantCount !== null) {
      await supabase
        .from("hackathons")
        .update({ participant_count: participantCount })
        .eq("id", hackathonId);
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
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

    const { error } = await supabase
      .from("hackathon_registrations")
      .delete()
      .eq("hackathon_id", hackathonId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Update participant_count
    const { count: participantCount } = await supabase
      .from("hackathon_registrations")
      .select("id", { count: "exact", head: true })
      .eq("hackathon_id", hackathonId)
      .in("status", ["confirmed", "approved"]);

    if (participantCount !== null) {
      await supabase
        .from("hackathons")
        .update({ participant_count: participantCount })
        .eq("id", hackathonId);
    }

    return NextResponse.json({ message: "Registration cancelled" });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
