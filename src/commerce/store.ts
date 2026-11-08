import { and, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import type { Database, Transaction } from "../db/client";
import {
  checkoutAttempts,
  inventory,
  orderItems,
  orders,
  pickupDates,
  reservations,
  processedStripeEvents,
} from "../db/schema";
import {
  CommerceError,
  cartFingerprint,
  totalCents,
  type CheckoutInput,
  type PriceLine,
} from "./validation";
import { isPickupOpen } from "../lib/availability";
import { fridayPickup } from "../lib/pickup-policy";
import { pickupConfig } from "../data/pickup-config";
import { recordPaidMarketingConsent } from "../marketing/preferences";
import {
  noMarketingConsent,
  type MarketingConsentSnapshot,
} from "./marketing-consent";

export type PaymentSession = Pick<
  Stripe.Checkout.Session,
  | "id"
  | "livemode"
  | "mode"
  | "client_reference_id"
  | "metadata"
  | "currency"
  | "amount_total"
  | "amount_subtotal"
  | "payment_status"
  | "status"
  | "payment_intent"
> & {
  customer_details: {
    email: string | null;
    name: string | null;
    phone: string | null;
  } | null;
};
export type RefundCharge = Pick<
  Stripe.Charge,
  "livemode" | "payment_intent" | "currency" | "amount" | "refunded"
>;
export type Attempt = typeof checkoutAttempts.$inferSelect;
export type SessionParamsFactory = (
  orderId: string,
  expiresAt: Date,
) => Stripe.Checkout.SessionCreateParams;
export async function createCheckoutAttempt(
  db: Database,
  input: CheckoutInput,
  ownerHash: string,
  lines: PriceLine[],
  params: SessionParamsFactory,
  marketingConsent: MarketingConsentSnapshot = noMarketingConsent,
  blackoutDates: readonly string[] = [],
): Promise<Attempt> {
  if ((input.marketingOptIn === true) !== marketingConsent.optIn)
    throw new CommerceError(
      "invalid_marketing_consent",
      "Review the newsletter option before continuing.",
      400,
    );
  return db.transaction(async (tx) => {
    // Serialize browser retries and limit a guest to one payable checkout at a time.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${ownerHash}, 0))`,
    );
    const [existing] = await tx
      .select()
      .from(checkoutAttempts)
      .where(eq(checkoutAttempts.requestKey, input.requestKey));
    if (existing) {
      if (
        existing.ownerHash !== ownerHash ||
        existing.fingerprint !== cartFingerprint(input)
      )
        throw new CommerceError(
          "idempotency_conflict",
          "This checkout request has changed. Review your bag and try again.",
        );
      return existing;
    }
    const [active] = await tx
      .select()
      .from(checkoutAttempts)
      .where(
        and(
          eq(checkoutAttempts.ownerHash, ownerHash),
          inArray(checkoutAttempts.status, ["creating", "open"]),
        ),
      );
    if (active)
      throw new CommerceError(
        "checkout_active",
        "A checkout is already open. Resume it or end it before starting another.",
      );
    const expectedPickup = fridayPickup(input.pickupDate, blackoutDates);
    if (!expectedPickup || !isPickupOpen(expectedPickup))
      throw new CommerceError(
        "pickup_closed",
        "This Friday is closed. Choose another date.",
      );
    // Persist only the chosen order date, never a pre-opened calendar or stock rows.
    // The legacy source/enabled columns no longer determine date eligibility.
    await tx
      .insert(pickupDates)
      .values({
        date: expectedPickup.date,
        startTime: expectedPickup.pickupStart,
        endTime: expectedPickup.pickupEnd,
        cutoffAt: new Date(expectedPickup.orderCutoff),
        timezone: pickupConfig.timezone,
        configurationSource: "manual",
        enabled: true,
      })
      .onConflictDoNothing({ target: pickupDates.date });
    const [pickup] = await tx
      .select()
      .from(pickupDates)
      .where(eq(pickupDates.date, input.pickupDate))
      .for("share");
    if (
      !pickup ||
      pickup.timezone !== pickupConfig.timezone ||
      pickup.startTime !== `${expectedPickup.pickupStart}:00` ||
      pickup.endTime !== `${expectedPickup.pickupEnd}:00` ||
      pickup.cutoffAt.getTime() !==
        new Date(expectedPickup.orderCutoff).getTime()
    )
      throw new CommerceError(
        "pickup_configuration_conflict",
        "This Friday's existing pickup details need review. Choose another date.",
      );
    const orderId = randomUUID(),
      expiresAt = new Date(Date.now() + 32 * 60 * 1000);
    const total = totalCents(lines);
    await tx.insert(orders).values({
      id: orderId,
      orderNumber: `SF-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
      pickupDateId: pickup.id,
      ownerHash,
      subtotalCents: total,
      totalCents: total,
      marketingOptIn: marketingConsent.optIn,
      marketingConsentAt: marketingConsent.optIn ? new Date() : null,
      marketingConsentSource: marketingConsent.source,
      marketingConsentVersion: marketingConsent.version,
      marketingConsentText: marketingConsent.text,
    });
    const [attempt] = await tx
      .insert(checkoutAttempts)
      .values({
        id: input.requestKey,
        inventoryMode: "uncapped",
        requestKey: input.requestKey,
        fingerprint: cartFingerprint(input),
        ownerHash,
        orderId,
        expiresAt,
        stripeParams: params(orderId, expiresAt),
      })
      .returning();
    for (const line of lines) {
      await tx.insert(orderItems).values({
        orderId,
        productId: line.productId,
        variantId: line.variantId,
        productNameSnapshot: line.productName,
        variantNameSnapshot: line.variantName,
        unitPriceCents: line.unitPrice,
        quantity: line.quantity,
        lineTotalCents: line.lineTotal,
      });
    }
    return attempt;
  });
}
async function moveReservations(
  tx: Transaction,
  attemptId: string,
  target: "sold" | "released",
) {
  const holds = await tx
    .select()
    .from(reservations)
    .where(
      and(
        eq(reservations.checkoutAttemptId, attemptId),
        eq(reservations.status, "active"),
      ),
    )
    .orderBy(reservations.inventoryId);
  for (const hold of holds) {
    // Attempt lock serializes fulfillment/release; inventory locks are ordered.
    await tx
      .update(inventory)
      .set({
        quantityReserved: sql`${inventory.quantityReserved}-${hold.quantity}`,
        quantitySold:
          target === "sold"
            ? sql`${inventory.quantitySold}+${hold.quantity}`
            : sql`${inventory.quantitySold}`,
        updatedAt: new Date(),
      })
      .where(eq(inventory.id, hold.inventoryId));
    await tx
      .update(reservations)
      .set({ status: target, updatedAt: new Date() })
      .where(eq(reservations.id, hold.id));
  }
  return holds.length;
}
function verifySession(
  session: PaymentSession,
  attempt: Attempt,
  order: typeof orders.$inferSelect,
) {
  if (
    session.livemode ||
    session.mode !== "payment" ||
    session.client_reference_id !== order.id ||
    session.metadata?.order_id !== order.id ||
    session.metadata?.checkout_attempt_id !== attempt.id ||
    (attempt.stripeCheckoutSessionId &&
      attempt.stripeCheckoutSessionId !== session.id) ||
    session.currency !== order.currency ||
    session.amount_total !== order.totalCents ||
    session.amount_subtotal !== order.subtotalCents
  )
    throw new CommerceError(
      "session_mismatch",
      "Stripe Session does not match the local order.",
      500,
    );
}
export async function applySession(
  db: Database,
  session: PaymentSession,
  event?: { id: string; type: string },
) {
  return db.transaction(async (tx) => {
    // Event ID is inserted inside the same transaction as the state change.
    if (event) {
      const inserted = await tx
        .insert(processedStripeEvents)
        .values({
          stripeEventId: event.id,
          eventType: event.type,
          result: "processed",
        })
        .onConflictDoNothing()
        .returning();
      if (!inserted.length) return "duplicate";
    }
    const attemptId = session.metadata?.checkout_attempt_id;
    if (!attemptId || !/^[0-9a-f-]{36}$/.test(attemptId)) return "unrelated";
    const [attempt] = await tx
      .select()
      .from(checkoutAttempts)
      .where(eq(checkoutAttempts.id, attemptId))
      .for("update");
    if (!attempt) return "unrelated";
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, attempt.orderId))
      .for("update");
    if (!order) throw new Error("Checkout has no order");
    verifySession(session, attempt, order);
    if (!attempt.stripeCheckoutSessionId) {
      await tx
        .update(checkoutAttempts)
        .set({ stripeCheckoutSessionId: session.id })
        .where(eq(checkoutAttempts.id, attempt.id));
      await tx
        .update(orders)
        .set({ stripeCheckoutSessionId: session.id })
        .where(eq(orders.id, order.id));
    }
    if (order.paymentStatus !== "pending") return "already_paid";
    if (session.payment_status === "paid" && session.status === "complete") {
      if (attempt.status === "expired" || attempt.status === "failed")
        throw new CommerceError(
          "payment_after_release",
          "Payment received after inventory release; operator review required.",
          500,
        );
      if (
        !(await moveReservations(tx, attempt.id, "sold")) &&
        attempt.inventoryMode === "reserved"
      )
        throw new Error("Paid checkout has no active inventory reservations");
      const intent =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;
      if (!intent || !session.customer_details?.email)
        throw new Error("Paid checkout missing payment or customer details");
      await tx
        .update(orders)
        .set({
          paymentStatus: "paid",
          orderStatus: "confirmed",
          stripePaymentIntentId: intent,
          customerName: session.customer_details.name,
          customerEmail: session.customer_details.email,
          customerPhone: session.customer_details.phone,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));
      if (order.marketingOptIn && order.marketingConsentAt) {
        await recordPaidMarketingConsent(tx, {
          email: session.customer_details.email,
          orderId: order.id,
          consentAt: order.marketingConsentAt,
        });
      }
      await tx
        .update(checkoutAttempts)
        .set({ status: "paid", updatedAt: new Date() })
        .where(eq(checkoutAttempts.id, attempt.id));
      return "paid";
    }
    if (session.status === "expired") {
      await moveReservations(tx, attempt.id, "released");
      await tx
        .update(orders)
        .set({ orderStatus: "cancelled", updatedAt: new Date() })
        .where(eq(orders.id, order.id));
      await tx
        .update(checkoutAttempts)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(checkoutAttempts.id, attempt.id));
      return "expired";
    }
    await tx
      .update(checkoutAttempts)
      .set({ status: "open", updatedAt: new Date() })
      .where(eq(checkoutAttempts.id, attempt.id));
    return "pending";
  });
}
// Only call for a definitive creation rejection or a fully enumerated absence after expiry.
export async function releaseUncreatedAttempt(db: Database, attemptId: string) {
  await db.transaction(async (tx) => {
    const [attempt] = await tx
      .select()
      .from(checkoutAttempts)
      .where(eq(checkoutAttempts.id, attemptId))
      .for("update");
    if (
      !attempt ||
      attempt.stripeCheckoutSessionId ||
      attempt.status !== "creating"
    )
      return;
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, attempt.orderId))
      .for("update");
    if (!order || order.paymentStatus !== "pending") return;
    await moveReservations(tx, attempt.id, "released");
    await tx
      .update(checkoutAttempts)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(checkoutAttempts.id, attempt.id));
    await tx
      .update(orders)
      .set({ orderStatus: "cancelled", updatedAt: new Date() })
      .where(eq(orders.id, order.id));
  });
}
export async function recordRefund(
  db: Database,
  charge: RefundCharge,
  event: { id: string; type: string },
) {
  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(processedStripeEvents)
      .values({
        stripeEventId: event.id,
        eventType: event.type,
        result: "refund_recorded",
      })
      .onConflictDoNothing()
      .returning();
    if (!inserted.length || charge.livemode) return;
    const intent =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;
    if (!intent) return;
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.stripePaymentIntentId, intent))
      .for("update");
    if (!order) throw new Error("Refund order not yet reconciled; retry event");
    if (
      charge.currency !== order.currency ||
      charge.amount !== order.totalCents
    )
      throw new Error("Refund amount mismatch");
    if (order.paymentStatus !== "refunded")
      await tx
        .update(orders)
        .set({
          paymentStatus: charge.refunded ? "refunded" : "partially_refunded",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));
  });
}
