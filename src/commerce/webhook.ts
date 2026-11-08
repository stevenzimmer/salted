import type Stripe from "stripe";
import { stripeClient } from "./config";
export function verifyWebhook(
  body: string,
  signature: string | null,
  secret = process.env.STRIPE_WEBHOOK_SECRET,
): Stripe.Event {
  if (!secret || !signature)
    throw new Error("Webhook signature configuration missing");
  return stripeClient().webhooks.constructEvent(body, signature, secret);
}
