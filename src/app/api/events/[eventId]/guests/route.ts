import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { profileToPublicUser } from "@/lib/supabase/mappers";

export async function GET(
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

    // Verify user is the event organizer
    const { data: event } = await supabase
      .from("events")
      .select("organizer_id")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.organizer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query = supabase
      .from("event_registrations")
      .select("*, user:profiles!event_registrations_user_id_fkey(*)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: registrations, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
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

    return NextResponse.json({ data: guests });
  } catch {
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

    const { data: event } = await supabase
      .from("events")
      .select("organizer_id, title")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.organizer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { registrationId, status } = await request.json();

    if (!registrationId || !status) {
      return NextResponse.json(
        { error: "registrationId and status are required" },
        { status: 400 }
      );
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
      .select("*, user:profiles!event_registrations_user_id_fkey(*)")
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
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
