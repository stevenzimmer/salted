import test from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { withDatabase, type Database } from "../src/db/client";
import {
  inventory,
  pickupDates,
  orders,
  orderItems,
  reservations,
  checkoutAttempts,
  processedStripeEvents,
  marketingSubscriptions,
  checkoutRateLimits,
  orderEmails,
} from "../src/db/schema";
import { createOrRecoverSession } from "../src/commerce/checkout";
import {
  applySession,
  createCheckoutAttempt,
  releaseUncreatedAttempt,
  recordRefund,
  type Attempt,
  type PaymentSession,
} from "../src/commerce/store";
import { buildPickupSchedule } from "../src/commerce/schedule-model";
import { pickupDateForCart } from "../src/lib/availability";
import { openPickupDate, closePickupDate } from "../src/commerce/pickups";
import { priceCart, type Catalog } from "../src/commerce/catalog";
import { resolveMarketingConsent } from "../src/commerce/marketing-consent";
import type { CheckoutInput } from "../src/commerce/validation";
import {
  canSendMarketingEmail,
  unsubscribeEmail,
  unsubscribeSubscription,
} from "../src/marketing/preferences";
import { pruneRateLimitBuckets } from "../src/commerce/maintenance";
import { deliverOrderEmails } from "../src/commerce/email";
import type { EmailPayload } from "../src/commerce/email-types";
import { initialOrderEmailCopy } from "../scripts/migrations/order-email";
if (
  !process.env.TEST_DATABASE_URL ||
  process.env.TEST_DATABASE_URL === process.env.DATABASE_URL
)
  throw new Error(
    "Use a separate migrated TEST_DATABASE_URL, never the application database.",
  );
const dbTest = <T>(operation: (db: Database) => Promise<T>) =>
  withDatabase(operation, process.env.TEST_DATABASE_URL);
