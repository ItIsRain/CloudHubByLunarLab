import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/config";
import { createClient } from "@supabase/supabase-js";

// Use service role client to bypass RLS — webhook has no user session
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error(`Error handling webhook event ${event.type}:`, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    default:
      return "inactive";
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_user_id;
  if (!userId) return;

  // For subscription checkouts, the subscription events will handle the update.
  // But we also set the customer ID and subscription ID here as a fallback.
  if (session.mode === "subscription" && session.subscription) {
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;

    // Fetch the full subscription to get status and period info
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    await supabaseAdmin.from("profiles").update({
      stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id,
      stripe_subscription_id: subscriptionId,
      subscription_tier: "pro",
      subscription_status: mapStripeStatus(subscription.status),
      current_period_end: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
    }).eq("id", userId);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) return;

  const isActive = ["active", "trialing"].includes(subscription.status);

  await supabaseAdmin.from("profiles").update({
    stripe_subscription_id: subscription.id,
    subscription_tier: isActive ? "pro" : "free",
    subscription_status: mapStripeStatus(subscription.status),
    current_period_end: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
  }).eq("id", userId);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) return;

  await supabaseAdmin.from("profiles").update({
    subscription_tier: "free",
    subscription_status: "canceled",
    stripe_subscription_id: null,
    current_period_end: null,
  }).eq("id", userId);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const sub = (invoice as unknown as { subscription: string | { id: string } | null }).subscription;
  if (!sub) return;

  const subscriptionId =
    typeof sub === "string"
      ? sub
      : sub.id;

  // Look up user by subscription ID
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (profile) {
    await supabaseAdmin.from("profiles").update({
      subscription_status: "past_due",
    }).eq("id", profile.id);
  }
}
