import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

export const STRIPE_PRICES = {
  proMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
  proAnnual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID!,
};