const catalog: Catalog = [
  {
    _id: "qa-bread",
    id: "qa-bread",
    active: true,
    displayName: "QA Bread",
    variants: [{ id: "loaf", active: true, label: "Loaf", price: 1200 }],
  },
];
let index = 0;
async function fixture() {
  const day = new Date("2098-01-03T12:00:00Z");
  while (day.getUTCDay() !== 5) day.setUTCDate(day.getUTCDate() + 1);
  day.setUTCDate(day.getUTCDate() + index++ * 7);
  const pickup = await dbTest((db) =>
    openPickupDate(db, day.toISOString().slice(0, 10)),
  );
  const input: CheckoutInput = {
    marketingOptIn: false,
    items: [{ productId: "qa-bread", variantId: "loaf", quantity: 1 }],
    pickupDate: pickup.date,
    requestKey: randomUUID(),
    reviewedPrices: [
      { productId: "qa-bread", variantId: "loaf", unitPrice: 1200 },
    ],
  };
  const lines = priceCart(input, catalog);
  const eventIds: string[] = [];
  const create = (
    request = input,
    owner: string = randomUUID(),
    blackoutDates: string[] = [],
  ) =>
    dbTest((db) =>
      createCheckoutAttempt(
        db,
        request,
        owner,
        priceCart(request, catalog),
        (orderId, expiresAt) => ({
          mode: "payment",
          client_reference_id: orderId,
          metadata: {
            order_id: orderId,
            checkout_attempt_id: request.requestKey,
          },
          expires_at: Math.floor(expiresAt.getTime() / 1000),
        }),
        resolveMarketingConsent(request, request.marketingConsentText),
        blackoutDates,
      ),
    );
  const savedOrder = (attempt: Attempt) =>
    dbTest(
      async (db) =>
        (
          await db.select().from(orders).where(eq(orders.id, attempt.orderId))
        )[0],
    );
  const savedAttempt = (attempt: Attempt) =>
    dbTest(
      async (db) =>
        (
          await db
            .select()
            .from(checkoutAttempts)
            .where(eq(checkoutAttempts.id, attempt.id))
        )[0],
    );
  const counts = () =>
    dbTest(async (db) => ({
      orders: (
        await db.select().from(orders).where(eq(orders.pickupDateId, pickup.id))
      ).length,
      inventory: (
        await db
          .select()
          .from(inventory)
          .where(eq(inventory.pickupDateId, pickup.id))
      ).length,
      holds: (
        await db
          .select()
          .from(reservations)
          .innerJoin(
            checkoutAttempts,
            eq(reservations.checkoutAttemptId, checkoutAttempts.id),
          )
          .innerJoin(orders, eq(checkoutAttempts.orderId, orders.id))
          .where(eq(orders.pickupDateId, pickup.id))
      ).length,
    }));
  const event = (type: string) => {
    const id = `evt_qa_${randomUUID()}`;
    eventIds.push(id);
    return { id, type };
  };
  async function legacyHold(attempt: Attempt) {
    // Seed an already-existing reserved checkout, as created before this release.
    // New checkout creation never runs this code or writes inventory.
    await dbTest((db) =>
      db.transaction(async (tx) => {
        const [row] = await tx
          .insert(inventory)
          .values({
            pickupDateId: pickup.id,
            productId: "qa-bread",
            variantId: "loaf",
            capacity: 2,
            quantityReserved: 1,
          })
          .onConflictDoUpdate({
            target: [
              inventory.pickupDateId,
              inventory.productId,
              inventory.variantId,
            ],
            set: { quantityReserved: sql`${inventory.quantityReserved}+1` },
          })
          .returning();
        const [legacy] = await tx
          .update(checkoutAttempts)
          .set({ inventoryMode: sql`default` })
          .where(eq(checkoutAttempts.id, attempt.id))
          .returning();
        assert.equal(legacy.inventoryMode, "reserved");
        await tx.insert(reservations).values({
          checkoutAttemptId: attempt.id,
          inventoryId: row.id,
          quantity: 1,
          expiresAt: attempt.expiresAt,
        });
      }),
    );
  }
  const cleanup = () =>
    dbTest(async (db) => {
      if (eventIds.length)
        await db
          .delete(processedStripeEvents)
          .where(inArray(processedStripeEvents.stripeEventId, eventIds));
      const os = await db
        .select()
        .from(orders)
        .where(eq(orders.pickupDateId, pickup.id));
      if (os.length) {
        const ids = os.map((o) => o.id),
          attempts = await db
            .select()
            .from(checkoutAttempts)
            .where(inArray(checkoutAttempts.orderId, ids));
        if (attempts.length)
          await db.delete(reservations).where(
            inArray(
              reservations.checkoutAttemptId,
              attempts.map((a) => a.id),
            ),
          );
        await db.delete(orderItems).where(inArray(orderItems.orderId, ids));
        await db.delete(orderEmails).where(inArray(orderEmails.orderId, ids));
        await db
          .delete(checkoutAttempts)
          .where(inArray(checkoutAttempts.orderId, ids));
        await db
          .delete(marketingSubscriptions)
          .where(inArray(marketingSubscriptions.lastConsentOrderId, ids));
        await db.delete(orders).where(inArray(orders.id, ids));
      }
      await db.delete(inventory).where(eq(inventory.pickupDateId, pickup.id));
      await db.delete(pickupDates).where(eq(pickupDates.id, pickup.id));
    });
  return {
    pickup,
    input,
    lines,
    create,
    savedOrder,
    savedAttempt,
    counts,
    event,
    legacyHold,
    cleanup,
  };
}
function session(a: Attempt, paid = true): PaymentSession {
  // Synthetic external envelope; every state change below uses real Postgres.
  return {
    id: `cs_test_${a.id.replaceAll("-", "")}`,
    livemode: false,
    mode: "payment",
    client_reference_id: a.orderId,
    metadata: { order_id: a.orderId, checkout_attempt_id: a.id },
    currency: "usd",
    amount_total: 1200,
    amount_subtotal: 1200,
    payment_status: paid ? "paid" : "unpaid",
    status: paid ? "complete" : "expired",
    payment_intent: `pi_qa_${a.id}`,
    customer_details: {
      email: "qa@example.invalid",
      name: "Synthetic QA",
      phone: null,
    },
  };
}
test("manual rate-limit pruning removes only expired buckets and preserves orders", async () => {
  const f = await fixture(),
    now = new Date(),
    oldKey = `qa-old-${randomUUID()}`,
    currentKey = `qa-current-${randomUUID()}`;
  try {
    const attempt = await f.create();
    await dbTest((db) =>
      db.insert(checkoutRateLimits).values([
        {
          key: oldKey,
          windowStart: new Date(now.getTime() - 25 * 60 * 60 * 1000),
          requests: 30,
        },
        { key: currentKey, windowStart: now, requests: 2 },
      ]),
    );
    const removed = await dbTest((db) => pruneRateLimitBuckets(db, now));
    assert.ok(removed >= 1);
    assert.equal(
      (
        await dbTest((db) =>
          db
            .select()
            .from(checkoutRateLimits)
            .where(eq(checkoutRateLimits.key, oldKey)),
        )
      ).length,
      0,
    );
    assert.equal(
      (
        await dbTest((db) =>
          db
            .select()
            .from(checkoutRateLimits)
            .where(eq(checkoutRateLimits.key, currentKey)),
        )
      )[0].requests,
      2,
    );
    assert.equal((await f.savedOrder(attempt)).paymentStatus, "pending");
    assert.equal((await f.savedAttempt(attempt)).status, "creating");
  } finally {
    await dbTest((db) =>
      db
        .delete(checkoutRateLimits)
        .where(inArray(checkoutRateLimits.key, [oldKey, currentKey])),
    );
    await f.cleanup();
  }
});
test("12 concurrent launch checkouts are uncapped and create no inventory or reservations", async () => {
  const f = await fixture();
  try {
    const attempts = await Promise.all(
      Array.from({ length: 12 }, () =>
        f.create({ ...f.input, requestKey: randomUUID() }),
      ),
    );
    assert.equal(new Set(attempts.map((a) => a.id)).size, 12);
    assert.ok(attempts.every((a) => a.inventoryMode === "uncapped"));
    assert.deepEqual(await f.counts(), { orders: 12, inventory: 0, holds: 0 });
  } finally {
    await f.cleanup();
  }
});
test("concurrent retries create one order; a failed database transaction leaves no partial order", async () => {
  const f = await fixture();
  try {
    const owner = randomUUID();
    const [a, b] = await Promise.all([
      f.create(f.input, owner),
      f.create(f.input, owner),
    ]);
    assert.equal(a.id, b.id);
    await assert.rejects(
      dbTest((db) =>
        createCheckoutAttempt(
          db,
          { ...f.input, requestKey: randomUUID() },
          randomUUID(),
          f.lines,
          () => {
            throw new Error("Injected failure before commit");
          },
        ),
      ),
    );
    assert.deepEqual(await f.counts(), { orders: 1, inventory: 0, holds: 0 });
    await assert.rejects(
      f.create({ ...f.input, requestKey: randomUUID() }, owner),
    );
    await assert.rejects(f.create(f.input, randomUUID()));
  } finally {
    await f.cleanup();
  }
});
test("a published blackout prevents new orders while preserving an existing payable checkout", async () => {
  const f = await fixture();
  try {
    const reopened = await dbTest((db) => openPickupDate(db, f.pickup.date));
    assert.equal(reopened.id, f.pickup.id);
    const a = await f.create();
    await assert.rejects(
      f.create({ ...f.input, requestKey: randomUUID() }, undefined, [
        f.pickup.date,
      ]),
      { code: "pickup_closed" },
    );
    assert.equal(
      (await f.create(f.input, a.ownerHash, [f.pickup.date])).id,
      a.id,
    );
    await dbTest((db) => applySession(db, session(a)));
    assert.equal((await f.savedOrder(a)).paymentStatus, "paid");
    assert.deepEqual(await f.counts(), { orders: 1, inventory: 0, holds: 0 });
  } finally {
    await f.cleanup();
  }
});
test("checkout locks the stored pickup details and rejects a concurrent configuration conflict", async () => {
  const f = await fixture();
  try {
    let locked: () => void = () => {},
      release: () => void = () => {};
    const lockedPromise = new Promise<void>((resolve) => {
        locked = resolve;
      }),
      releasePromise = new Promise<void>((resolve) => {
        release = resolve;
      });
    const closing = dbTest((db) =>
      db.transaction(async (tx) => {
        await tx
          .select()
          .from(pickupDates)
          .where(eq(pickupDates.id, f.pickup.id))
          .for("update");
        locked();
        await releasePromise;
        await tx
          .update(pickupDates)
          .set({ cutoffAt: new Date(0) })
          .where(eq(pickupDates.id, f.pickup.id));
      }),
    );
    await lockedPromise;
    const creating = f.create();
    const rejected = assert.rejects(creating);
    release();
    await closing;
    await rejected;
    assert.equal((await f.counts()).orders, 0);
  } finally {
    await f.cleanup();
  }
});
test("legacy disabled/source flags do not close future Fridays, while invalid days and conflicting commitments are rejected", async () => {
  const f = await fixture();
  try {
    await assert.rejects(dbTest((db) => openPickupDate(db, "2026-11-19")));
    await assert.rejects(dbTest((db) => openPickupDate(db, "2020-01-03")));
    await dbTest((db) =>
      db
        .update(pickupDates)
        .set({ configurationSource: "sanity_legacy", enabled: false })
        .where(eq(pickupDates.id, f.pickup.id)),
    );
    const attempt = await f.create();
    await dbTest((db) => releaseUncreatedAttempt(db, attempt.id));
    await dbTest((db) => openPickupDate(db, f.pickup.date));
    await dbTest((db) =>
      db
        .update(pickupDates)
        .set({ cutoffAt: new Date(0) })
        .where(eq(pickupDates.id, f.pickup.id)),
    );
    await assert.rejects(f.create({ ...f.input, requestKey: randomUUID() }), {
      code: "pickup_configuration_conflict",
    });
    await assert.rejects(dbTest((db) => openPickupDate(db, f.pickup.date)));
    assert.equal((await f.counts()).orders, 1);
  } finally {
    await f.cleanup();
  }
});
test("a future Friday needs no pre-existing row; concurrent first checkouts share one date without stock", async () => {
  const f = await fixture();
  await dbTest((db) =>
    db.delete(pickupDates).where(eq(pickupDates.id, f.pickup.id)),
  );
  try {
    const schedule = buildPickupSchedule(catalog, []);
    assert.ok(pickupDateForCart(f.input.items, schedule, f.pickup.date));
    const attempts = await Promise.all(
      Array.from({ length: 4 }, () =>
        f.create({ ...f.input, requestKey: randomUUID() }),
      ),
    );
    assert.equal(attempts.length, 4);
    const dates = await dbTest((db) =>
      db.select().from(pickupDates).where(eq(pickupDates.date, f.pickup.date)),
    );
    assert.equal(dates.length, 1);
    f.pickup.id = dates[0].id;
    assert.deepEqual(await f.counts(), { orders: 4, inventory: 0, holds: 0 });
  } finally {
    const [saved] = await dbTest((db) =>
      db.select().from(pickupDates).where(eq(pickupDates.date, f.pickup.date)),
    );
    if (saved) f.pickup.id = saved.id;
    await f.cleanup();
  }
});
test("duplicate and out-of-order events confirm an uncapped order once without requiring reservations", async () => {
  const f = await fixture();
  try {
    const a = await f.create(),
      event = f.event("checkout.session.completed");
    const results = await Promise.all([
      dbTest((db) => applySession(db, session(a), event)),
      dbTest((db) => applySession(db, session(a), event)),
    ]);
    assert.ok(results.includes("paid"));
    assert.ok(results.includes("duplicate"));
    await dbTest((db) =>
      applySession(db, session(a, false), f.event("checkout.session.expired")),
    );
    assert.equal((await f.savedOrder(a)).paymentStatus, "paid");
    assert.equal((await f.savedAttempt(a)).status, "paid");
    assert.deepEqual(await f.counts(), { orders: 1, inventory: 0, holds: 0 });
  } finally {
    await f.cleanup();
  }
});
test("expired, definitively failed and paid uncapped attempts retain monotonic states", async () => {
  const f = await fixture();
  try {
    const a = await f.create();
    await dbTest((db) => applySession(db, session(a, false)));
    await dbTest((db) => applySession(db, session(a, false)));
    assert.equal((await f.savedAttempt(a)).status, "expired");
    assert.equal((await f.savedOrder(a)).orderStatus, "cancelled");
    const b = await f.create({ ...f.input, requestKey: randomUUID() });
    await dbTest((db) => releaseUncreatedAttempt(db, b.id));
    await dbTest((db) => releaseUncreatedAttempt(db, b.id));
    assert.equal((await f.savedAttempt(b)).status, "failed");
    const c = await f.create({ ...f.input, requestKey: randomUUID() });
    await dbTest((db) => applySession(db, session(c)));
    await dbTest((db) => releaseUncreatedAttempt(db, c.id));
    assert.equal((await f.savedAttempt(c)).status, "paid");
    assert.equal((await f.counts()).holds, 0);
  } finally {
    await f.cleanup();
  }
});
test("unpaid completion remains pending and only verified payment confirms it", async () => {
  const f = await fixture();
  try {
    const a = await f.create();
    await dbTest((db) =>
      applySession(db, { ...session(a), payment_status: "unpaid" }),
    );
    assert.equal((await f.savedOrder(a)).paymentStatus, "pending");
    await dbTest((db) => applySession(db, session(a)));
    assert.equal((await f.savedOrder(a)).paymentStatus, "paid");
  } finally {
    await f.cleanup();
  }
});
test("mismatched totals roll back event IDs and fulfillment so a valid retry can succeed", async () => {
  const f = await fixture();
  try {
    const a = await f.create(),
      event = f.event("checkout.session.completed");
    await assert.rejects(
      dbTest((db) =>
        applySession(db, { ...session(a), amount_total: 1 }, event),
      ),
    );
    assert.equal((await f.savedOrder(a)).paymentStatus, "pending");
    assert.equal(
      (
        await dbTest((db) =>
          db
            .select()
            .from(processedStripeEvents)
            .where(eq(processedStripeEvents.stripeEventId, event.id)),
        )
      ).length,
      0,
    );
    await dbTest((db) => applySession(db, session(a), event));
    assert.equal((await f.savedOrder(a)).paymentStatus, "paid");
  } finally {
    await f.cleanup();
  }
});
test("legacy holds still sell and release exactly once after moving to manual dates", async () => {
  const f = await fixture();
  try {
    const a = await f.create();
    await f.legacyHold(a);
    const b = await f.create({ ...f.input, requestKey: randomUUID() });
    await f.legacyHold(b);
    await dbTest((db) => closePickupDate(db, f.pickup.date));
    await dbTest((db) => applySession(db, session(a)));
    await dbTest((db) => applySession(db, session(a)));
    await dbTest((db) => applySession(db, session(b, false)));
    await dbTest((db) => applySession(db, session(b, false)));
    await dbTest((db) => openPickupDate(db, f.pickup.date));
    const [stock] = await dbTest((db) =>
      db
        .select()
        .from(inventory)
        .where(eq(inventory.pickupDateId, f.pickup.id)),
    );
    assert.equal(stock.capacity, 2);
    assert.equal(stock.quantityReserved, 0);
    assert.equal(stock.quantitySold, 1);
    const held = await dbTest((db) =>
      db
        .select()
        .from(reservations)
        .where(inArray(reservations.checkoutAttemptId, [a.id, b.id])),
    );
    assert.deepEqual(held.map((h) => h.status).sort(), ["released", "sold"]);
  } finally {
    await f.cleanup();
  }
});
test("a legacy reserved attempt without its hold cannot be fulfilled as uncapped", async () => {
  const f = await fixture();
  try {
    const a = await f.create();
    await dbTest((db) =>
      db
        .update(checkoutAttempts)
        .set({ inventoryMode: sql`default` })
        .where(eq(checkoutAttempts.id, a.id)),
    );
    await assert.rejects(dbTest((db) => applySession(db, session(a))));
    assert.equal((await f.savedOrder(a)).paymentStatus, "pending");
  } finally {
    await f.cleanup();
  }
});
test("stale zero-capacity inventory does not constrain a new uncapped checkout or get overwritten", async () => {
  const f = await fixture();
  try {
    await dbTest((db) =>
      db.insert(inventory).values({
        pickupDateId: f.pickup.id,
        productId: "qa-bread",
        variantId: "loaf",
        capacity: 0,
      }),
    );
    const a = await f.create();
    await dbTest((db) => applySession(db, session(a)));
    const [stock] = await dbTest((db) =>
      db
        .select()
        .from(inventory)
        .where(eq(inventory.pickupDateId, f.pickup.id)),
    );
    assert.equal(stock.capacity, 0);
    assert.equal(stock.quantitySold, 0);
    assert.equal((await f.savedOrder(a)).paymentStatus, "paid");
  } finally {
    await f.cleanup();
  }
});
test("full refunds update financial status without deleting snapshots or creating stock", async () => {
  const f = await fixture();
  try {
    const a = await f.create();
    await dbTest((db) => applySession(db, session(a)));
    await dbTest((db) =>
      recordRefund(
        db,
        {
          livemode: false,
          payment_intent: `pi_qa_${a.id}`,
          currency: "usd",
          amount: 1200,
          refunded: true,
        },
        f.event("charge.refunded"),
      ),
    );
    assert.equal((await f.savedOrder(a)).paymentStatus, "refunded");
    const [item] = await dbTest((db) =>
      db.select().from(orderItems).where(eq(orderItems.orderId, a.orderId)),
    );
    assert.equal(item.unitPriceCents, 1200);
    assert.equal(item.productNameSnapshot, "QA Bread");
    assert.equal((await f.counts()).inventory, 0);
  } finally {
    await f.cleanup();
  }
});
test("the Checkout service marks definite creation failures but preserves uncertain API outcomes", async () => {
  const f = await fixture();
  try {
    const stripe = new Stripe("sk_test_external_boundary_only"),
      a = await f.create();
    stripe.checkout.sessions.create = async () => {
      throw new Stripe.errors.StripeInvalidRequestError({
        message: "Injected invalid request",
        type: "invalid_request_error",
      });
    };
    await assert.rejects(
      createOrRecoverSession(a, { stripe, database: dbTest }),
    );
    assert.equal((await f.savedAttempt(a)).status, "failed");
    const b = await f.create({ ...f.input, requestKey: randomUUID() });
    stripe.checkout.sessions.create = async () => {
      throw new Stripe.errors.StripeConnectionError({
        message: "Injected network loss",
      });
    };
    await assert.rejects(
      createOrRecoverSession(b, { stripe, database: dbTest }),
    );
    assert.equal((await f.savedAttempt(b)).status, "creating");
    assert.equal((await f.counts()).holds, 0);
  } finally {
    await f.cleanup();
  }
});

