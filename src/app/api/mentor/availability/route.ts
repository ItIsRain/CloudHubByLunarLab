import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToMentorAvailability } from "@/lib/supabase/mappers";
import { z } from "zod";

const createAvailabilitySchema = z.object({
  hackathon_id: z.string().uuid().optional(),
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Must be HH:MM or HH:MM:SS format"),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Must be HH:MM or HH:MM:SS format"),
  timezone: z.string().min(1).max(100).default("UTC"),
  is_active: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const url = request.nextUrl;
    const mentorId = url.searchParams.get("mentor_id");
    const hackathonId = url.searchParams.get("hackathon_id");

    if (!mentorId) {
      return NextResponse.json(
        { error: "mentor_id query parameter is required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("mentor_availability")
      .select("*")
      .eq("mentor_id", mentorId)
      .eq("is_active", true)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (hackathonId) {
      query = query.eq("hackathon_id", hackathonId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch availability" },
        { status: 400 }
      );
    }

    const slots = (data || []).map((row) =>
      dbRowToMentorAvailability(row as Record<string, unknown>)
    );

    return NextResponse.json({ data: slots });
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

    // Verify user has mentor role
    const { data: profile } = await supabase
      .from("profiles")
      .select("roles")
      .eq("id", user.id)
      .single();

    if (!profile || !(profile.roles as string[])?.includes("mentor")) {
      return NextResponse.json(
        { error: "Only mentors can set availability" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createAvailabilitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { day_of_week, start_time, end_time, timezone, is_active, hackathon_id } = parsed.data;

    // Validate start_time < end_time
    if (start_time >= end_time) {
      return NextResponse.json(
        { error: "start_time must be before end_time" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("mentor_availability")
      .insert({
        mentor_id: user.id,
        hackathon_id: hackathon_id || null,
        day_of_week,
        start_time,
        end_time,
        timezone,
        is_active,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to create availability slot" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: dbRowToMentorAvailability(data as Record<string, unknown>),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
