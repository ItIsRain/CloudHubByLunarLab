import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/config";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

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

  const supabaseAdmin = getSupabaseAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const eventId = session.metadata?.event_id;
        const ticketId = session.metadata?.ticket_id;
        const registrationId = session.metadata?.registration_id;

        if (eventId && ticketId) {
          // ── Event ticket payment ──
          // Idempotency: only update if registration is still pending
          const { data: reg } = await supabaseAdmin
            .from("event_registrations")
            .select("id, payment_status")
            .eq("stripe_session_id", session.id)
            .maybeSingle();

          // Also try by registration_id if stripe_session_id hasn't been set yet
          const targetReg = reg || (registrationId
            ? (await supabaseAdmin
                .from("event_registrations")
                .select("id, payment_status")
                .eq("id", registrationId)
                .maybeSingle()).data
            : null);

          if (targetReg && targetReg.payment_status !== "paid") {
            // Confirm the registration
            await supabaseAdmin
              .from("event_registrations")
              .update({
                status: "confirmed",
                payment_status: "paid",
                stripe_session_id: session.id,
              })
              .eq("id", targetReg.id);

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
              const { error: ticketErr } = await supabaseAdmin
                .from("events")
                .update({ tickets: updatedTickets })
                .eq("id", eventId);

              if (ticketErr) {
                console.error("Failed to update ticket sold counter:", ticketErr);
              }
            }
          }
          // If already paid, skip (idempotent)
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

      case "checkout.session.expired": {
        // Clean up orphaned pending registrations when checkout expires
        const expiredSession = event.data.object as Stripe.Checkout.Session;
        if (expiredSession.metadata?.event_id) {
          await supabaseAdmin
            .from("event_registrations")
            .delete()
            .eq("stripe_session_id", expiredSession.id)
            .eq("payment_status", "pending");
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const sub = (
          invoice as unknown as {
            subscription: string | { id: string } | null;
          }
        ).subscription;
        if (sub) {
          const subscriptionId =
            typeof sub === "string" ? sub : sub.id;

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("stripe_subscription_id", subscriptionId)
            .single();

          if (profile) {
            await supabaseAdmin
              .from("profiles")
              .update({ subscription_status: "past_due" })
              .eq("id", profile.id);
          }
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
