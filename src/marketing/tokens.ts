import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { unsubscribeToken } from "../lib/marketing-input";

function tokenSecret(secret = process.env.MARKETING_UNSUBSCRIBE_SECRET) {
  if (!secret || secret.length < 32)
    throw new Error("A dedicated unsubscribe signing secret is required.");
  return secret;
}
function signature(id: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`salted:marketing:unsubscribe:v1:${id}`)
    .digest("base64url");
}
export function createUnsubscribeToken(
  subscriptionId: string,
  secret?: string,
): string {
  const id = z.uuid().parse(subscriptionId).toLowerCase();
  return `v1.${id}.${signature(id, tokenSecret(secret))}`;
}
export function verifyUnsubscribeToken(
  value: unknown,
  secret?: string,
): string | null {
  const parsed = unsubscribeToken.safeParse(value);
  if (!parsed.success) return null;
  const [, id, provided] = parsed.data.split(".");
  const expected = signature(id, tokenSecret(secret));
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
    ? id
    : null;
}
// Fragments stay out of HTTP logs and Referer headers. Tokens expose no email address.
export function createUnsubscribeUrl(
  subscriptionId: string,
  origin: string,
  secret?: string,
): string {
  const url = new URL("/unsubscribe", origin);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("A secure website origin is required.");
  url.hash = new URLSearchParams({
    token: createUnsubscribeToken(subscriptionId, secret),
  }).toString();
  return url.href;
}
