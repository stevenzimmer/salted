import Stripe from "stripe";
import { CommerceError } from "./validation";
export const commerceEnabled = () => process.env.COMMERCE_ENABLED === "true";
export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  // Live activation is a separate explicitly approved launch change.
  if (!key || !/^(sk|rk)_test_/.test(key))
    throw new CommerceError(
      "test_keys_required",
      "Test checkout is not configured.",
      503,
    );
  return new Stripe(key, { maxNetworkRetries: 1, timeout: 10_000 });
}
export function siteOrigin() {
  const url = new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  );
  if (
    url.protocol !== "https:" &&
    url.hostname !== "localhost" &&
    url.hostname !== "127.0.0.1"
  )
    throw new Error("Checkout requires a secure configured site origin.");
  return url.origin;
}
