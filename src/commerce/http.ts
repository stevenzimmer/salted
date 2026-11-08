import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { withDatabase } from "../db/client";
import { checkoutRateLimits } from "../db/schema";
import { sql } from "drizzle-orm";
import { CommerceError, hash } from "./validation";
import { siteOrigin } from "./config";
export const OWNER_COOKIE = "salted-commerce-owner";
export async function ownerCapability(create = false) {
  const jar = await cookies();
  const current = jar.get(OWNER_COOKIE)?.value;
  const token =
    current && /^[a-f0-9]{64}$/.test(current)
      ? current
      : create
        ? randomBytes(32).toString("hex")
        : undefined;
  return token ? { token, ownerHash: hash(token) } : null;
}
export function attachOwner(response: NextResponse, token: string) {
  response.cookies.set(OWNER_COOKIE, token, {
    httpOnly: true,
    secure: siteOrigin().startsWith("https:"),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
export function requireCheckoutRequest(request: Request) {
  if (request.headers.get("origin") !== siteOrigin())
    throw new CommerceError(
      "invalid_origin",
      "Please return to the storefront to check out.",
      403,
    );
  if (Number(request.headers.get("content-length") ?? 0) > 20000)
    throw new CommerceError("invalid_input", "The bag is too large.", 400);
}
export function apiError(error: unknown) {
  const status =
    error instanceof CommerceError
      ? error.status
      : error instanceof ZodError || error instanceof SyntaxError
        ? 400
        : 503;
  const message =
    error instanceof CommerceError
      ? error.message
      : status === 400
        ? "Please check your bag and choose a valid Friday."
        : "Checkout could not be completed. Your bag is saved. Please retry shortly.";
  return NextResponse.json(
    {
      error: message,
      code:
        error instanceof CommerceError
          ? error.code
          : status === 400
            ? "invalid_input"
            : "service_unavailable",
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
export async function readJson(request: Request): Promise<unknown> {
  const body = await request.text();
  if (body.length > 20000)
    throw new CommerceError("invalid_input", "The bag is too large.", 400);
  return JSON.parse(body);
}

// Vercel supplies the trusted client IP. Hash before storage; retain no raw IP.
export async function limitCheckoutRequests(
  request: Request,
  ownerHash: string,
) {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32)
    throw new CommerceError(
      "configuration_missing",
      "Checkout is temporarily unavailable.",
      503,
    );
  const ip =
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
    "local";
  const key = hash(`${secret}:${ip}:${Math.floor(Date.now() / 300000)}`);
  await withDatabase(async (db) => {
    const result = await db
      .insert(checkoutRateLimits)
      .values({ key, windowStart: new Date(), requests: 1 })
      .onConflictDoUpdate({
        target: checkoutRateLimits.key,
        set: { requests: sql`${checkoutRateLimits.requests}+1` },
      })
      .returning();
    if (result[0].requests > 30)
      throw new CommerceError(
        "rate_limited",
        "Too many checkout attempts. Please wait a few minutes.",
        429,
      );
    const guestKey = hash(`${ownerHash}:${Math.floor(Date.now() / 300000)}`);
    const guest = await db
      .insert(checkoutRateLimits)
      .values({ key: guestKey, windowStart: new Date(), requests: 1 })
      .onConflictDoUpdate({
        target: checkoutRateLimits.key,
        set: { requests: sql`${checkoutRateLimits.requests}+1` },
      })
      .returning();
    if (guest[0].requests > 10)
      throw new CommerceError(
        "rate_limited",
        "Please wait a few minutes before retrying checkout.",
        429,
      );
  });
}
