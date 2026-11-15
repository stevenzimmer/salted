import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { withDatabase, type Database } from "../src/db/client";
import {
  orderItems,
  orders,
  pickupDates,
  pickupReminders,
} from "../src/db/schema";
import { deliverPickupReminders } from "../src/commerce/pickup-reminders";
import type { EmailPayload } from "../src/commerce/email-types";
import { initialOrderEmailCopy } from "../scripts/migrations/order-email";
import { initialPickupReminderCopy } from "../scripts/migrations/pickup-reminder";

const testUrl = process.env.TEST_DATABASE_URL;
const appUrl = process.env.DATABASE_URL;
if (
  !testUrl ||
  !appUrl ||
  new URL(testUrl).hostname.replace("-pooler.", ".") ===
    new URL(appUrl).hostname.replace("-pooler.", ".")
)
  throw new Error(
    "Use an isolated TEST_DATABASE_URL, never the application branch.",
  );
const database = <T>(operation: (db: Database) => Promise<T>) =>
  withDatabase(operation, testUrl);
let index = 0;
async function fixture() {
  const date = new Date("2090-01-01T12:00:00Z");
  while (date.getUTCDay() !== 5) date.setUTCDate(date.getUTCDate() + 1);
  date.setUTCDate(date.getUTCDate() + index++ * 7);
  const day = date.toISOString().slice(0, 10);
  const now = new Date(`${day}T09:00:00-08:00`);
  const [pickup] = await database((db) =>
    db
      .insert(pickupDates)
      .values({
        date: day,
        startTime: "14:00",
        endTime: "18:00",
        timezone: "America/Los_Angeles",
        cutoffAt: new Date(`${day}T00:00:00Z`),
        enabled: true,
        configurationSource: "manual",
      })
      .returning(),
  );
  const ids: string[] = [];
  const create = async (
    overrides: Partial<typeof orders.$inferInsert> = {},
    count = 1,
  ) => {
    const created = await database((db) =>
      db
        .insert(orders)
        .values(
          Array.from({ length: count }, (): typeof orders.$inferInsert => ({
            orderNumber: `SF-QA-${randomUUID()}`,
            pickupDateId: pickup.id,
            ownerHash: randomUUID(),
            customerEmail: "pickup@example.invalid",
            customerName: "Private QA Customer",
            totalCents: 2400,
            subtotalCents: 2400,
            paymentStatus: "paid",
            orderStatus: "confirmed",
            paymentReconciledAt: now,
            ...overrides,
          })),
        )
        .returning(),
    );
    ids.push(...created.map((order) => order.id));
    await database((db) =>
      db.insert(orderItems).values(
        created.map((order) => ({
          orderId: order.id,
          productId: "qa-bread",
          variantId: "whole",
          productNameSnapshot: "Saved QA Focaccia",
          variantNameSnapshot: "Whole",
          unitPriceCents: 1200,
          quantity: 2,
          lineTotalCents: 2400,
        })),
      ),
    );
    return created[0];
  };
  const saved = () =>
    database((db) =>
      db
        .select()
        .from(pickupReminders)
        .where(inArray(pickupReminders.orderId, ids)),
    );
  const deliveries: { payload: EmailPayload; key: string }[] = [];
  const dependencies = {
    database,
    now: () => now,
    origin: "https://saltedfocaccia.com",
    secret: "synthetic-order-confirmation-secret-32-characters",
    copy: async () => ({
      orderEmail: { ...initialOrderEmailCopy, ...initialPickupReminderCopy },
      pickupGuidance: null,
    }),
    send: async (payload: EmailPayload, key: string) => {
      deliveries.push({ payload, key });
      return `re_${randomUUID()}`;
    },
    maxRunMs: 180_000,
  };
  const cleanup = () =>
    database(async (db) => {
      if (ids.length) {
        await db
          .delete(pickupReminders)
          .where(inArray(pickupReminders.orderId, ids));
        await db.delete(orderItems).where(inArray(orderItems.orderId, ids));
        await db.delete(orders).where(inArray(orders.id, ids));
      }
      await db.delete(pickupDates).where(eq(pickupDates.id, pickup.id));
    });
  return { pickup, day, now, create, saved, deliveries, dependencies, cleanup };
}

