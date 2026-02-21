import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/config";
import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

// Use service role client to bypass RLS
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// In Stripe v20+, current_period_end is on subscription items, not the subscription itself
function getPeriodEnd(subscription: Stripe.Subscription): string | null {
  const item = subscription.items?.data?.[0];
  if (item?.current_period_end) {
    return new Date(item.current_period_end * 1000).toISOString();
  }
  return null;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const eventId = session.metadata?.event_id;
        const ticketId = session.metadata?.ticket_id;

        if (eventId && ticketId) {
          // ── Event ticket payment ──
          // Confirm the registration
          await supabaseAdmin
            .from("event_registrations")
            .update({
              status: "confirmed",
              payment_status: "paid",
            })
            .eq("stripe_session_id", session.id);

          // Increment the ticket's sold count in the JSONB array
          const { data: evt } = await supabaseAdmin
            .from("events")
            .select("tickets")
            .eq("id", eventId)
            .single();

          if (evt?.tickets) {
            const tickets = evt.tickets as Array<{
              id: string;
              sold: number;
              [key: string]: unknown;
            }>;
            const updatedTickets = tickets.map((t) =>
              t.id === ticketId ? { ...t, sold: (t.sold || 0) + 1 } : t
            );
            await supabaseAdmin
              .from("events")
              .update({ tickets: updatedTickets })
              .eq("id", eventId);
          }
        } else if (userId) {
          // ── Subscription payment ──
          const subscriptionId = session.subscription as string;
          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);

            await supabaseAdmin
              .from("profiles")
              .update({
                subscription_tier: "pro",
                stripe_subscription_id: subscriptionId,
                subscription_status: subscription.status === "active" ? "active" : "trialing",
                current_period_end: getPeriodEnd(subscription),
              })
              .eq("id", userId);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          const statusMap: Record<string, string> = {
            active: "active",
            past_due: "past_due",
            canceled: "canceled",
            trialing: "trialing",
            incomplete: "inactive",
            incomplete_expired: "inactive",
            unpaid: "past_due",
            paused: "inactive",
          };

          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: statusMap[subscription.status] || "inactive",
              current_period_end: getPeriodEnd(subscription),
            })
            .eq("id", profile.id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_tier: "free",
              subscription_status: "canceled",
              stripe_subscription_id: null,
              current_period_end: null,
            })
            .eq("id", profile.id);
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
