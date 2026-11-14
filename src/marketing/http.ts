import "server-only";
import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import { withDatabase } from "../db/client";
import { checkoutRateLimits } from "../db/schema";
import { siteOrigin } from "../commerce/config";

export const preferenceLimits = {
  windowMs: 5 * 60 * 1000,
  requestsPerWindow: 30,
  maxBodyBytes: 4096,
} as const;
export function validPreferenceOrigin(request: Request): boolean {
  return request.headers.get("origin") === siteOrigin();
}
export async function limitPreferenceRequests(
  request: Request,
  purpose: "unsubscribe" | "special-order" = "unsubscribe",
): Promise<boolean> {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Preference rate limiting is not configured.");
  const ip =
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
    "local";
  const bucket = Math.floor(Date.now() / preferenceLimits.windowMs);
  const key = createHmac("sha256", secret)
    .update(`${purpose}:${ip}:${bucket}`)
    .digest("hex");
  const [row] = await withDatabase((db) =>
    db
      .insert(checkoutRateLimits)
      .values({ key, windowStart: new Date(), requests: 1 })
      .onConflictDoUpdate({
        target: checkoutRateLimits.key,
        set: { requests: sql`${checkoutRateLimits.requests}+1` },
      })
      .returning({ requests: checkoutRateLimits.requests }),
  );
  return row.requests <= preferenceLimits.requestsPerWindow;
}
