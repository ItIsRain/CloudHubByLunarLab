import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToEvent } from "@/lib/supabase/mappers";
import { hasPrivateEntityAccess } from "@/lib/supabase/auth-helpers";

import { UUID_RE } from "@/lib/constants";

function eventFilter(id: string) {
  return UUID_RE.test(id) ? `id.eq.${id}` : `slug.eq.${id}`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase
      .from("events")
      .select("*, organizer:profiles!organizer_id(*)")
      .or(eventFilter(eventId))
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const row = data as Record<string, unknown>;

    // Private events: only organizer or accepted invitees can view
    if (row.visibility === "private") {
      const { data: { user } } = await supabase.auth.getUser();
      const canAccess = await hasPrivateEntityAccess(supabase, "event", row.id as string, user?.id, user?.email ?? undefined);
      if (!canAccess) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }
    }

    const headers: Record<string, string> = row.visibility === "public"
      ? { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" }
      : {};

    return NextResponse.json(
      { data: dbRowToEvent(row) },
      { headers }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from("events")
      .select("organizer_id")
      .or(eventFilter(eventId))
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (existing.organizer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Allowlist + camelCase-to-snake_case key mapping
    const keyMap: Record<string, string> = {
      title: "title", tagline: "tagline", description: "description",
      cover_image: "cover_image", coverImage: "cover_image",
      category: "category", tags: "tags", type: "type", status: "status",
      location: "location",
      start_date: "start_date", startDate: "start_date",
      end_date: "end_date", endDate: "end_date",
      timezone: "timezone", tickets: "tickets", speakers: "speakers",
      agenda: "agenda", faq: "faq", capacity: "capacity",
      visibility: "visibility",
    };
    const updates: Record<string, unknown> = {};
    for (const [key, dbKey] of Object.entries(keyMap)) {
      if (key in body) updates[dbKey] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Validate visibility
    if (updates.visibility) {
      if (!["public", "private", "unlisted"].includes(updates.visibility as string)) {
        return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
      }
    }

    // Validate status against allowed values
    if (updates.status) {
      const allowedStatuses = [
        "draft", "published", "cancelled", "completed", "sold-out",
      ];
      if (!allowedStatuses.includes(updates.status as string)) {
        return NextResponse.json(
          { error: "Invalid event status" },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from("events")
      .update(updates)
      .or(eventFilter(eventId))
      .select("*, organizer:profiles!organizer_id(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      data: dbRowToEvent(data as Record<string, unknown>),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from("events")
      .select("organizer_id")
      .or(eventFilter(eventId))
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (existing.organizer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("events")
      .delete()
      .or(eventFilter(eventId));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Event deleted successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