test("unchecked checkout stores false and no consent evidence; database rejects opt-in without evidence", async () => {
  const f = await fixture();
  try {
    const attempt = await f.create();
    const [order] = await dbTest((db) =>
      db.select().from(orders).where(eq(orders.id, attempt.orderId)),
    );
    assert.equal(order.marketingOptIn, false);
    assert.equal(order.marketingConsentAt, null);
    assert.equal(order.marketingConsentSource, null);
    assert.equal(order.marketingConsentVersion, null);
    assert.equal(order.marketingConsentText, null);
    await assert.rejects(
      dbTest((db) =>
        db
          .update(orders)
          .set({ marketingOptIn: true })
          .where(eq(orders.id, order.id)),
      ),
    );
  } finally {
    await f.cleanup();
  }
});
test("opt-in is associated with Stripe's verified email and immutable under retries, duplicate events and changed CMS wording", async () => {
  const f = await fixture();
  const eventId = `evt_qa_${randomUUID()}`;
  try {
    const text = "Email me Salted newsletters. I can unsubscribe anytime.";
    const input = {
      ...f.input,
      marketingOptIn: true,
      marketingConsentText: text,
    };
    const owner = randomUUID();
    const attempt = await f.create(input, owner);
    const [before] = await dbTest((db) =>
      db.select().from(orders).where(eq(orders.id, attempt.orderId)),
    );
    assert.equal(before.marketingOptIn, true);
    assert.equal(before.marketingConsentSource, "checkout_drawer");
    assert.equal(before.marketingConsentText, text);
    assert.ok(before.marketingConsentAt);
    assert.match(before.marketingConsentVersion ?? "", /^[a-f0-9]{64}$/);
    assert.equal(before.customerEmail, null);
    await f.create(input, owner);
    await assert.rejects(f.create({ ...input, marketingOptIn: false }, owner));
    await assert.rejects(
      f.create(
        { ...input, marketingConsentText: "Revised newsletter text" },
        owner,
      ),
    );
    const paid = session(attempt);
    paid.customer_details = {
      email: "actual-checkout@example.invalid",
      name: "Synthetic buyer",
      phone: null,
    };
    await dbTest((db) =>
      applySession(db, paid, {
        id: eventId,
        type: "checkout.session.completed",
      }),
    );
    await dbTest((db) =>
      applySession(db, paid, {
        id: eventId,
        type: "checkout.session.completed",
      }),
    );
    const [after] = await dbTest((db) =>
      db.select().from(orders).where(eq(orders.id, attempt.orderId)),
    );
    assert.equal(after.customerEmail, "actual-checkout@example.invalid");
    assert.equal(after.marketingOptIn, true);
    assert.equal(after.marketingConsentText, before.marketingConsentText);
    assert.equal(after.marketingConsentVersion, before.marketingConsentVersion);
    assert.equal(
      after.marketingConsentAt?.getTime(),
      before.marketingConsentAt.getTime(),
    );
  } finally {
    await dbTest((db) =>
      db
        .delete(processedStripeEvents)
        .where(eq(processedStripeEvents.stripeEventId, eventId)),
    );
    await f.cleanup();
  }
});
test("abandoned opted-in checkout remains unpaid without a stored email after expiration", async () => {
  const f = await fixture();
  try {
    const attempt = await f.create({
      ...f.input,
      marketingOptIn: true,
      marketingConsentText: "Send me newsletter emails. I can unsubscribe.",
    });
    await dbTest((db) => applySession(db, session(attempt, false)));
    const [order] = await dbTest((db) =>
      db.select().from(orders).where(eq(orders.id, attempt.orderId)),
    );
    assert.equal(order.marketingOptIn, true);
    assert.equal(order.customerEmail, null);
    assert.equal(order.paymentStatus, "pending");
    assert.equal(order.orderStatus, "cancelled");
  } finally {
    await f.cleanup();
  }
});

