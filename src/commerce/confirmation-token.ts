import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const CONFIRMATION_COOKIE = "salted-order-confirmation";
function signingSecret(secret = process.env.ORDER_CONFIRMATION_SECRET): string {
  if (!secret || secret.length < 32)
    throw new Error("A dedicated order confirmation secret is required.");
  return secret;
}
function signature(id: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`salted:order:read:v1:${id}`)
    .digest("base64url");
}
export function createConfirmationToken(
  orderId: string,
  secret?: string,
): string {
  const id = z.uuid().parse(orderId).toLowerCase();
  return `v1.${id}.${signature(id, signingSecret(secret))}`;
}
export function verifyConfirmationToken(
  value: unknown,
  secret?: string,
): string | null {
  if (
    typeof value !== "string" ||
    !/^v1\.[a-f0-9-]{36}\.[A-Za-z0-9_-]{43}$/.test(value)
  )
    return null;
  const [, id, provided] = value.split(".");
  if (!z.uuid().safeParse(id).success) return null;
  const configured = secret ?? process.env.ORDER_CONFIRMATION_SECRET;
  if (!configured || configured.length < 32) return null;
  const expected = signature(id, configured);
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
    ? id
    : null;
}
export function confirmationEmailUrl(
  orderId: string,
  origin: string,
  secret?: string,
): string {
  const url = new URL("/order/open", origin);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("Confirmation links require a secure origin.");
  // Fragments are never sent in HTTP URLs or Referer headers.
  url.hash = new URLSearchParams({
    confirmation: createConfirmationToken(orderId, secret),
  }).toString();
  return url.href;
}
