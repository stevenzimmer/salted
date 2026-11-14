import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { stripeClient } from "@/commerce/config";
import { verifyWebhook } from "@/commerce/webhook";
import { applySession, recordRefund } from "@/commerce/store";
import { withDatabase } from "@/db/client";
import { processedStripeEvents } from "@/db/schema";
import { deliverSessionEmails } from "@/commerce/email";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  let event;
  try {
    event = verifyWebhook(
      await request.text(),
      request.headers.get("stripe-signature"),
    );
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }
  if (event.livemode)
    return new NextResponse("Live events disabled", { status: 400 });
  try {
    const seen = await withDatabase((db) =>
      db
        .select({ id: processedStripeEvents.stripeEventId })
        .from(processedStripeEvents)
        .where(eq(processedStripeEvents.stripeEventId, event.id))
        .limit(1),
    );
    if (
      [
        "checkout.session.completed",
        "checkout.session.expired",
        "checkout.session.async_payment_succeeded",
        "checkout.session.async_payment_failed",
      ].includes(event.type)
    ) {
      const object = event.data.object;
      if (object.object !== "checkout.session")
        return new NextResponse("Invalid event object", { status: 400 });
      // Fetch current state so old events cannot undo more recent payment state.
      const session = await stripeClient().checkout.sessions.retrieve(
        object.id,
      );
      await withDatabase((db) =>
        applySession(db, session, { id: event.id, type: event.type }),
      );
      // Duplicate payment events must still recover a previously failed email.
      await deliverSessionEmails(session.id);
    } else if (event.type === "charge.refunded") {
      const charge = await stripeClient().charges.retrieve(
        event.data.object.id,
      );
      await withDatabase((db) =>
        recordRefund(db, charge, { id: event.id, type: event.type }),
      );
    } else {
      if (seen.length) return NextResponse.json({ received: true });
      await withDatabase((db) =>
        db
          .insert(processedStripeEvents)
          .values({
            stripeEventId: event.id,
            eventType: event.type,
            result: "ignored",
          })
          .onConflictDoNothing(),
      );
    }
    return NextResponse.json({ received: true });
  } catch {
    console.error("Stripe event processing failed; delivery should retry.");
    return new NextResponse("Retry event", { status: 503 });
  }
}
