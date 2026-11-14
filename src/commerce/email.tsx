import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { render } from "react-email";
import { z } from "zod";
import type Stripe from "stripe";
import { withDatabase, type Database } from "../db/client";
import { orderEmails, orderItems, orders, pickupDates } from "../db/schema";
import {
  OrderConfirmationEmail,
  type OrderEmailDetails,
} from "../emails/order-confirmation";
import { siteOrigin, stripeClient } from "./config";
import { fetchOrderEmailCopy } from "./catalog";
import { confirmationEmailUrl } from "./confirmation-token";
import type { EmailPayload } from "./email-types";

type ReceiptPayment = Pick<
  Stripe.PaymentIntent,
  "id" | "livemode" | "status" | "amount" | "currency"
> & {
  latest_charge:
    | Pick<
        Stripe.Charge,
        "receipt_url" | "livemode" | "paid" | "amount" | "currency"
      >
    | string
    | null;
};
type Dependencies = {
  database?: typeof withDatabase;
  payment?: (id: string) => Promise<ReceiptPayment>;
  copy?: typeof fetchOrderEmailCopy;
  send?: (payload: EmailPayload, key: string) => Promise<string>;
  origin?: string;
  secret?: string;
};
export const emailPayloadInput = z.object({
  from: z.email(),
  to: z.email(),
  replyTo: z.email(),
  subject: z
    .string()
    .min(1)
    .max(998)
    .regex(/^[^\r\n]+$/),
  html: z.string().min(1),
  text: z.string().min(1),
});

export async function sendTransactionalEmail(
  payload: EmailPayload,
  key: string,
): Promise<string> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Transactional email is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    },
    body: JSON.stringify({
      from: payload.from,
      to: [payload.to],
      reply_to: payload.replyTo,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  // Never log provider responses: they may contain addresses or message content.
  if (!response.ok) throw new Error("Transactional email request failed.");
  return z.object({ id: z.string().min(1) }).parse(await response.json()).id;
}

export function stripeReceiptUrl(value: unknown): string {
  const url = new URL(z.url().parse(value));
  if (
    url.protocol !== "https:" ||
    !(url.hostname === "stripe.com" || url.hostname.endsWith(".stripe.com")) ||
    url.username ||
    url.password
  )
    throw new Error("A verified Stripe receipt is required.");
  return url.href;
}

async function claimEmail(db: Database, id: string, payload: EmailPayload) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(orderEmails)
      .where(eq(orderEmails.id, id))
      .for("update");
    if (!row || row.status === "sent") return null;
    const now = new Date();
    if (
      row.status === "review" ||
      (row.firstAttemptAt &&
        now.getTime() - row.firstAttemptAt.getTime() >= 23 * 60 * 60_000)
    ) {
      await tx
        .update(orderEmails)
        .set({
          status: "review",
          leaseId: null,
          leaseUntil: null,
          updatedAt: now,
        })
        .where(eq(orderEmails.id, id));
      return { review: true } as const;
    }
    if (row.leaseUntil && row.leaseUntil > now)
      throw new Error("Email delivery is already in progress; retry later.");
    const leaseId = randomUUID();
    const [claimed] = await tx
      .update(orderEmails)
      .set({
        status: "sending",
        payload: row.payload ?? payload,
        firstAttemptAt: row.firstAttemptAt ?? now,
        leaseId,
        leaseUntil: new Date(now.getTime() + 60_000),
        updatedAt: now,
      })
      .where(eq(orderEmails.id, id))
      .returning();
    return { review: false, row: claimed, leaseId } as const;
  });
}