test("unsubscribe changes current status, preserves consent evidence and survives repeated payment events", async () => {
  const f = await fixture();
  const email = `unsubscribe-${randomUUID()}@example.invalid`;
  try {
    const attempt = await f.create({
      ...f.input,
      marketingOptIn: true,
      marketingConsentText: "Send me newsletter emails. I can unsubscribe.",
    });
    const paid = session(attempt);
    paid.customer_details!.email = email;
    await dbTest((db) => applySession(db, paid));
    assert.equal(
      await dbTest((db) => canSendMarketingEmail(db, email.toUpperCase())),
      true,
    );
    const [before] = await dbTest((db) =>
      db.select().from(orders).where(eq(orders.id, attempt.orderId)),
    );
    await dbTest((db) => unsubscribeEmail(db, ` ${email.toUpperCase()} `));
    await dbTest((db) => applySession(db, paid));
    await dbTest((db) =>
      applySession(db, {
        ...paid,
        status: "expired",
        payment_status: "unpaid",
      }),
    );
    assert.equal(await dbTest((db) => canSendMarketingEmail(db, email)), false);
    const [after] = await dbTest((db) =>
      db.select().from(orders).where(eq(orders.id, attempt.orderId)),
    );
    assert.equal(after.marketingOptIn, true);
    assert.equal(
      after.marketingConsentAt?.getTime(),
      before.marketingConsentAt?.getTime(),
    );
    assert.equal(after.marketingConsentText, before.marketingConsentText);
    assert.equal(after.paymentStatus, "paid");
    const records = await dbTest((db) =>
      db
        .select()
        .from(marketingSubscriptions)
        .where(eq(marketingSubscriptions.email, email)),
    );
    assert.equal(records.length, 1);
    assert.equal(records[0].unsubscribeSource, "public_form");
    assert.ok(records[0].unsubscribedAt);
  } finally {
    await f.cleanup();
  }
});
test("an unsubscribe while payment is pending defeats a late successful payment", async () => {
  const f = await fixture();
  const email = `pending-unsubscribe-${randomUUID()}@example.invalid`;
  try {
    const attempt = await f.create({
      ...f.input,
      marketingOptIn: true,
      marketingConsentText: "Send me newsletter emails. I can unsubscribe.",
    });
    await dbTest((db) => unsubscribeEmail(db, email));
    const paid = session(attempt);
    paid.customer_details!.email = email;
    await dbTest((db) => applySession(db, paid));
    assert.equal(await dbTest((db) => canSendMarketingEmail(db, email)), false);
    const [order] = await dbTest((db) =>
      db.select().from(orders).where(eq(orders.id, attempt.orderId)),
    );
    assert.equal(order.paymentStatus, "paid");
    assert.equal(order.marketingOptIn, true);
  } finally {
    await dbTest((db) =>
      db
        .delete(marketingSubscriptions)
        .where(eq(marketingSubscriptions.email, email)),
    );
    await f.cleanup();
  }
});
test("repeated withdrawal refreshes suppression against consent captured since the previous withdrawal", async () => {
  const f = await fixture();
  const email = `repeat-unsubscribe-${randomUUID()}@example.invalid`;
  try {
    await dbTest((db) => unsubscribeEmail(db, email));
    const attempt = await f.create({
      ...f.input,
      marketingOptIn: true,
      marketingConsentText: "Send me newsletter emails. I can unsubscribe.",
    });
    await dbTest((db) => unsubscribeEmail(db, email));
    const paid = session(attempt);
    paid.customer_details!.email = email;
    await dbTest((db) => applySession(db, paid));
    assert.equal(await dbTest((db) => canSendMarketingEmail(db, email)), false);
  } finally {
    await dbTest((db) =>
      db
        .delete(marketingSubscriptions)
        .where(eq(marketingSubscriptions.email, email)),
    );
    await f.cleanup();
  }
});
test("a later affirmative paid checkout can resubscribe; an unchecked purchase cannot", async () => {
  const f = await fixture();
  const email = `resubscribe-${randomUUID()}@example.invalid`;
  try {
    await dbTest((db) => unsubscribeEmail(db, email));
    const attempt = await f.create({
      ...f.input,
      marketingOptIn: true,
      marketingConsentText: "Send me newsletter emails. I can unsubscribe.",
    });
    const paid = session(attempt);
    paid.customer_details!.email = email;
    await dbTest((db) => applySession(db, paid));
    const [preference] = await dbTest((db) =>
      db
        .select()
        .from(marketingSubscriptions)
        .where(eq(marketingSubscriptions.email, email)),
    );
    assert.equal(preference.subscribed, true);
    assert.equal(preference.unsubscribedAt, null);
    assert.equal(preference.lastConsentOrderId, attempt.orderId);
    assert.equal(
      await dbTest((db) => unsubscribeSubscription(db, preference.id)),
      true,
    );
    const unchecked = await f.create({ ...f.input, requestKey: randomUUID() });
    const second = session(unchecked);
    second.customer_details!.email = email;
    await dbTest((db) => applySession(db, second));
    assert.equal(await dbTest((db) => canSendMarketingEmail(db, email)), false);
    const [after] = await dbTest((db) =>
      db
        .select()
        .from(marketingSubscriptions)
        .where(eq(marketingSubscriptions.email, email)),
    );
    assert.equal(after.unsubscribeSource, "signed_link");
    assert.equal(
      await dbTest((db) => unsubscribeSubscription(db, preference.id)),
      true,
    );
    assert.equal(
      await dbTest((db) => unsubscribeSubscription(db, randomUUID())),
      false,
    );
  } finally {
    await f.cleanup();
  }
});
test("concurrent unknown-address opt-outs create one normalized suppression record and fail closed for missing addresses", async () => {
  const email = `unknown-${randomUUID()}@example.invalid`;
  try {
    assert.equal(await dbTest((db) => canSendMarketingEmail(db, email)), false);
    await Promise.all(
      [email, email.toUpperCase(), ` ${email} `].map((address) =>
        dbTest((db) => unsubscribeEmail(db, address)),
      ),
    );
    const rows = await dbTest((db) =>
      db
        .select()
        .from(marketingSubscriptions)
        .where(eq(marketingSubscriptions.email, email)),
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].subscribed, false);
    assert.equal(rows[0].lastConsentOrderId, null);
    await assert.rejects(
      dbTest((db) =>
        db.insert(marketingSubscriptions).values({
          email: email.toUpperCase(),
          subscribed: false,
          unsubscribedAt: new Date(),
          unsubscribeSource: "public_form",
        }),
      ),
    );
    await assert.rejects(
      dbTest((db) =>
        db
          .insert(marketingSubscriptions)
          .values({ email: `bad-${email}`, subscribed: true }),
      ),
    );
  } finally {
    await dbTest((db) =>
      db
        .delete(marketingSubscriptions)
        .where(eq(marketingSubscriptions.email, email)),
    );
  }
});
test("preference persistence shares the paid-order transaction and a failure rolls back order fulfillment", async () => {
  const f = await fixture();
  const email = `rollback-${randomUUID()}@example.invalid`;
  try {
    const attempt = await f.create({
      ...f.input,
      marketingOptIn: true,
      marketingConsentText: "Send me newsletter emails. I can unsubscribe.",
    });
    const paid = session(attempt);
    paid.customer_details!.email = "invalid-email";
    await assert.rejects(dbTest((db) => applySession(db, paid)));
    const [order] = await dbTest((db) =>
      db.select().from(orders).where(eq(orders.id, attempt.orderId)),
    );
    assert.equal(order.paymentStatus, "pending");
    assert.equal(order.customerEmail, null);
    paid.customer_details!.email = email;
    await dbTest((db) => applySession(db, paid));
    assert.equal(await dbTest((db) => canSendMarketingEmail(db, email)), true);
  } finally {
    await f.cleanup();
  }
});

