import { after, NextResponse } from "next/server";
import { ZodError } from "zod";
import { CommerceError } from "@/commerce/validation";
import {
  limitPreferenceRequests,
  validPreferenceOrigin,
} from "@/marketing/http";
import {
  saveSpecialOrder,
  SpecialOrderValidationError,
} from "@/special-orders/store";
import { deliverSpecialOrderNotification } from "@/special-orders/email";

export const runtime = "nodejs";
export const maxDuration = 60;
const maxBodyBytes = 20_000;

function result(code: string, status = 200) {
  return NextResponse.json(
    { code },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(status === 429 ? { "Retry-After": "300" } : {}),
      },
    },
  );
}

export async function POST(request: Request) {
  try {
    if (!validPreferenceOrigin(request)) return result("invalid_origin", 403);
    if (Number(request.headers.get("content-length") ?? 0) > maxBodyBytes)
      return result("invalid_input", 400);
    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > maxBodyBytes)
      return result("invalid_input", 400);
    let value: unknown;
    try {
      value = JSON.parse(body);
    } catch {
      return result("invalid_input", 400);
    }
    if (!(await limitPreferenceRequests(request, "special-order")))
      return result("rate_limited", 429);
    const id = await saveSpecialOrder(value);
    after(async () => {
      try {
        await deliverSpecialOrderNotification(id);
      } catch {
        console.error(
          "Special-order notification pending; use private delivery recovery.",
        );
      }
    });
    // Success means the request is durable, independent of the email provider.
    // Never return contacts, request contents, or subscriber state.
    return result("submitted");
  } catch (error) {
    if (
      error instanceof ZodError ||
      error instanceof SpecialOrderValidationError
    )
      return result("invalid_input", 400);
    if (error instanceof CommerceError) return result(error.code, error.status);
    console.error("Special-order request could not be saved.");
    return result("unavailable", 503);
  }
}
