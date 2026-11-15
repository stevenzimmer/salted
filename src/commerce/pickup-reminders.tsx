import { randomUUID } from "node:crypto";
import { and, eq, gt, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { render } from "react-email";
import { z } from "zod";
import { withDatabase, type Database } from "../db/client";
import { orderItems, orders, pickupDates, pickupReminders } from "../db/schema";
import { PickupReminderEmail } from "../emails/pickup-reminder";
import { pacificToday } from "../data/pickup-dates";
import { hasText } from "../sanity/lib/content";
import { fetchOrderEmailCopy } from "./catalog";
import { siteOrigin } from "./config";
import { confirmationEmailUrl } from "./confirmation-token";
import { emailPayloadInput, sendTransactionalEmail } from "./email";
import type { EmailPayload } from "./email-types";

type Dependencies = {
  database?: typeof withDatabase;
  copy?: typeof fetchOrderEmailCopy;
  send?: typeof sendTransactionalEmail;
  now?: () => Date;
  origin?: string;
  secret?: string;
  // Private operator recovery can run after 10am, but never after pickup starts.
  retry?: boolean;
  maxRunMs?: number;
};

export type PickupReminderResult = {
  sent: number;
  failed: number;
  remaining: number;
  needsReview: number;
  skipped: boolean;
};

export function pickupReminderDate(now: Date, retry = false): string | null {
  const day = pacificToday(now);
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
  return new Date(`${day}T12:00:00Z`).getUTCDay() === 5 &&
    hour >= 9 &&
    hour < (retry ? 14 : 10)
    ? day
    : null;
}

const eligibleOrder = (day: string) =>
  and(
    eq(pickupDates.date, day),
    eq(pickupDates.timezone, "America/Los_Angeles"),
    inArray(orders.paymentStatus, ["paid", "partially_refunded"]),
    eq(orders.orderStatus, "confirmed"),
    isNotNull(orders.paymentReconciledAt),
  );

async function claimReminder(
  db: Database,
  orderId: string,
  day: string,
  payload: EmailPayload,
  now: Date,
) {
  return db.transaction(async (tx) => {
    // Match payment/refund lock order. Concurrent workers serialize per order.
    const [order] = await tx
      .select({ id: orders.id })
      .from(orders)
      .innerJoin(pickupDates, eq(orders.pickupDateId, pickupDates.id))
      .where(and(eq(orders.id, orderId), eligibleOrder(day)))
      .for("update", { of: orders });
    if (!order) return null;
    await tx
      .insert(pickupReminders)
      .values({ orderId, payload, firstAttemptAt: now })
      .onConflictDoNothing({ target: pickupReminders.orderId });
    const [row] = await tx
      .select()
      .from(pickupReminders)
      .where(eq(pickupReminders.orderId, orderId))
      .for("update");
    if (row.status === "sent") return null;
    if (
      row.status === "review" ||
      now.getTime() - row.firstAttemptAt.getTime() >= 23 * 60 * 60_000
    ) {
      await tx
        .update(pickupReminders)
        .set({
          status: "review",
          leaseId: null,
          leaseUntil: null,
          updatedAt: now,
        })
        .where(eq(pickupReminders.id, row.id));
      return null;
    }
    if (row.leaseUntil && row.leaseUntil > now) return null;
    const leaseId = randomUUID();
    const [claimed] = await tx
      .update(pickupReminders)
      .set({
        status: "sending",
        leaseId,
        leaseUntil: new Date(now.getTime() + 60_000),
        updatedAt: now,
      })
      .where(eq(pickupReminders.id, row.id))
      .returning();
    return { ...claimed, leaseId };
  });
}

// Only authoritative, locally reconciled payments qualify. This worker never
// reconciles payments, changes fulfillment, or reads newsletter preferences.
export async function deliverPickupReminders(
  dependencies: Dependencies = {},
): Promise<PickupReminderResult> {
  const now = dependencies.now ?? (() => new Date());
  const day = pickupReminderDate(now(), dependencies.retry);
  const result = {
    sent: 0,
    failed: 0,
    remaining: 0,
    needsReview: 0,
    skipped: !day,
  };
  if (!day) return result;
  if (!dependencies.send && !process.env.RESEND_API_KEY)
    throw new Error("Transactional email is not configured.");
  const started = Date.now();
  // One Hobby invocation must handle the morning's deliveries. Leave room for
  // the final provider request and bookkeeping within the 300-second limit.
  const budget = dependencies.maxRunMs ?? 240_000;
  // One published editorial read per invocation, only for previously unqueued mail.
  let editorial: ReturnType<typeof fetchOrderEmailCopy> | undefined;
  const database = dependencies.database ?? withDatabase;
  return database(async (db) => {
    let cursor: string | undefined;
    let stop = false;
    while (!stop) {
      const batch = await db
        .select({
          order: orders,
          pickup: pickupDates,
          reminder: pickupReminders,
        })
        .from(orders)
        .innerJoin(pickupDates, eq(orders.pickupDateId, pickupDates.id))
        .leftJoin(pickupReminders, eq(pickupReminders.orderId, orders.id))
        .where(
          and(
            eligibleOrder(day),
            cursor ? gt(orders.id, cursor) : undefined,
            or(
              isNull(pickupReminders.id),
              inArray(pickupReminders.status, ["pending", "sending"]),
            ),
          ),
        )
        .orderBy(orders.id)
        .limit(50);
      if (!batch.length) break;
      for (const { order, pickup, reminder } of batch) {
        if (
          Date.now() - started >= budget ||
          // A run admitted at 9:59 can finish after 10am. New scheduled runs
          // still require the 9am hour; all sends stop when pickup begins.
          pickupReminderDate(now(), true) !== day
        ) {
          stop = true;
          break;
        }
        cursor = order.id;
        try {
          let payload = reminder?.payload;
          if (!payload) {
            editorial ??= (dependencies.copy ?? fetchOrderEmailCopy)();
            const copy = (await editorial)?.orderEmail;
            // An uninitialized reminder must not silently send confirmation wording.
            // Editors may clear individual fields after initialization.
            if (
              !copy ||
              !["reminderSubject", "reminderHeading", "reminderBody"].some(
                (key) => key in copy,
              )
            )
              throw new Error("Publish pickup reminder copy before sending.");
            const items = await db
              .select()
              .from(orderItems)
              .where(eq(orderItems.orderId, order.id))
              .orderBy(orderItems.id);
            if (!items.length) throw new Error("Order details are missing.");
            const origin = dependencies.origin ?? siteOrigin();
            const customerEmail = z.email().parse(order.customerEmail);
            const from = z
              .email()
              .parse(process.env.EMAIL_FROM ?? "feedme@saltedfocaccia.com");
            const prefix = hasText(copy.reminderSubject)
              ? copy.reminderSubject.trim()
              : "";
            const template = (
              <PickupReminderEmail
                order={{
                  number: order.orderNumber,
                  customerName: order.customerName,
                  customerEmail,
                  customerPhone: order.customerPhone,
                  totalCents: order.totalCents,
                  pickup,
                  items: items.map((item) => ({
                    name: item.productNameSnapshot,
                    variant: item.variantNameSnapshot,
                    quantity: item.quantity,
                    lineTotalCents: item.lineTotalCents,
                  })),
                }}
                copy={copy}
                confirmationUrl={confirmationEmailUrl(
                  order.id,
                  origin,
                  dependencies.secret,
                )}
                wordmarkUrl={`${origin}/images/brand/email-wordmark.png`}
              />
            );
            payload = emailPayloadInput.parse({
              from,
              to: customerEmail,
              replyTo: from,
              subject: `${prefix ? `${prefix} · ` : ""}${order.orderNumber}`,
              html: await render(template),
              text: await render(template, { plainText: true }),
            });
          }
          // Recheck both the local clock and current payment/fulfillment before claiming.
          if (pickupReminderDate(now(), true) !== day) {
            stop = true;
            break;
          }
          const claim = await claimReminder(db, order.id, day, payload, now());
          if (!claim) continue;
          try {
            const providerId = await (
              dependencies.send ?? sendTransactionalEmail
            )(
              emailPayloadInput.parse(claim.payload),
              `salted-pickup/${claim.id}`,
            );
            const updated = await db
              .update(pickupReminders)
              .set({
                status: "sent",
                providerId,
                sentAt: now(),
                leaseId: null,
                leaseUntil: null,
                updatedAt: now(),
              })
              .where(
                and(
                  eq(pickupReminders.id, claim.id),
                  eq(pickupReminders.leaseId, claim.leaseId),
                ),
              )
              .returning({ id: pickupReminders.id });
            if (!updated.length) throw new Error("Reminder lease changed.");
            result.sent++;
          } catch {
            await db
              .update(pickupReminders)
              .set({
                status: "pending",
                leaseId: null,
                leaseUntil: null,
                updatedAt: now(),
              })
              .where(
                and(
                  eq(pickupReminders.id, claim.id),
                  eq(pickupReminders.leaseId, claim.leaseId),
                ),
              );
            result.failed++;
          }
        } catch {
          // Provider responses, email addresses and capabilities never enter logs.
          result.failed++;
        }
      }
      if (batch.length < 50) break;
    }
    const [counts] = await db
      .select({
        remaining: sql<number>`count(*) filter (where ${pickupReminders.id} is null or ${pickupReminders.status} in ('pending','sending'))::int`,
        needsReview: sql<number>`count(*) filter (where ${pickupReminders.status} = 'review')::int`,
      })
      .from(orders)
      .innerJoin(pickupDates, eq(orders.pickupDateId, pickupDates.id))
      .leftJoin(pickupReminders, eq(pickupReminders.orderId, orders.id))
      .where(eligibleOrder(day));
    return { ...result, ...counts };
  });
}