function emailDependencies(
  a: Attempt,
  send: (payload: EmailPayload, key: string) => Promise<string>,
) {
  return {
    database: dbTest,
    origin: "https://saltedfocaccia.com",
    secret: "qa-only-order-confirmation-secret-32-characters",
    copy: async () => ({
      orderEmail: initialOrderEmailCopy,
      pickupGuidance: "Published pickup guidance.",
    }),
    payment: async (id: string) => ({
      id,
      livemode: false,
      status: "succeeded" as const,
      amount: 1200,
      currency: "usd",
      latest_charge: {
        receipt_url: `https://pay.stripe.com/receipts/${a.id}`,
        livemode: false,
        paid: true,
        amount: 1200,
        currency: "usd",
      },
    }),
    send,
  };
}
const emailRows = (a: Attempt) =>
  dbTest((db) =>
    db.select().from(orderEmails).where(eq(orderEmails.orderId, a.orderId)),
  );

test("only a verified paid transition atomically queues one email for each audience", async () => {
  const f = await fixture();
  try {
    const a = await f.create();
    assert.equal((await emailRows(a)).length, 0);
    const paid = session(a);
    await assert.rejects(
      dbTest((db) => applySession(db, { ...paid, amount_total: 1 })),
    );
    assert.equal((await emailRows(a)).length, 0);
    const event = f.event("checkout.session.completed");
    await dbTest((db) => applySession(db, paid, event));
    await dbTest((db) => applySession(db, paid, event));
    await dbTest((db) =>
      applySession(
        db,
        paid,
        f.event("checkout.session.async_payment_succeeded"),
      ),
    );
    const queued = await emailRows(a);
    assert.equal(queued.length, 2);
    assert.deepEqual(queued.map((row) => row.audience).sort(), [
      "business",
      "customer",
    ]);
    assert.ok(
      queued.every((row) => row.status === "pending" && row.payload === null),
    );
    assert.equal((await f.savedOrder(a)).notificationStatus, "pending");
  } finally {
    await f.cleanup();
  }
});

