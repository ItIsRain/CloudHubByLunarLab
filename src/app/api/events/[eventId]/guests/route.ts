import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { profileToPublicUser } from "@/lib/supabase/mappers";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { fireWebhooks } from "@/lib/webhook-delivery";
import { UUID_RE } from "@/lib/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    if (!UUID_RE.test(eventId)) {
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

    // Verify user is the event organizer
    const { data: event } = await supabase
      .from("events")
      .select("organizer_id")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50") || 50));
    const offset = (page - 1) * pageSize;

    // When search is active, we must fetch all rows first (search is on joined profile
    // fields which can't be filtered at the PostgREST level), then paginate in JS.
    // Without search, use Supabase-level pagination for efficiency.
    const useServerPagination = !search;

    let query = supabase
      .from("event_registrations")
      .select("id, user_id, event_id, status, ticket_type, qr_code, checked_in_at, created_at, user:profiles!event_registrations_user_id_fkey(*)", { count: "exact" })
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (useServerPagination) {
      query = query.range(offset, offset + pageSize - 1);
    }

    const { data: registrations, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch guests" }, { status: 400 });
    }

    let guests = (registrations || []).map(
      (reg: Record<string, unknown>) => {
        const userProfile = reg.user as Record<string, unknown>;
        return {
          id: reg.id as string,
          user: userProfile ? profileToPublicUser(userProfile) : null,
          ticketType: reg.ticket_type || null,
          status: reg.status as string,
          qrCode: (reg.qr_code as string) || null,
          checkedInAt: (reg.checked_in_at as string) || null,
          createdAt: reg.created_at as string,
        };
      }
    );

    if (search) {
      const term = search.toLowerCase();
      guests = guests.filter((g) => {
        if (!g.user) return false;
        return (
          g.user.name.toLowerCase().includes(term) ||
          g.user.email.toLowerCase().includes(term)
        );
      });
    }

    // When searching, total and pagination are based on filtered results
    const total = search ? guests.length : (count || 0);

    // Apply JS-level pagination when search is active
    if (search) {
      guests = guests.slice(offset, offset + pageSize);
    }

    return NextResponse.json({
      data: guests,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasMore: offset + pageSize < total,
    });
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

    if (!UUID_RE.test(eventId)) {
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

    const { data: event } = await supabase
      .from("events")
      .select("organizer_id, title")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { registrationId, status } = await request.json();

    if (!registrationId || !status) {
      return NextResponse.json(
        { error: "registrationId and status are required" },
        { status: 400 }
      );
    }

    if (!UUID_RE.test(registrationId)) {
      return NextResponse.json({ error: "Invalid registrationId format" }, { status: 400 });
    }

    const validStatuses = ["pending", "confirmed", "checked-in", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, unknown> = { status };
    if (status === "checked-in") {
      updatePayload.checked_in_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("event_registrations")
      .update(updatePayload)
      .eq("id", registrationId)
      .eq("event_id", eventId)
      .select("id, user_id, event_id, status, ticket_type, qr_code, checked_in_at, created_at, user:profiles!event_registrations_user_id_fkey(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update guest" }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      );
    }

    // Send notification
    const eventTitle = event.title || "the event";
    const messages: Record<string, { title: string; message: string }> = {
      "checked-in": {
        title: "Checked In",
        message: `You have been checked in to ${eventTitle}. Enjoy the event!`,
      },
      cancelled: {
        title: "Registration Cancelled",
        message: `Your registration for ${eventTitle} has been cancelled by the organizer.`,
      },
      confirmed: {
        title: "Registration Confirmed",
        message: `Your registration for ${eventTitle} has been confirmed!`,
      },
    };

    const notif = messages[status];
    if (notif) {
      await supabase.from("notifications").insert({
        user_id: data.user_id,
        type: "event-reminder",
        title: notif.title,
        message: notif.message,
        link: `/events/${eventId}`,
      });
    }

    // Fire webhook for the organizer
    fireWebhooks(auth.userId, "event.guest.status_changed", {
      eventId,
      eventTitle: event.title,
      registrationId: data.id,
      userId: data.user_id,
      status: data.status,
    });

    const userProfile = (data as Record<string, unknown>)
      .user as Record<string, unknown>;

    return NextResponse.json({
      data: {
        id: data.id,
        user: userProfile ? profileToPublicUser(userProfile) : null,
        ticketType: data.ticket_type || null,
        status: data.status,
        qrCode: data.qr_code || null,
        checkedInAt: data.checked_in_at || null,
        createdAt: data.created_at,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
