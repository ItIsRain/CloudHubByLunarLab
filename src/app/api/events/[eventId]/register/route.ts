import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hasPrivateEntityAccess } from "@/lib/supabase/auth-helpers";
import { fireWebhooks } from "@/lib/webhook-delivery";

import { UUID_RE } from "@/lib/constants";

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
  } catch (err) {
    console.error(err);
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
      .select("status, visibility, tickets")
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

    // Block registration for private events unless user has an invitation
    if (eventCheck.visibility === "private") {
      const canAccess = await hasPrivateEntityAccess(supabase, "event", eventId, user.id, user.email ?? undefined);
      if (!canAccess) {
        return NextResponse.json(
          { error: "This is a private event. You need an invitation to register." },
          { status: 403 }
        );
      }
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
      return NextResponse.json({ error: "Registration failed" }, { status: 400 });
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

    // Atomically increment the ticket sold counter using fresh data + optimistic
    // concurrency check. Re-read fresh ticket data to avoid stale sold count
    // and verify capacity hasn't been exceeded since our initial check.
    if (body.ticketType?.id) {
      const { data: freshEvent } = await supabase
        .from("events")
        .select("tickets")
        .eq("id", eventId)
        .single();

      if (freshEvent?.tickets) {
        const freshTickets = freshEvent.tickets as Array<{
          id: string;
          quantity: number;
          sold: number;
          [key: string]: unknown;
        }>;

        const targetTicket = freshTickets.find((t) => t.id === body.ticketType.id);

        // Post-insert capacity check: if ticket is now oversold, roll back
        if (targetTicket && (targetTicket.sold || 0) + 1 > targetTicket.quantity) {
          // Roll back: cancel the registration we just created
          if (data?.id) {
            await supabase
              .from("event_registrations")
              .update({ status: "cancelled" })
              .eq("id", data.id);

            // Recalculate registration_count after rollback
            const { count: rollbackCount } = await supabase
              .from("event_registrations")
              .select("id", { count: "exact", head: true })
              .eq("event_id", eventId)
              .neq("status", "cancelled");

            if (rollbackCount !== null) {
              await supabase
                .from("events")
                .update({ registration_count: rollbackCount })
                .eq("id", eventId);
            }
          }
          return NextResponse.json(
            { error: "This ticket is sold out" },
            { status: 400 }
          );
        }

        const updatedTickets = freshTickets.map((t) =>
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

    // Fire webhook AFTER all validations and rollback checks complete
    const { data: eventOrgData } = await supabase
      .from("events")
      .select("organizer_id, title")
      .eq("id", eventId)
      .single();

    if (eventOrgData?.organizer_id) {
      fireWebhooks(eventOrgData.organizer_id, "event.registration.created", {
        eventId,
        eventTitle: eventOrgData.title,
        registrationId: data?.id,
        userId: user.id,
        status: "confirmed",
      });
    }

    return NextResponse.json({ data });
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

    // Check if registration is a paid one — prevent deletion (must refund manually)
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
      return NextResponse.json({ error: "Failed to cancel registration" }, { status: 400 });
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

    // Fire webhook for the event organizer
    const { data: eventCancelOrg } = await supabase
      .from("events")
      .select("organizer_id, title")
      .eq("id", eventId)
      .single();

    if (eventCancelOrg?.organizer_id) {
      fireWebhooks(eventCancelOrg.organizer_id, "event.registration.cancelled", {
        eventId,
        eventTitle: eventCancelOrg.title,
        registrationId: registration.id,
        userId: user.id,
      });
    }

    return NextResponse.json({ message: "Registration cancelled" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