test("a failed customer copy retries with its original payload and key while the successful business copy stays sent", async () => {
  const f = await fixture();
  try {
    const a = await f.create();
    const paid = session(a);
    await dbTest((db) => applySession(db, paid));
    const requests: { payload: EmailPayload; key: string }[] = [];
    const dependencies = emailDependencies(a, async (payload, key) => {
      requests.push({ payload, key });
      if (payload.to.endsWith("@example.invalid"))
        throw new Error("Synthetic uncertain provider failure");
      return "email-business";
    });
    await assert.rejects(deliverOrderEmails(a.orderId, dependencies));
    const first = await emailRows(a);
    assert.equal(
      first.find((row) => row.audience === "business")?.status,
      "sent",
    );
    assert.equal(
      first.find((row) => row.audience === "customer")?.status,
      "pending",
    );
    assert.equal((await f.savedOrder(a)).paymentStatus, "paid");
    const customer = requests.find((request) =>
      request.payload.to.endsWith("@example.invalid"),
    );
    assert.ok(customer);
    assert.equal(requests[0].payload.from, "feedme@saltedfocaccia.com");
    assert.equal(requests[0].payload.to, "feedme@saltedfocaccia.com");
    await deliverOrderEmails(a.orderId, {
      ...dependencies,
      copy: async () => {
        throw new Error("Retries must use persisted wording");
      },
      payment: async () => {
        throw new Error("Retries must use persisted receipt");
      },
      send: async (payload, key) => {
        assert.deepEqual(payload, customer.payload);
        assert.equal(key, customer.key);
        return "email-customer";
      },
    });
    assert.ok(
      (await emailRows(a)).every(
        (row) => row.status === "sent" && row.providerId,
      ),
    );
    assert.equal((await f.savedOrder(a)).notificationStatus, "sent");
    await dbTest((db) =>
      applySession(db, paid, f.event("checkout.session.completed")),
    );
    await deliverOrderEmails(a.orderId, {
      ...dependencies,
      send: async () => {
        assert.fail("Duplicate events cannot resend confirmations");
      },
    });
  } finally {
    await f.cleanup();
  }
});

