import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToMentorSession } from "@/lib/supabase/mappers";
import { z } from "zod";

const VALID_PLATFORMS = ["zoom", "google_meet", "teams", "discord", "in_person", "other"] as const;

const bookSessionSchema = z.object({
  mentor_id: z.string().uuid(),
  hackathon_id: z.string().uuid().optional(),
  team_id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  session_date: z.string().datetime({ message: "Must be a valid ISO datetime" }),
  duration_minutes: z.number().int().min(15).max(120).default(30),
  platform: z.enum(VALID_PLATFORMS).optional(),
  meeting_url: z.string().url().optional(),
});

const SESSION_SELECT = `
  *,
  mentor:profiles!mentor_sessions_mentor_id_fkey(*),
  mentee:profiles!mentor_sessions_mentee_id_fkey(*)
`;

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = request.nextUrl;
    const hackathonId = url.searchParams.get("hackathon_id");
    const status = url.searchParams.get("status");
    const role = url.searchParams.get("role"); // "mentor" | "mentee" | undefined (both)

    let query = supabase
      .from("mentor_sessions")
      .select(SESSION_SELECT)
      .order("session_date", { ascending: true });

    // Filter by role
    if (role === "mentor") {
      query = query.eq("mentor_id", user.id);
    } else if (role === "mentee") {
      query = query.eq("mentee_id", user.id);
    } else {
      query = query.or(`mentor_id.eq.${user.id},mentee_id.eq.${user.id}`);
    }

    if (hackathonId) {
      query = query.eq("hackathon_id", hackathonId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 400 }
      );
    }

    const sessions = (data || []).map((row) =>
      dbRowToMentorSession(row as Record<string, unknown>)
    );

    return NextResponse.json({ data: sessions });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const parsed = bookSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      mentor_id,
      hackathon_id,
      team_id,
      title,
      description,
      session_date,
      duration_minutes,
      platform,
      meeting_url,
    } = parsed.data;

    // Cannot book a session with yourself
    if (mentor_id === user.id) {
      return NextResponse.json(
        { error: "You cannot book a session with yourself" },
        { status: 400 }
      );
    }

    // Verify the mentor exists and has the mentor role
    const { data: mentorProfile } = await supabase
      .from("profiles")
      .select("id, roles")
      .eq("id", mentor_id)
      .single();

    if (!mentorProfile || !(mentorProfile.roles as string[])?.includes("mentor")) {
      return NextResponse.json(
        { error: "The specified user is not a mentor" },
        { status: 400 }
      );
    }

    // Verify the session date is in the future
    if (new Date(session_date) <= new Date()) {
      return NextResponse.json(
        { error: "Session date must be in the future" },
        { status: 400 }
      );
    }

    // Check mentor availability for the requested day/time
    const sessionDateObj = new Date(session_date);
    const dayOfWeek = sessionDateObj.getUTCDay(); // 0=Sunday
    const timeStr = sessionDateObj.toISOString().substring(11, 16); // HH:MM

    const { data: availSlots } = await supabase
      .from("mentor_availability")
      .select("*")
      .eq("mentor_id", mentor_id)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true)
      .lte("start_time", timeStr)
      .gte("end_time", timeStr);

    if (!availSlots || availSlots.length === 0) {
      return NextResponse.json(
        { error: "Mentor is not available at the requested time" },
        { status: 409 }
      );
    }

    // Create the session
    const { data: session, error: insertError } = await supabase
      .from("mentor_sessions")
      .insert({
        mentor_id,
        mentee_id: user.id,
        hackathon_id: hackathon_id || null,
        team_id: team_id || null,
        title,
        description: description || null,
        status: "pending",
        session_date,
        duration_minutes,
        platform: platform || null,
        meeting_url: meeting_url || null,
      })
      .select(SESSION_SELECT)
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to book session" },
        { status: 400 }
      );
    }

    // Send notification to the mentor
    await supabase.from("notifications").insert({
      user_id: mentor_id,
      type: "team-message" as const,
      title: "New Mentoring Session Request",
      message: `You have a new mentoring session request: "${title}"`,
      link: "/mentor/sessions",
    });

    return NextResponse.json({
      data: dbRowToMentorSession(session as Record<string, unknown>),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
