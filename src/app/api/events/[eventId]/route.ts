import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbRowToEvent } from "@/lib/supabase/mappers";
import { hasPrivateEntityAccess } from "@/lib/supabase/auth-helpers";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE, SAFE_SLUG_RE } from "@/lib/constants";
import { writeAuditLog } from "@/lib/audit";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

function eventFilter(id: string) {
  return UUID_RE.test(id) ? `id.eq.${id}` : `slug.eq.${id}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    if (!UUID_RE.test(eventId) && !SAFE_SLUG_RE.test(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    // Dual auth: session cookies OR API key
    const auth = await authenticateRequest(request);

    const hasBearer = request.headers.get("authorization")?.startsWith("Bearer ");
    if (hasBearer && auth.type === "unauthenticated") {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/events");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

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
      const userId = auth.type !== "unauthenticated" ? auth.userId : undefined;
      let userEmail: string | undefined;

      if (auth.type === "session") {
        const { data: { user } } = await supabase.auth.getUser();
        userEmail = user?.email ?? undefined;
      } else if (auth.type === "api_key") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", auth.userId)
          .single();
        userEmail = (profile?.email as string) ?? undefined;
      }

      const canAccess = await hasPrivateEntityAccess(supabase, "event", row.id as string, userId, userEmail);
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
    if (!UUID_RE.test(eventId) && !SAFE_SLUG_RE.test(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    // Dual auth: session cookies OR API key
    const auth = await authenticateRequest(request);

    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/events");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    // Verify ownership (also fetch current dates for chronology validation)
    const { data: existing } = await supabase
      .from("events")
      .select("organizer_id, start_date, end_date")
      .or(eventFilter(eventId))
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (existing.organizer_id !== auth.userId) {
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

    // Validate category
    if (updates.category) {
      const { categories: cats } = await import("@/lib/constants");
      if (!cats.map((c) => c.value).includes(updates.category as string)) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
    }

    // Validate type
    if (updates.type) {
      if (!["in-person", "virtual", "hybrid"].includes(updates.type as string)) {
        return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
      }
    }

    // Validate tags
    if (updates.tags && (!Array.isArray(updates.tags) || (updates.tags as string[]).length > 20)) {
      return NextResponse.json({ error: "Tags must be an array of up to 20 items" }, { status: 400 });
    }

    // Validate capacity
    if (updates.capacity !== undefined) {
      if (typeof updates.capacity !== "number" || !Number.isInteger(updates.capacity) || (updates.capacity as number) < 1) {
        return NextResponse.json({ error: "Capacity must be a positive integer" }, { status: 400 });
      }
    }

    // Validate date formats
    if (updates.start_date !== undefined) {
      if (typeof updates.start_date !== "string" || !ISO_DATE_RE.test(updates.start_date) || isNaN(Date.parse(updates.start_date))) {
        return NextResponse.json({ error: "Invalid start_date format. Use ISO 8601." }, { status: 400 });
      }
    }
    if (updates.end_date !== undefined) {
      if (typeof updates.end_date !== "string" || !ISO_DATE_RE.test(updates.end_date) || isNaN(Date.parse(updates.end_date))) {
        return NextResponse.json({ error: "Invalid end_date format. Use ISO 8601." }, { status: 400 });
      }
    }

    // Check date chronology (merge with existing values)
    const effectiveStart = (updates.start_date ?? existing.start_date) as string | null;
    const effectiveEnd = (updates.end_date ?? existing.end_date) as string | null;
    if (effectiveStart && effectiveEnd) {
      if (new Date(effectiveStart) >= new Date(effectiveEnd)) {
        return NextResponse.json({ error: "end_date must be after start_date" }, { status: 400 });
      }
    }

    // Atomic ownership check + update in a single query
    const { data, error } = await supabase
      .from("events")
      .update(updates)
      .or(eventFilter(eventId))
      .eq("organizer_id", auth.userId)
      .select("*, organizer:profiles!organizer_id(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update event" }, { status: 400 });
    }

    await writeAuditLog({
      actorId: auth.userId,
      action: "update",
      entityType: "event",
      entityId: eventId,
      newValues: updates,
    }, request);

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
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    if (!UUID_RE.test(eventId) && !SAFE_SLUG_RE.test(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    // Dual auth: session cookies OR API key
    const auth = await authenticateRequest(request);

    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/events");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from("events")
      .select("organizer_id")
      .or(eventFilter(eventId))
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (existing.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Atomic ownership check + delete in a single query
    const { error } = await supabase
      .from("events")
      .delete()
      .or(eventFilter(eventId))
      .eq("organizer_id", auth.userId);

    if (error) {
      return NextResponse.json({ error: "Failed to delete event" }, { status: 400 });
    }

    await writeAuditLog({
      actorId: auth.userId,
      action: "delete",
      entityType: "event",
      entityId: eventId,
    }, request);

    return NextResponse.json({ message: "Event deleted successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