test("parallel delivery workers send each audience at most once", async () => {
  const f = await fixture();
  try {
    const a = await f.create();
    await dbTest((db) => applySession(db, session(a)));
    const keys = new Set<string>();
    const dependencies = emailDependencies(a, async (_payload, key) => {
      assert.equal(keys.has(key), false);
      keys.add(key);
      await new Promise((resolve) => setTimeout(resolve, 100));
      return `email-${keys.size}`;
    });
    await Promise.allSettled([
      deliverOrderEmails(a.orderId, dependencies),
      deliverOrderEmails(a.orderId, dependencies),
    ]);
    await deliverOrderEmails(a.orderId, dependencies);
    assert.equal(keys.size, 2);
    assert.ok((await emailRows(a)).every((row) => row.status === "sent"));
  } finally {
    await f.cleanup();
  }
});

test("ambiguous sends beyond the provider retention window require review without automatic resends", async () => {
  const f = await fixture();
  try {
    const a = await f.create();
    await dbTest((db) => applySession(db, session(a)));
    const dependencies = emailDependencies(a, async () => {
      throw new Error("Synthetic lost response");
    });
    await assert.rejects(deliverOrderEmails(a.orderId, dependencies));
    await dbTest((db) =>
      db
        .update(orderEmails)
        .set({ firstAttemptAt: new Date(Date.now() - 25 * 60 * 60_000) })
        .where(eq(orderEmails.orderId, a.orderId)),
    );
    await assert.rejects(
      deliverOrderEmails(a.orderId, {
        ...dependencies,
        send: async () => {
          assert.fail("Do not resend after idempotency expires");
        },
      }),
    );
    assert.ok((await emailRows(a)).every((row) => row.status === "review"));
    assert.equal((await f.savedOrder(a)).notificationStatus, "review");
  } finally {
    await f.cleanup();
  }
});

test("unverified receipts and unpaid or refunded orders never send confirmations", async () => {
  const f = await fixture();
  try {
    const a = await f.create();
    const dependencies = emailDependencies(a, async () => {
      assert.fail("No message should be sent");
    });
    await deliverOrderEmails(a.orderId, dependencies);
    await dbTest((db) => applySession(db, session(a)));
    await assert.rejects(
      deliverOrderEmails(a.orderId, {
        ...dependencies,
        payment: async (id) => ({
          id,
          livemode: true,
          status: "succeeded",
          amount: 1200,
          currency: "usd",
          latest_charge: null,
        }),
      }),
    );
    assert.ok((await emailRows(a)).every((row) => row.firstAttemptAt === null));
    await dbTest((db) =>
      recordRefund(
        db,
        {
          livemode: false,
          payment_intent: `pi_qa_${a.id}`,
          currency: "usd",
          amount: 1200,
          refunded: true,
        },
        f.event("charge.refunded"),
      ),
    );
    await deliverOrderEmails(a.orderId, dependencies);
  } finally {
    await f.cleanup();
  }
});