test("reminders select only today's reconciled paid/partially-refunded confirmed orders, regardless of newsletter opt-in", async () => {
  const f = await fixture();
  try {
    await f.create();
    await f.create({ paymentStatus: "partially_refunded" });
    await f.create({ paymentStatus: "pending", paymentReconciledAt: null });
    await f.create({ paymentStatus: "paid", paymentReconciledAt: null });
    await f.create({ paymentStatus: "refunded" });
    await f.create({ orderStatus: "cancelled" });
    await f.create({ orderStatus: "fulfilled" });
    await f.create({ orderStatus: "pending" });
    const result = await deliverPickupReminders(f.dependencies);
    assert.equal(result.sent, 2);
    assert.equal(result.remaining, 0);
    assert.equal(f.deliveries.length, 2);
    for (const { payload } of f.deliveries) {
      assert.equal(payload.to, "pickup@example.invalid");
      assert.match(payload.text, /2 × Saved QA Focaccia/);
      assert.match(payload.text, /2–6pm/);
      assert.match(payload.text, /4528 Mountaingate/);
      assert.match(payload.text, /\$24/);
    }
    const otherWeek = new Date(f.now);
    otherWeek.setUTCDate(otherWeek.getUTCDate() + 7);
    assert.equal(
      (
        await deliverPickupReminders({
          ...f.dependencies,
          now: () => otherWeek,
        })
      ).sent,
      0,
    );
    assert.equal((await deliverPickupReminders(f.dependencies)).sent, 0);
    assert.equal((await f.saved()).length, 2);
  } finally {
    await f.cleanup();
  }
});

test("ambiguous sends retain immutable payload/key; retries and concurrent workers deliver each order once", async () => {
  const f = await fixture();
  try {
    const order = await f.create();
    const first = await deliverPickupReminders({
      ...f.dependencies,
      send: async (payload, key) => {
        f.deliveries.push({ payload, key });
        throw new Error("Uncertain provider acceptance");
      },
    });
    assert.equal(first.failed, 1);
    assert.equal(first.remaining, 1);
    const [pending] = await f.saved();
    assert.equal(pending.status, "pending");
    let entered: (() => void) | undefined;
    const sending = new Promise<void>((resolve) => {
      entered = resolve;
    });
    let release: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const worker = deliverPickupReminders({
      ...f.dependencies,
      copy: async () => {
        throw new Error("Persisted retries must not read edited CMS content");
      },
      send: async (payload, key) => {
        f.deliveries.push({ payload, key });
        entered?.();
        await blocked;
        return "re_pickup_recovered";
      },
    });
    await Promise.race([
      sending,
      worker.then(() => {
        throw new Error("Worker ended before claiming delivery");
      }),
    ]);
    try {
      const concurrent = await deliverPickupReminders(f.dependencies);
      assert.equal(concurrent.sent, 0);
      assert.equal(concurrent.remaining, 1);
    } finally {
      release?.();
    }
    assert.equal((await worker).sent, 1);
    assert.deepEqual(f.deliveries[0], f.deliveries[1]);
    const [sent] = await f.saved();
    assert.equal(sent.status, "sent");
    assert.equal(sent.providerId, "re_pickup_recovered");
    assert.equal(sent.leaseId, null);
    const [unchanged] = await database((db) =>
      db.select().from(orders).where(eq(orders.id, order.id)),
    );
    assert.equal(unchanged.paymentStatus, "paid");
    assert.equal(unchanged.notificationStatus, "not_scheduled");
    assert.equal((await deliverPickupReminders(f.dependencies)).sent, 0);
  } finally {
    await f.cleanup();
  }
});

test("cancelled or refunded orders cannot send pending reminders; expired idempotency windows require review", async () => {
  const f = await fixture();
  try {
    const cancelled = await f.create();
    const refunded = await f.create();
    const review = await f.create();
    await deliverPickupReminders({
      ...f.dependencies,
      send: async () => {
        throw new Error("Ambiguous");
      },
    });
    await database(async (db) => {
      await db
        .update(orders)
        .set({ orderStatus: "cancelled" })
        .where(eq(orders.id, cancelled.id));
      await db
        .update(orders)
        .set({ paymentStatus: "refunded" })
        .where(eq(orders.id, refunded.id));
      await db
        .update(pickupReminders)
        .set({ firstAttemptAt: new Date(f.now.getTime() - 23 * 60 * 60_000) })
        .where(eq(pickupReminders.orderId, review.id));
    });
    const result = await deliverPickupReminders(f.dependencies);
    assert.equal(result.sent, 0);
    assert.equal(result.remaining, 0);
    assert.equal(result.needsReview, 1);
    assert.equal(f.deliveries.length, 0);
    assert.equal(
      (await f.saved()).find((row) => row.orderId === review.id)?.status,
      "review",
    );
  } finally {
    await f.cleanup();
  }
});

