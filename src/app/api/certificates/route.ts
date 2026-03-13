import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToCertificate } from "@/lib/supabase/mappers";
import { UUID_RE } from "@/lib/constants";

const VALID_TYPES = ["participation", "winner", "mentor", "judge", "organizer"];

/**
 * GET /api/certificates
 * List authenticated user's certificates. Optional filters: type, event_id, hackathon_id.
 */
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const eventId = searchParams.get("event_id");
    const hackathonId = searchParams.get("hackathon_id");

    let query = supabase
      .from("certificates")
      .select(
        "*, user:profiles!certificates_user_id_fkey(name, username, avatar), event:events!certificates_event_id_fkey(title, slug), hackathon:hackathons!certificates_hackathon_id_fkey(name, slug)"
      )
      .eq("user_id", user.id)
      .order("issued_at", { ascending: false });

    if (type && VALID_TYPES.includes(type)) {
      query = query.eq("type", type);
    }
    if (eventId && UUID_RE.test(eventId)) {
      query = query.eq("event_id", eventId);
    }
    if (hackathonId && UUID_RE.test(hackathonId)) {
      query = query.eq("hackathon_id", hackathonId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch certificates:", error.message);
      return NextResponse.json(
        { error: "Failed to fetch certificates" },
        { status: 500 }
      );
    }

    const certificates = (data || []).map((row: Record<string, unknown>) =>
      dbRowToCertificate(row)
    );

    return NextResponse.json({ data: certificates });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/certificates
 * Issue a certificate (organizer only).
 * Body: { user_id, event_id?, hackathon_id?, type, title, description? }
 */
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

    // ── Validate required fields ────────────────────────────────
    const { user_id, event_id, hackathon_id, type, title, description } = body;

    if (!user_id || typeof user_id !== "string" || !UUID_RE.test(user_id)) {
      return NextResponse.json(
        { error: "user_id must be a valid UUID" },
        { status: 400 }
      );
    }

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }

    if (title.length > 300) {
      return NextResponse.json(
        { error: "title must be under 300 characters" },
        { status: 400 }
      );
    }

    if (!event_id && !hackathon_id) {
      return NextResponse.json(
        { error: "Either event_id or hackathon_id is required" },
        { status: 400 }
      );
    }

    if (event_id && !UUID_RE.test(event_id)) {
      return NextResponse.json(
        { error: "event_id must be a valid UUID" },
        { status: 400 }
      );
    }

    if (hackathon_id && !UUID_RE.test(hackathon_id)) {
      return NextResponse.json(
        { error: "hackathon_id must be a valid UUID" },
        { status: 400 }
      );
    }

    // ── Verify organizer ownership ──────────────────────────────
    if (event_id) {
      const { data: eventRow, error: eventError } = await supabase
        .from("events")
        .select("organizer_id")
        .eq("id", event_id)
        .single();

      if (eventError || !eventRow) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      if (eventRow.organizer_id !== user.id) {
        return NextResponse.json(
          { error: "Only the event organizer can issue certificates" },
          { status: 403 }
        );
      }
    }

    if (hackathon_id) {
      const { data: hackRow, error: hackError } = await supabase
        .from("hackathons")
        .select("organizer_id")
        .eq("id", hackathon_id)
        .single();

      if (hackError || !hackRow) {
        return NextResponse.json(
          { error: "Hackathon not found" },
          { status: 404 }
        );
      }

      if (hackRow.organizer_id !== user.id) {
        return NextResponse.json(
          { error: "Only the hackathon organizer can issue certificates" },
          { status: 403 }
        );
      }
    }

    // ── Verify target user exists ───────────────────────────────
    const { data: targetUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user_id)
      .single();

    if (!targetUser) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    // ── Generate verification code ──────────────────────────────
    const prefix = type.toUpperCase().slice(0, 3);
    const uuid = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
    const verification_code = `CERT-${prefix}-${uuid}`;

    // ── Insert certificate ──────────────────────────────────────
    const insertData: Record<string, unknown> = {
      user_id,
      type,
      title: title.trim(),
      description: (description as string)?.trim() || null,
      verification_code,
    };
    if (event_id) insertData.event_id = event_id;
    if (hackathon_id) insertData.hackathon_id = hackathon_id;

    const { data, error } = await supabase
      .from("certificates")
      .insert(insertData)
      .select(
        "*, user:profiles!certificates_user_id_fkey(name, username, avatar), event:events!certificates_event_id_fkey(title, slug), hackathon:hackathons!certificates_hackathon_id_fkey(name, slug)"
      )
      .single();

    if (error) {
      console.error("Failed to issue certificate:", error.message);
      return NextResponse.json(
        { error: "Failed to issue certificate" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: dbRowToCertificate(data as Record<string, unknown>) },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
