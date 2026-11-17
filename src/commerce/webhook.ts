import type Stripe from "stripe";
import { stripeClient } from "./config";

// Only fixed classifications reach logs. Provider/DB errors can contain secrets,
// customer contacts, SQL parameters, or signed confirmation links.
export function webhookFailureReason(error: unknown): string {
  if (error instanceof Error) {
    switch (error.message) {
      case "A dedicated order confirmation secret is required.":
        return "order_confirmation_secret_missing_or_invalid";
      case "Transactional email is not configured.":
        return "transactional_email_not_configured";
      case "Transactional email request failed.":
        return "transactional_email_request_failed";
      case "Order email delivery incomplete; retry or operator review required.":
        return "order_email_delivery_incomplete";
      case "DATABASE_URL is required.":
        return "database_not_configured";
      default:
        break;
    }
  }
  return "processing_failed";
}

export function verifyWebhook(
  body: string,
  signature: string | null,
  secret = process.env.STRIPE_WEBHOOK_SECRET,
): Stripe.Event {
  if (!secret || !signature)
    throw new Error("Webhook signature configuration missing");
  return stripeClient().webhooks.constructEvent(body, signature, secret);
}