test("time budget preserves backlog; private recovery stops when pickup begins", async () => {
  const f = await fixture();
  try {
    await f.create();
    const limited = await deliverPickupReminders({
      ...f.dependencies,
      maxRunMs: 0,
    });
    assert.equal(limited.remaining, 1);
    assert.equal(limited.sent, 0);
    const late = new Date(f.now.getTime() + 4 * 60 * 60_000);
    assert.equal(
      (await deliverPickupReminders({ ...f.dependencies, now: () => late }))
        .skipped,
      true,
    );
    assert.equal(
      (
        await deliverPickupReminders({
          ...f.dependencies,
          now: () => late,
          retry: true,
        })
      ).sent,
      1,
    );
    assert.equal(
      (
        await deliverPickupReminders({
          ...f.dependencies,
          now: () => new Date(late.getTime() + 60 * 60_000),
          retry: true,
        })
      ).skipped,
      true,
    );
  } finally {
    await f.cleanup();
  }
});

test("missing reminder setup and invalid recipient fail without recording delivery or leaking details", async () => {
  const f = await fixture();
  try {
    await f.create({ customerEmail: null });
    const missing = await deliverPickupReminders({
      ...f.dependencies,
      copy: async () => ({
        orderEmail: initialOrderEmailCopy,
        pickupGuidance: null,
      }),
    });
    assert.equal(missing.failed, 1);
    const invalid = await deliverPickupReminders(f.dependencies);
    assert.equal(invalid.failed, 1);
    assert.equal(invalid.remaining, 1);
    assert.deepEqual(await f.saved(), []);
    assert.equal(f.deliveries.length, 0);
  } finally {
    await f.cleanup();
  }
});

test("a late Hobby invocation finishes after 10am, while new 10am invocations skip and manual sends stop at pickup", async () => {
  const f = await fixture();
  try {
    await f.create({}, 2);
    let clock = new Date(f.now.getTime() + 59 * 60_000 + 59_000);
    const result = await deliverPickupReminders({
      ...f.dependencies,
      now: () => clock,
      send: async (payload, key) => {
        clock = new Date(f.now.getTime() + 61 * 60_000);
        return f.dependencies.send(payload, key);
      },
    });
    assert.equal(result.sent, 2);
    assert.equal(result.remaining, 0);
    await f.create();
    assert.equal(
      (await deliverPickupReminders({ ...f.dependencies, now: () => clock }))
        .skipped,
      true,
    );
    let manualClock = new Date(f.now.getTime() + 5 * 60 * 60_000 - 1000);
    const stopped = await deliverPickupReminders({
      ...f.dependencies,
      retry: true,
      now: () => manualClock,
      copy: async () => {
        manualClock = new Date(f.now.getTime() + 5 * 60 * 60_000);
        return f.dependencies.copy();
      },
    });
    assert.equal(stopped.sent, 0);
    assert.equal(stopped.remaining, 1);
    assert.equal(f.deliveries.length, 2);
  } finally {
    await f.cleanup();
  }
});

test("reminders paginate past 50 orders and recover an abandoned lease with the same delivery key", async () => {
  const f = await fixture();
  try {
    const order = await f.create({}, 51);
    const first = await deliverPickupReminders({
      ...f.dependencies,
      send: async () => {
        throw new Error("Interrupted send");
      },
    });
    assert.equal(first.remaining, 51);
    const pending = (await f.saved()).find((row) => row.orderId === order.id);
    assert.ok(pending);
    await database((db) =>
      db
        .update(pickupReminders)
        .set({
          status: "sending",
          leaseId: randomUUID(),
          leaseUntil: new Date(f.now.getTime() - 1),
        })
        .where(eq(pickupReminders.id, pending.id)),
    );
    const recovered = await deliverPickupReminders(f.dependencies);
    assert.equal(recovered.sent, 51);
    assert.equal(recovered.remaining, 0);
    assert.equal(
      new Set(f.deliveries.map((delivery) => delivery.key)).size,
      51,
    );
    assert.ok(
      f.deliveries.some(
        (delivery) => delivery.key === `salted-pickup/${pending.id}`,
      ),
    );
    assert.equal(
      (await f.saved()).filter((row) => row.status === "sent").length,
      51,
    );
  } finally {
    await f.cleanup();
  }
});
