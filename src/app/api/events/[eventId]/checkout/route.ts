import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/config";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(
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

    const { ticketId } = await request.json();

    if (!ticketId) {
      return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
    }

    // Fetch event to get ticket data
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title, slug, tickets")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Find the matching ticket
    const tickets = (event.tickets as Array<{
      id: string;
      name: string;
      price: number;
      currency: string;
      quantity: number;
      sold: number;
    }>) || [];

    const ticket = tickets.find((t) => t.id === ticketId);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.sold >= ticket.quantity) {
      return NextResponse.json({ error: "Ticket is sold out" }, { status: 400 });
    }

    if (ticket.price <= 0) {
      return NextResponse.json(
        { error: "Use the register endpoint for free tickets" },
        { status: 400 }
      );
    }

    // Check for existing registration
    const { data: existing } = await supabase
      .from("event_registrations")
      .select("id, payment_status")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing && existing.payment_status === "paid") {
      return NextResponse.json(
        { error: "Already registered for this event" },
        { status: 409 }
      );
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email, name")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email || user.email,
        name: profile.name || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const origin = request.headers.get("origin") || "http://localhost:3000";

    // Use admin client for the registration insert (bypass RLS for pending)
    const supabaseAdmin = getSupabaseAdmin();

    // Delete any existing pending registration for this event
    if (existing && existing.payment_status !== "paid") {
      await supabaseAdmin
        .from("event_registrations")
        .delete()
        .eq("id", existing.id);
    }

    // Insert a pending registration
    const { data: registration, error: regError } = await supabaseAdmin
      .from("event_registrations")
      .insert({
        event_id: eventId,
        user_id: user.id,
        ticket_type: {
          id: ticket.id,
          name: ticket.name,
          price: ticket.price,
          currency: ticket.currency,
        },
        status: "pending",
        payment_status: "pending",
      })
      .select("id")
      .single();

    if (regError) {
      console.error("Registration insert error:", regError);
      return NextResponse.json(
        { error: "Failed to create registration" },
        { status: 500 }
      );
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: ticket.currency.toLowerCase(),
            unit_amount: Math.round(ticket.price * 100),
            product_data: {
              name: ticket.name,
              description: event.title,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        supabase_user_id: user.id,
        event_id: eventId,
        ticket_id: ticket.id,
        registration_id: registration.id,
      },
      success_url: `${origin}/events/${event.slug}?checkout=success`,
      cancel_url: `${origin}/events/${event.slug}?checkout=canceled`,
    });

    // Update registration with Stripe session ID
    await supabaseAdmin
      .from("event_registrations")
      .update({ stripe_session_id: session.id })
      .eq("id", registration.id);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Ticket checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
