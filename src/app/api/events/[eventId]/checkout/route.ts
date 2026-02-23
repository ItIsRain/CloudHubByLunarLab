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

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

    const { ticketId } = await request.json();

    if (!ticketId) {
      return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
    }

    // Fetch event to get ticket data
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title, slug, tickets, status")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.status === "draft" || event.status === "cancelled" || event.status === "completed") {
      return NextResponse.json(
        { error: "Ticket sales are not available for this event" },
        { status: 400 }
      );
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

    if (ticket.price > 999999) {
      return NextResponse.json(
        { error: "Ticket price exceeds maximum allowed" },
        { status: 400 }
      );
    }

    // Validate currency is a supported 3-letter ISO code
    const SUPPORTED_CURRENCIES = ["usd", "eur", "gbp", "cad", "aud", "aed", "inr", "sgd", "jpy", "chf"];
    if (!SUPPORTED_CURRENCIES.includes(ticket.currency.toLowerCase())) {
      return NextResponse.json(
        { error: "Unsupported currency" },
        { status: 400 }
      );
    }

    // Check for existing registration
    const { data: existing, error: existingError } = await supabase
      .from("event_registrations")
      .select("id, payment_status")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: "Failed to check registration status" }, { status: 500 });
    }

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

    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // Use admin client for the registration insert (bypass RLS for pending)
    const supabaseAdmin = getSupabaseAdmin();

    let registration: { id: string };
    let regError;

    if (existing && existing.payment_status !== "paid") {
      // Update existing pending registration instead of delete+insert (prevents race condition)
      const result = await supabaseAdmin
        .from("event_registrations")
        .update({
          ticket_type: {
            id: ticket.id,
            name: ticket.name,
            price: ticket.price,
            currency: ticket.currency,
          },
          status: "pending",
          payment_status: "pending",
          stripe_session_id: null,
        })
        .eq("id", existing.id)
        .select("id")
        .single();
      registration = result.data!;
      regError = result.error;
    } else {
      // Insert a new pending registration
      const result = await supabaseAdmin
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
      registration = result.data!;
      regError = result.error;
    }

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