// Called only after authoritative payment writes commit. Network calls stay outside transactions.
export async function deliverOrderEmails(
  orderId: string,
  dependencies: Dependencies = {},
): Promise<void> {
  const database = dependencies.database ?? withDatabase;
  const loaded = await database(async (db) => {
    const [local] = await db
      .select({ order: orders, pickup: pickupDates })
      .from(orders)
      .innerJoin(pickupDates, eq(orders.pickupDateId, pickupDates.id))
      .where(eq(orders.id, orderId));
    if (
      !local ||
      !["paid", "partially_refunded"].includes(local.order.paymentStatus)
    )
      return null;
    const emails = await db
      .select()
      .from(orderEmails)
      .where(
        and(
          eq(orderEmails.orderId, orderId),
          sql`${orderEmails.status} <> 'sent'`,
        ),
      )
      .orderBy(orderEmails.audience);
    if (!emails.length) return null;
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .orderBy(orderItems.id);
    return { ...local, emails, items };
  });
  if (!loaded) return;
  if (!dependencies.send && !process.env.RESEND_API_KEY)
    throw new Error("Transactional email is not configured.");
  const { order, pickup, emails, items } = loaded;
  let newPayloads: Map<string, EmailPayload> | null = null;
  if (emails.some((email) => !email.payload)) {
    const customerEmail = z.email().parse(order.customerEmail);
    const from = z
      .email()
      .parse(process.env.EMAIL_FROM ?? "feedme@saltedfocaccia.com");
    const businessEmail = z
      .email()
      .parse(
        process.env.ORDER_NOTIFICATION_EMAIL ?? "feedme@saltedfocaccia.com",
      );
    if (!order.stripePaymentIntentId)
      throw new Error("Paid order missing payment reference.");
    const [editorial, intent] = await Promise.all([
      (dependencies.copy ?? fetchOrderEmailCopy)(),
      (
        dependencies.payment ??
        ((id) =>
          stripeClient().paymentIntents.retrieve(id, {
            expand: ["latest_charge"],
          }))
      )(order.stripePaymentIntentId),
    ]);
    const charge = intent.latest_charge;
    if (
      intent.livemode ||
      intent.status !== "succeeded" ||
      intent.id !== order.stripePaymentIntentId ||
      intent.amount !== order.totalCents ||
      intent.currency !== order.currency ||
      !charge ||
      typeof charge === "string" ||
      charge.livemode ||
      !charge.paid ||
      charge.amount !== order.totalCents ||
      charge.currency !== order.currency
    )
      throw new Error("Order receipt payment did not verify.");
    const receiptUrl = stripeReceiptUrl(charge.receipt_url);
    const origin = dependencies.origin ?? siteOrigin();
    const confirmationUrl = confirmationEmailUrl(
      order.id,
      origin,
      dependencies.secret,
    );
    const details: OrderEmailDetails = {
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
    };
    newPayloads = new Map();
    for (const email of emails.filter((email) => !email.payload)) {
      const prefix =
        email.audience === "customer"
          ? editorial?.orderEmail?.customerSubject
          : editorial?.orderEmail?.businessSubject;
      // Subject is an operational order identifier when editors clear optional wording.
      const subject = `${prefix?.trim() ? `${prefix.trim()} · ` : ""}${order.orderNumber}`;
      const template = (
        <OrderConfirmationEmail
          order={details}
          audience={email.audience}
          copy={editorial?.orderEmail}
          pickupGuidance={editorial?.pickupGuidance}
          receiptUrl={receiptUrl}
          confirmationUrl={confirmationUrl}
          wordmarkUrl={`${origin}/images/brand/email-wordmark.png`}
        />
      );
      const html = await render(template);
      const text = await render(template, { plainText: true });
      newPayloads.set(
        email.id,
        emailPayloadInput.parse({
          from,
          to: email.audience === "customer" ? customerEmail : businessEmail,
          replyTo: from,
          subject,
          html,
          text,
        }),
      );
    }
  }
  let failed = false;
  for (const email of emails) {
    try {
      const payload = emailPayloadInput.parse(
        email.payload ?? newPayloads?.get(email.id),
      );
      const claim = await database((db) => claimEmail(db, email.id, payload));
      if (!claim) continue;
      if (claim.review) {
        failed = true;
        continue;
      }
      try {
        const providerId = await (dependencies.send ?? sendTransactionalEmail)(
          emailPayloadInput.parse(claim.row.payload),
          `salted-order/${email.id}`,
        );
        const updated = await database((db) =>
          db
            .update(orderEmails)
            .set({
              status: "sent",
              providerId,
              sentAt: new Date(),
              leaseId: null,
              leaseUntil: null,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(orderEmails.id, email.id),
                eq(orderEmails.leaseId, claim.leaseId),
              ),
            )
            .returning({ id: orderEmails.id }),
        );
        if (!updated.length) throw new Error("Email delivery lease changed.");
      } catch {
        await database((db) =>
          db
            .update(orderEmails)
            .set({
              status: "pending",
              leaseId: null,
              leaseUntil: null,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(orderEmails.id, email.id),
                eq(orderEmails.leaseId, claim.leaseId),
              ),
            ),
        );
        failed = true;
      }
    } catch {
      failed = true;
    }
  }
  await database((db) =>
    db.transaction(async (tx) => {
      await tx
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.id, orderId))
        .for("update");
      const states = await tx
        .select({ status: orderEmails.status })
        .from(orderEmails)
        .where(eq(orderEmails.orderId, orderId));
      await tx
        .update(orders)
        .set({
          notificationStatus: states.every((row) => row.status === "sent")
            ? "sent"
            : states.some((row) => row.status === "review")
              ? "review"
              : "pending",
        })
        .where(eq(orders.id, orderId));
    }),
  );
  if (failed)
    throw new Error(
      "Order email delivery incomplete; retry or operator review required.",
    );
}

export async function deliverSessionEmails(sessionId: string): Promise<void> {
  const [order] = await withDatabase((db) =>
    db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.stripeCheckoutSessionId, sessionId)),
  );
  if (order) await deliverOrderEmails(order.id);
}

export async function retryOrderEmails() {
  const pending = await withDatabase((db) =>
    db
      .selectDistinct({ id: orderEmails.orderId })
      .from(orderEmails)
      .innerJoin(orders, eq(orderEmails.orderId, orders.id))
      .where(
        and(
          inArray(orderEmails.status, ["pending", "sending"]),
          inArray(orders.paymentStatus, ["paid", "partially_refunded"]),
        ),
      )
      .limit(25),
  );
  let sent = 0,
    failed = 0;
  for (const order of pending) {
    try {
      await deliverOrderEmails(order.id);
      sent++;
    } catch {
      failed++;
    }
  }
  const [review] = await withDatabase((db) =>
    db
      .select({
        orders: sql<number>`count(distinct ${orderEmails.orderId})::int`,
      })
      .from(orderEmails)
      .where(eq(orderEmails.status, "review")),
  );
  return { sent, failed, needsReview: review.orders };
}
