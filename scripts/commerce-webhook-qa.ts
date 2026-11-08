// Local sandbox replay against the real HTTP route; never use on a hosted/live endpoint.
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { stripeClient } from "../src/commerce/config";
import { withDatabase } from "../src/db/client";
import { inventory, orders, processedStripeEvents } from "../src/db/schema";
async function main() {
  const origin = new URL(process.argv[2] ?? "http://localhost:3000");
  if (!["localhost", "127.0.0.1"].includes(origin.hostname))
    throw new Error("Local sandbox only");
  const eventId = process.argv[3];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!eventId || !secret)
    throw new Error(
      "Pass the handled sandbox event ID and configure the actual local signing secret.",
    );
  const stripe = stripeClient();
  const event = await stripe.events.retrieve(eventId);
  if (event.livemode || event.data.object.object !== "checkout.session")
    throw new Error("Expected a test Checkout event");
  const sessionId = event.data.object.id;
  const snapshot = () =>
    withDatabase(async (db) => ({
      orders: await db
        .select({
          status: orders.paymentStatus,
          orderStatus: orders.orderStatus,
          total: orders.totalCents,
        })
        .from(orders)
        .where(eq(orders.stripeCheckoutSessionId, sessionId)),
      inventory: await db
        .select({
          id: inventory.id,
          reserved: inventory.quantityReserved,
          sold: inventory.quantitySold,
        })
        .from(inventory)
        .orderBy(inventory.id),
    }));
  const before = await snapshot();
  async function send(body: string, signature?: string) {
    return fetch(new URL("/api/stripe/webhook", origin), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature":
          signature ??
          stripe.webhooks.generateTestHeaderString({
            payload: body,
            secret: secret ?? "",
          }),
      },
      body,
    });
  }
  const duplicate = await send(JSON.stringify(event));
  const invalid = await send(JSON.stringify(event), "invalid");
  const replayId = `evt_localqa_${randomUUID().replaceAll("-", "")}`;
  const outOfOrder = await send(
    JSON.stringify({
      ...event,
      id: replayId,
      type: "checkout.session.expired",
      data: {
        object: {
          id: sessionId,
          object: "checkout.session",
          status: "expired",
          payment_status: "unpaid",
        },
      },
    }),
  );
  const after = await snapshot();
  const unchanged = JSON.stringify(before) === JSON.stringify(after);
  console.log(
    JSON.stringify({
      duplicate: duplicate.status,
      invalidSignature: invalid.status,
      outOfOrder: outOfOrder.status,
      paidOrderAndInventoryUnchanged: unchanged,
    }),
  );
  await withDatabase((db) =>
    db
      .delete(processedStripeEvents)
      .where(eq(processedStripeEvents.stripeEventId, replayId)),
  );
  if (
    duplicate.status !== 200 ||
    invalid.status !== 400 ||
    outOfOrder.status !== 200 ||
    !unchanged
  )
    process.exitCode = 1;
}
void main().catch(() => {
  console.error(
    "Sandbox webhook replay failed; check the local app, signing secret and event ID.",
  );
  process.exitCode = 1;
});
