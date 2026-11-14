import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { withDatabase } from "@/db/client";
import { orders } from "@/db/schema";
import { siteOrigin } from "@/commerce/config";
import {
  CONFIRMATION_COOKIE,
  verifyConfirmationToken,
} from "@/commerce/confirmation-token";
export const runtime = "nodejs";
const input = z.object({ token: z.string().max(128) }).strict();
export async function POST(request: Request) {
  const headers = {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  };
  try {
    if (request.headers.get("origin") !== siteOrigin())
      return NextResponse.json({}, { status: 403, headers });
    const body = await request.text();
    if (body.length > 1024)
      return NextResponse.json({}, { status: 400, headers });
    const { token } = input.parse(JSON.parse(body));
    const id = verifyConfirmationToken(token);
    if (!id) return NextResponse.json({}, { status: 400, headers });
    const [order] = await withDatabase((db) =>
      db
        .select({ sessionId: orders.stripeCheckoutSessionId })
        .from(orders)
        .where(
          and(
            eq(orders.id, id),
            inArray(orders.paymentStatus, ["paid", "partially_refunded"]),
          ),
        ),
    );
    if (!order?.sessionId)
      return NextResponse.json({}, { status: 400, headers });
    const response = NextResponse.json(
      {
        href: `/order/success?session_id=${encodeURIComponent(order.sessionId)}`,
      },
      { headers },
    );
    response.cookies.set(CONFIRMATION_COOKIE, token, {
      httpOnly: true,
      secure: siteOrigin().startsWith("https:"),
      sameSite: "lax",
      path: "/order/success",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      {},
      {
        status:
          error instanceof z.ZodError || error instanceof SyntaxError
            ? 400
            : 503,
        headers,
      },
    );
  }
}
