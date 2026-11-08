import { lt } from "drizzle-orm";
import type { Database } from "../db/client";
import { checkoutRateLimits } from "../db/schema";

// Operator-only maintenance. Never removes orders, attempts or inventory holds.
export async function pruneRateLimitBuckets(
  db: Database,
  now = new Date(),
): Promise<number> {
  const result = await db
    .delete(checkoutRateLimits)
    .where(
      lt(
        checkoutRateLimits.windowStart,
        new Date(now.getTime() - 24 * 60 * 60 * 1000),
      ),
    );
  return result.rowCount ?? 0;
}
