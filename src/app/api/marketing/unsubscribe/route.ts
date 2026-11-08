import { NextResponse } from "next/server";
import { unsubscribeInput } from "@/lib/marketing-input";
import { withDatabase } from "@/db/client";
import {
  unsubscribeEmail,
  unsubscribeSubscription,
} from "@/marketing/preferences";
import { verifyUnsubscribeToken } from "@/marketing/tokens";
import {
  limitPreferenceRequests,
  preferenceLimits,
  validPreferenceOrigin,
} from "@/marketing/http";
export const runtime = "nodejs";
function result(code: string, status = 200) {
  return NextResponse.json(
    { code },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        ...(status === 429 ? { "Retry-After": "300" } : {}),
      },
    },
  );
}
export async function POST(request: Request) {
  try {
    // Unsubscribe remains available when new commerce checkout is disabled.
    if (!validPreferenceOrigin(request)) return result("invalid_origin", 403);
    if (
      Number(request.headers.get("content-length") ?? 0) >
      preferenceLimits.maxBodyBytes
    )
      return result("invalid_input", 400);
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > preferenceLimits.maxBodyBytes)
      return result("invalid_input", 400);
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      return result("invalid_input", 400);
    }
    const input = unsubscribeInput.safeParse(value);
    if (!input.success) return result("invalid_input", 400);
    if (!(await limitPreferenceRequests(request)))
      return result("rate_limited", 429);
    const data = input.data;
    if (data.method === "email") {
      await withDatabase((db) => unsubscribeEmail(db, data.email));
    } else {
      const id = verifyUnsubscribeToken(data.token);
      if (!id) return result("invalid_link", 400);
      const found = await withDatabase((db) => unsubscribeSubscription(db, id));
      if (!found) return result("invalid_link", 400);
    }
    // Same response for known, unknown and already-unsubscribed email addresses.
    return result("unsubscribed");
  } catch {
    console.error("Unsubscribe request could not be saved.");
    return result("unavailable", 503);
  }
}
