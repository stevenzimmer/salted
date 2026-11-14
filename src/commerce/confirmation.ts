import "server-only";
import { and, eq, or } from "drizzle-orm";
import { withDatabase } from "../db/client";
import { orders, orderItems, pickupDates } from "../db/schema";
import { stripeClient } from "./config";
import { verifyConfirmationToken } from "./confirmation-token";
export async function orderConfirmation(
  sessionId: string | undefined,
  ownerHash: string | undefined,
  emailToken?: string,
) {
  const emailOrderId = verifyConfirmationToken(emailToken);
  if (
    (!ownerHash && !emailOrderId) ||
    !sessionId ||
    !/^cs_test_[a-zA-Z0-9]+$/.test(sessionId)
  )
    return null;
  const local = await withDatabase(async (db) => {
    const [row] = await db
      .select({ order: orders, pickup: pickupDates })
      .from(orders)
      .innerJoin(pickupDates, eq(orders.pickupDateId, pickupDates.id))
      .where(
        and(
          eq(orders.stripeCheckoutSessionId, sessionId),
          or(
            ownerHash ? eq(orders.ownerHash, ownerHash) : undefined,
            emailOrderId ? eq(orders.id, emailOrderId) : undefined,
          ),
        ),
      );
    if (!row) return null;
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, row.order.id));
    return { ...row, items };
  });
  if (!local) return null;
  const session = await stripeClient().checkout.sessions.retrieve(sessionId);
  if (
    session.livemode ||
    session.client_reference_id !== local.order.id ||
    session.metadata?.order_id !== local.order.id ||
    session.amount_total !== local.order.totalCents ||
    session.currency !== "usd"
  )
    return null;
  // This read does not fulfill orders. Webhooks and manual reconciliation own writes.
  return {
    canClearCart:
      local.order.ownerHash === ownerHash && emailOrderId !== local.order.id,
    paid:
      session.payment_status === "paid" &&
      session.status === "complete" &&
      ["paid", "partially_refunded"].includes(local.order.paymentStatus),
    ended:
      session.status === "expired" ||
      local.order.orderStatus === "cancelled" ||
      local.order.paymentStatus === "refunded",
    number: local.order.orderNumber,
    total: local.order.totalCents,
    pickup: local.pickup,
    items: local.items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.quantity,
      name: i.productNameSnapshot,
      variant: i.variantNameSnapshot,
      lineTotal: i.lineTotalCents,
    })),
  };
}
