import { NextResponse } from "next/server";
import { checkoutInput } from "@/commerce/validation";
import { beginCheckout } from "@/commerce/checkout";
import {
  apiError,
  limitCheckoutRequests,
  attachOwner,
  ownerCapability,
  readJson,
  requireCheckoutRequest,
} from "@/commerce/http";
import { siteOrigin } from "@/commerce/config";
export const runtime = "nodejs";
export async function POST(request: Request) {
  let token: string | undefined;
  try {
    requireCheckoutRequest(request);
    const input = checkoutInput.parse(await readJson(request));
    const owner = await ownerCapability(true);
    if (!owner) throw new Error("Could not establish checkout owner");
    token = owner.token;
    await limitCheckoutRequests(request, owner.ownerHash);
    const result = await beginCheckout(input, owner.ownerHash);
    const response =
      "prices" in result
        ? NextResponse.json(
            { code: "price_changed", prices: result.prices },
            { status: 409 },
          )
        : NextResponse.json({
            checkoutUrl:
              result.session.url ??
              `${siteOrigin()}/order/success?session_id=${result.session.id}`,
          });
    response.headers.set("Cache-Control", "no-store");
    return attachOwner(response, token);
  } catch (error) {
    const response = apiError(error);
    return token ? attachOwner(response, token) : response;
  }
}
