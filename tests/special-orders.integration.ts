import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { withDatabase, type Database } from "../src/db/client";
import { marketingSubscriptions, specialOrderRequests } from "../src/db/schema";
import { saveSpecialOrder } from "../src/special-orders/store";
import { deliverSpecialOrderNotification } from "../src/special-orders/email";
import {
  canSendMarketingEmail,
  unsubscribeEmail,
} from "../src/marketing/preferences";
import { hash } from "../src/commerce/validation";
import type { EmailPayload } from "../src/commerce/email-types";
import type { SPECIAL_ORDERS_QUERY_RESULT } from "../sanity.types";
import { specialOrderNotificationCopy } from "../scripts/migrations/activate-special-orders";

const qa = process.env.TEST_DATABASE_URL;
const app = process.env.DATABASE_URL;
if (
  !qa ||
  !app ||
  new URL(qa).hostname.replace("-pooler.", ".") ===
    new URL(app).hostname.replace("-pooler.", ".")
)
  throw new Error("Use a separate migrated QA branch for special-order tests.");
const dbTest = <T>(operation: (db: Database) => Promise<T>) =>
  withDatabase(operation, qa);
const label = "Email me newsletters. I can unsubscribe anytime.";
const copy = async (): Promise<SPECIAL_ORDERS_QUERY_RESULT> => ({
  _id: "specialOrdersPage",
  _type: "specialOrdersPage",
  _rev: "qa",
  _createdAt: "",
  _updatedAt: "",
  internalName: "QA",
  notificationEmail: specialOrderNotificationCopy,
});
function fixture() {
  const email = `special-qa-${randomUUID()}@example.com`;
  const input = {
    requestKey: randomUUID(),
    name: "QA Request",
    email,
    phone: "9165550100",
    date: "2099-01-01",
    products: "Four focaccia pans for a dinner. Please slice.",
    marketingOptIn: false,
  };
  const keys = [input.requestKey];
  const save = (value: unknown = input, now?: Date) =>
    saveSpecialOrder(value, {
      database: dbTest,
      consentLabel: async () => label,
      now,
    });
  const saved = async (id: string) =>
    dbTest(
      async (db) =>
        (
          await db
            .select()
            .from(specialOrderRequests)
            .where(eq(specialOrderRequests.id, id))
        )[0],
    );
  const cleanup = () =>
    dbTest(async (db) => {
      await db
        .delete(marketingSubscriptions)
        .where(eq(marketingSubscriptions.email, email));
      await db
        .delete(specialOrderRequests)
        .where(inArray(specialOrderRequests.requestKey, keys));
    });
  return { input, email, keys, save, saved, cleanup };
}

test("real Postgres saves and deduplicates concurrent requests, rejects changed retries and keeps unchecked consent empty", async () => {
  const f = fixture();
  try {
    const ids = await Promise.all([f.save(), f.save()]);
    assert.equal(ids[0], ids[1]);
    const row = await f.saved(ids[0]);
    assert.equal(row.products, f.input.products);
    assert.equal(row.notificationStatus, "pending");
    assert.equal(row.marketingOptIn, false);
    assert.equal(row.marketingConsentAt, null);
    assert.equal(
      await dbTest((db) => canSendMarketingEmail(db, f.email)),
      false,
    );
    await assert.rejects(
      f.save({ ...f.input, products: "Different bread request." }),
      /already been used/,
    );
    await assert.rejects(
      f.save({ ...f.input, requestKey: randomUUID(), date: "2099-02-30" }),
    );
  } finally {
    await f.cleanup();
  }
});

