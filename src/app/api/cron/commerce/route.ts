import { withDatabase } from "@/db/client";
import { checkoutRateLimits } from "@/db/schema";
import { lt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { authorizedCron } from "@/commerce/http";
import { reconcileCheckouts } from "@/commerce/checkout";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (!authorizedCron(request))
    return new NextResponse("Unauthorized", { status: 401 });
  // Reconciliation must keep running even when new checkout is disabled.
  const reconciliation = await reconcileCheckouts();
  await withDatabase((db) =>
    db
      .delete(checkoutRateLimits)
      .where(
        lt(
          checkoutRateLimits.windowStart,
          new Date(Date.now() - 24 * 60 * 60 * 1000),
        ),
      ),
  );
  return NextResponse.json(reconciliation, {
    status: reconciliation.failed ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
