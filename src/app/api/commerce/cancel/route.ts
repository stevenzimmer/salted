import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  requireCheckoutRequest,
  ownerCapability,
  apiError,
} from "@/commerce/http";
import { stripeClient } from "@/commerce/config";
import { createOrRecoverSession } from "@/commerce/checkout";
import { applySession } from "@/commerce/store";
import { withDatabase } from "@/db/client";
import { checkoutAttempts } from "@/db/schema";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    requireCheckoutRequest(request);
    const owner = await ownerCapability();
    if (!owner) return NextResponse.json({ ended: true });
    const attempts = await withDatabase((db) =>
      db
        .select()
        .from(checkoutAttempts)
        .where(
          and(
            eq(checkoutAttempts.ownerHash, owner.ownerHash),
            inArray(checkoutAttempts.status, ["creating", "open"]),
          ),
        ),
    );
    for (const attempt of attempts) {
      const session = await createOrRecoverSession(attempt);
      const final =
        session.status === "open"
          ? await stripeClient().checkout.sessions.expire(session.id)
          : session;
      await withDatabase((db) => applySession(db, final));
    }
    return NextResponse.json(
      { ended: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
