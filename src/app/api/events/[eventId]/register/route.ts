import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    if (!UUID_RE.test(eventId)) {
      return NextResponse.json({ registered: false });
    }
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ registered: false });
    }

    const { data, error } = await supabase
      .from("event_registrations")
      .select("id, status, created_at")
      .eq("event_id", eventId)
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
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    if (!UUID_RE.test(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify event is published and active
    const { data: eventCheck } = await supabase
      .from("events")
      .select("status, tickets")
      .eq("id", eventId)
      .single();

    if (!eventCheck) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (eventCheck.status === "draft" || eventCheck.status === "cancelled" || eventCheck.status === "completed") {
      return NextResponse.json(
        { error: "Registration is not available for this event" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));

    // Check for existing registration first
    const { data: existingReg, error: existingError } = await supabase
      .from("event_registrations")
      .select("id, status")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: "Failed to check registration status" }, { status: 500 });
    }

    if (existingReg && existingReg.status !== "cancelled") {
      return NextResponse.json(
        { error: "Already registered for this event" },
        { status: 409 }
      );
    }

    // Check ticket capacity for free tickets
    if (body.ticketType?.id) {
      const tickets = eventCheck.tickets as Array<{
        id: string;
        quantity: number;
        sold: number;
      }> | null;

      if (tickets) {
        const ticket = tickets.find((t) => t.id === body.ticketType.id);
        if (ticket && ticket.sold >= ticket.quantity) {
          return NextResponse.json(
            { error: "This ticket is sold out" },
            { status: 400 }
          );
        }
      }
    }

    let data;
    let error;

    if (existingReg && existingReg.status === "cancelled") {
      // Re-register: update cancelled row back to confirmed
      ({ data, error } = await supabase
        .from("event_registrations")
        .update({ status: "confirmed", ticket_type: body.ticketType || null })
        .eq("id", existingReg.id)
        .select("id, status, created_at")
        .single());
    } else {
      ({ data, error } = await supabase
        .from("event_registrations")
        .insert({
          event_id: eventId,
          user_id: user.id,
          ticket_type: body.ticketType || null,
          status: "confirmed",
        })
        .select("id, status, created_at")
        .single());
    }

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Already registered for this event" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Update registration_count using a count query (avoids race conditions on the count)
    const { count: regCount } = await supabase
      .from("event_registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .neq("status", "cancelled");

    if (regCount !== null) {
      await supabase
        .from("events")
        .update({ registration_count: regCount })
        .eq("id", eventId);
    }

    // Increment the `sold` counter on the matching ticket in the JSONB array
    // Re-read fresh ticket data to avoid stale sold count
    if (body.ticketType?.id) {
      const { data: freshEvent } = await supabase
        .from("events")
        .select("tickets")
        .eq("id", eventId)
        .single();

      if (freshEvent?.tickets) {
        const updatedTickets = (
          freshEvent.tickets as Array<{
            id: string;
            quantity: number;
            sold: number;
            [key: string]: unknown;
          }>
        ).map((t) =>
          t.id === body.ticketType.id ? { ...t, sold: (t.sold || 0) + 1 } : t
        );
        const { error: ticketError } = await supabase
          .from("events")
          .update({ tickets: updatedTickets })
          .eq("id", eventId);

        if (ticketError) {
          console.error("Failed to update ticket sold counter:", ticketError);
        }
      }
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
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    if (!UUID_RE.test(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if registration is a paid one — prevent deletion (must refund via Stripe)
    const { data: registration } = await supabase
      .from("event_registrations")
      .select("id, payment_status")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .single();

    if (!registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    if (registration.payment_status === "paid") {
      return NextResponse.json(
        { error: "Paid registrations cannot be cancelled directly. Please contact support for a refund." },
        { status: 400 }
      );
    }

    // Soft-delete: mark as cancelled so the row can be reused on re-registration
    const { error } = await supabase
      .from("event_registrations")
      .update({ status: "cancelled" })
      .eq("id", registration.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Update registration_count
    const { count: regCount } = await supabase
      .from("event_registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .neq("status", "cancelled");

    if (regCount !== null) {
      await supabase
        .from("events")
        .update({ registration_count: regCount })
        .eq("id", eventId);
    }

    return NextResponse.json({ message: "Registration cancelled" });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