test("special-order consent is atomic, checks published wording, and saved retries cannot reverse an unsubscribe", async () => {
  const f = fixture();
  const input = {
    ...f.input,
    marketingOptIn: true,
    marketingConsentText: label,
  };
  try {
    await assert.rejects(
      f.save({ ...input, marketingConsentText: "Stale wording" }),
      /wording changed/,
    );
    const missing = await dbTest((db) =>
      db
        .select()
        .from(specialOrderRequests)
        .where(eq(specialOrderRequests.requestKey, input.requestKey)),
    );
    assert.equal(missing.length, 0);
    const id = await f.save(input);
    const row = await f.saved(id);
    assert.equal(row.marketingConsentSource, "special_order_form");
    assert.equal(row.marketingConsentText, label);
    assert.equal(row.marketingConsentVersion, hash(label));
    assert.equal(
      await dbTest((db) => canSendMarketingEmail(db, f.email)),
      true,
    );
    const [subscription] = await dbTest((db) =>
      db
        .select()
        .from(marketingSubscriptions)
        .where(eq(marketingSubscriptions.email, f.email)),
    );
    assert.equal(subscription.lastConsentSpecialOrderId, id);
    assert.equal(subscription.lastConsentOrderId, null);
    await dbTest((db) => unsubscribeEmail(db, f.email));
    await f.save(input);
    assert.equal(
      await dbTest((db) => canSendMarketingEmail(db, f.email)),
      false,
    );
    // Even a newly delivered request whose consent predates withdrawal cannot win.
    const olderKey = randomUUID();
    f.keys.push(olderKey);
    await f.save(
      { ...input, requestKey: olderKey },
      new Date(Date.now() - 60_000),
    );
    assert.equal(
      await dbTest((db) => canSendMarketingEmail(db, f.email)),
      false,
    );
    const newKey = randomUUID();
    f.keys.push(newKey);
    await f.save({ ...input, requestKey: newKey });
    assert.equal(
      await dbTest((db) => canSendMarketingEmail(db, f.email)),
      true,
    );
    const uncheckedKey = randomUUID();
    f.keys.push(uncheckedKey);
    await f.save({ ...f.input, requestKey: uncheckedKey });
    assert.equal(
      await dbTest((db) => canSendMarketingEmail(db, f.email)),
      true,
    );
  } finally {
    await f.cleanup();
  }
});

test("failed notifications persist identical retry payloads and idempotency keys; sent notifications do not send twice", async () => {
  const f = fixture();
  try {
    const id = await f.save();
    const attempts: { payload: EmailPayload; key: string }[] = [];
    const send = async (payload: EmailPayload, key: string) => {
      attempts.push({ payload, key });
      if (attempts.length === 1) throw new Error("Uncertain provider result");
      return "qa-provider-id";
    };
    await assert.rejects(
      deliverSpecialOrderNotification(id, { database: dbTest, copy, send }),
    );
    assert.equal((await f.saved(id)).notificationStatus, "pending");
    await deliverSpecialOrderNotification(id, {
      database: dbTest,
      copy: async () => {
        throw new Error("Saved payload must be reused");
      },
      send,
    });
    await deliverSpecialOrderNotification(id, { database: dbTest, copy, send });
    assert.equal(attempts.length, 2);
    assert.deepEqual(attempts[0], attempts[1]);
    assert.equal(attempts[0].key, `salted-special-order/${id}`);
    assert.equal(attempts[0].payload.to, "feedme@saltedfocaccia.com");
    assert.equal(attempts[0].payload.replyTo, f.email);
    assert.match(attempts[0].payload.text, /Four focaccia pans/);
    assert.match(attempts[0].payload.text, /2099-01-01/);
    assert.equal((await f.saved(id)).notificationStatus, "sent");
  } finally {
    await f.cleanup();
  }
});

test("notification leases serialize workers and aged ambiguous sends persist review state", async () => {
  const f = fixture();
  try {
    const id = await f.save();
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started = () => {};
    const sending = new Promise<void>((resolve) => {
      started = resolve;
    });
    let calls = 0;
    const send = async () => {
      calls++;
      started();
      await gate;
      return "qa-provider";
    };
    const first = deliverSpecialOrderNotification(id, {
      database: dbTest,
      copy,
      send,
    });
    await sending;
    try {
      await assert.rejects(
        deliverSpecialOrderNotification(id, { database: dbTest, copy, send }),
        /already sending/,
      );
    } finally {
      release();
      await first;
    }
    assert.equal(calls, 1);
    const key = randomUUID();
    f.keys.push(key);
    const oldId = await f.save({ ...f.input, requestKey: key });
    await dbTest((db) =>
      db
        .update(specialOrderRequests)
        .set({ firstAttemptAt: new Date(Date.now() - 24 * 60 * 60_000) })
        .where(eq(specialOrderRequests.id, oldId)),
    );
    await assert.rejects(
      deliverSpecialOrderNotification(oldId, { database: dbTest, copy, send }),
      /operator review/,
    );
    assert.equal((await f.saved(oldId)).notificationStatus, "review");
    assert.equal(calls, 1);
  } finally {
    await f.cleanup();
  }
});
