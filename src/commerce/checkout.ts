import Stripe from "stripe";
import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { withDatabase } from "../db/client";
import { checkoutAttempts, orders } from "../db/schema";
import {
  fetchCatalog,
  fetchMarketingConsentLabel,
  fetchPickupBlackoutDates,
  priceCart,
} from "./catalog";
import { resolveMarketingConsent } from "./marketing-consent";
import {
  cartFingerprint,
  CommerceError,
  pricesMatch,
  type CheckoutInput,
  type PriceLine,
} from "./validation";
import {
  applySession,
  createCheckoutAttempt,
  releaseUncreatedAttempt,
  recordRefund,
  type Attempt,
} from "./store";
import { siteOrigin, stripeClient } from "./config";

export function sessionParams(
  input: CheckoutInput,
  lines: PriceLine[],
  orderId: string,
  expiresAt: Date,
): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "payment",
    currency: "usd",
    allowed_payment_method_types: ["card"],
    wallet_options: { link: { display: "never" } },
    adaptive_pricing: { enabled: false },
    billing_address_collection: "auto",
    name_collection: { individual: { enabled: true, optional: false } },
    client_reference_id: orderId,
    integration_identifier: "salted_hosted_qxzmkpar",
    metadata: {
      order_id: orderId,
      checkout_attempt_id: input.requestKey,
      pickup_date: input.pickupDate,
    },
    payment_intent_data: {
      metadata: { order_id: orderId, pickup_date: input.pickupDate },
    },
    expires_at: Math.floor(expiresAt.getTime() / 1000),
    line_items: lines.map((l) => ({
      quantity: l.quantity,
      price_data: {
        currency: "usd",
        unit_amount: l.unitPrice,
        product_data: {
          name: `${l.productName} / ${l.variantName}`,
          description: `Pickup ${input.pickupDate}, 2–6 PM America/Los_Angeles`,
        },
      },
    })),
    success_url: `${siteOrigin()}/order/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteOrigin()}/?checkout=cancelled`,
  };
}
export async function createOrRecoverSession(
  attempt: Attempt,
  dependencies: { stripe?: Stripe; database?: typeof withDatabase } = {},
) {
  const stripe = dependencies.stripe ?? stripeClient();
  const database = dependencies.database ?? withDatabase;
  let session: Stripe.Checkout.Session;
  if (attempt.stripeCheckoutSessionId)
    session = await stripe.checkout.sessions.retrieve(
      attempt.stripeCheckoutSessionId,
    );
  else {
    // Never replay after Stripe's idempotency retention window.
    if (Date.now() - attempt.createdAt.getTime() > 23 * 60 * 60 * 1000)
      throw new CommerceError(
        "reconciliation_required",
        "Checkout is being reconciled. Please try again later.",
        503,
      );
    try {
      session = await stripe.checkout.sessions.create(attempt.stripeParams, {
        idempotencyKey: `salted-checkout-${attempt.id}`,
      });
    } catch (error) {
      // Network errors, API errors and idempotency conflicts retain the hold.
      if (
        (error instanceof Stripe.errors.StripeInvalidRequestError &&
          error.code !== "idempotency_key_in_use") ||
        error instanceof Stripe.errors.StripeAuthenticationError ||
        error instanceof Stripe.errors.StripePermissionError
      ) {
        await database((db) => releaseUncreatedAttempt(db, attempt.id));
      }
      throw error;
    }
  }
  await database((db) => applySession(db, session));
  return session;
}
export async function beginCheckout(input: CheckoutInput, ownerHash: string) {
  // Replays use persisted immutable Session parameters even if CMS prices change.
  const existing = await withDatabase((db) =>
    db
      .select()
      .from(checkoutAttempts)
      .where(
        and(
          eq(checkoutAttempts.requestKey, input.requestKey),
          eq(checkoutAttempts.ownerHash, ownerHash),
        ),
      ),
  );
  if (existing[0]) {
    if (existing[0].fingerprint !== cartFingerprint(input))
      throw new CommerceError(
        "idempotency_conflict",
        "Review the changed bag before retrying.",
      );
    if (existing[0].status === "expired" || existing[0].status === "failed")
      throw new CommerceError(
        "checkout_expired",
        "This checkout ended. Review your bag and start again.",
      );
    return { session: await createOrRecoverSession(existing[0]) };
  }
  const [active] = await withDatabase((db) =>
    db
      .select()
      .from(checkoutAttempts)
      .where(
        and(
          eq(checkoutAttempts.ownerHash, ownerHash),
          inArray(checkoutAttempts.status, ["creating", "open"]),
        ),
      ),
  );
  if (active) {
    if (active.fingerprint === cartFingerprint(input))
      return { session: await createOrRecoverSession(active) };

    const session = await createOrRecoverSession(active);
    if (session.status === "open") {
      const expired = await stripeClient().checkout.sessions.expire(session.id);
      await withDatabase((db) => applySession(db, expired));
    } else if (session.status !== "expired") {
      throw new CommerceError(
        "checkout_active",
        "Your previous checkout is still processing. Please refresh your bag and try again shortly.",
      );
    }
  }
  const [catalog, marketingLabel, blackoutDates] = await Promise.all([
    fetchCatalog(),
    input.marketingOptIn ? fetchMarketingConsentLabel() : Promise.resolve(null),
    fetchPickupBlackoutDates(),
  ]);
  const lines = priceCart(input, catalog);
  if (!pricesMatch(lines, input.reviewedPrices)) return { prices: lines };
  const marketingConsent = resolveMarketingConsent(input, marketingLabel);
  const attempt = await withDatabase((db) =>
    createCheckoutAttempt(
      db,
      input,
      ownerHash,
      lines,
      (orderId, expiresAt) => sessionParams(input, lines, orderId, expiresAt),
      marketingConsent,
      blackoutDates,
    ),
  );
  return { session: await createOrRecoverSession(attempt) };
}
export async function reconcileCheckouts() {
  const stripe = stripeClient();
  const attempts = await withDatabase((db) =>
    db
      .select()
      .from(checkoutAttempts)
      .where(
        and(
          inArray(checkoutAttempts.status, ["creating", "open"]),
          lte(checkoutAttempts.createdAt, new Date(Date.now() - 60_000)),
        ),
      )
      .orderBy(checkoutAttempts.updatedAt)
      .limit(50),
  );
  let reconciled = 0,
    failed = 0;
  const deadline = Date.now() + 30_000;
  for (const attempt of attempts) {
    if (Date.now() >= deadline) break;
    try {
      if (
        !attempt.stripeCheckoutSessionId &&
        Date.now() > attempt.expiresAt.getTime() + 5 * 60_000
      ) {
        // Exhaust every page in the original creation window before concluding absence.
        let found = false;
        for await (const session of stripe.checkout.sessions.list({
          created: {
            gte: Math.floor(attempt.createdAt.getTime() / 1000) - 60,
            lte: Math.floor(attempt.expiresAt.getTime() / 1000),
          },
          limit: 100,
        })) {
          if (session.metadata?.checkout_attempt_id === attempt.id) {
            await withDatabase((db) => applySession(db, session));
            found = true;
            break;
          }
        }
        if (!found)
          await withDatabase((db) => releaseUncreatedAttempt(db, attempt.id));
      } else {
        const session = await createOrRecoverSession(attempt);
        if (
          session.status === "open" &&
          Date.now() >= attempt.expiresAt.getTime()
        ) {
          const expired = await stripe.checkout.sessions.expire(session.id);
          await withDatabase((db) => applySession(db, expired));
        }
      }
      reconciled++;
    } catch {
      failed++;
    }
  }
  const paidOrders = await withDatabase((db) =>
    db
      .select()
      .from(orders)
      .where(inArray(orders.paymentStatus, ["paid", "partially_refunded"]))
      .orderBy(sql`${orders.paymentReconciledAt} asc nulls first`)
      .limit(50),
  );
  for (const order of paidOrders) {
    if (Date.now() >= deadline) break;
    try {
      if (order.stripePaymentIntentId) {
        const intent = await stripe.paymentIntents.retrieve(
          order.stripePaymentIntentId,
          { expand: ["latest_charge"] },
        );
        const charge = intent.latest_charge;
        if (charge && typeof charge !== "string" && charge.amount_refunded > 0)
          await withDatabase((db) =>
            recordRefund(db, charge, {
              id: `reconcile_refund_${charge.id}_${charge.amount_refunded}`,
              type: "charge.refunded",
            }),
          );
      }
      await withDatabase((db) =>
        db
          .update(orders)
          .set({ paymentReconciledAt: new Date() })
          .where(eq(orders.id, order.id)),
      );
    } catch {
      failed++;
    }
  }
  return { reconciled, failed };
}
