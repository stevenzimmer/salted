import { z } from "zod";
import { createHash } from "node:crypto";
import { pickupDayInput } from "../lib/pickup-policy";

export class CommerceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 409,
  ) {
    super(message);
  }
}
export const calendarDay = pickupDayInput;
const identity = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const cartInput = z
  .array(
    z
      .object({
        productId: identity,
        variantId: identity,
        quantity: z.number().int().min(1).max(20),
      })
      .strict(),
  )
  .min(1)
  .max(50)
  .superRefine((items, ctx) => {
    const keys = items.map((i) => `${i.productId}:${i.variantId}`);
    if (new Set(keys).size !== keys.length)
      ctx.addIssue({
        code: "custom",
        message: "Duplicate cart lines are not allowed.",
      });
  });
export const checkoutInput = z
  .object({
    items: cartInput,
    pickupDate: calendarDay,
    requestKey: z.uuid(),
    marketingOptIn: z.boolean().default(false),
    marketingConsentText: z.string().max(2000).optional(),
    reviewedPrices: z
      .array(
        z
          .object({
            productId: identity,
            variantId: identity,
            unitPrice: z.number().int().min(0).max(10_000_000),
          })
          .strict(),
      )
      .max(50),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.marketingOptIn && !input.marketingConsentText?.trim())
      ctx.addIssue({
        code: "custom",
        path: ["marketingConsentText"],
        message: "Review the newsletter opt-in wording before subscribing.",
      });
  });
export type CheckoutInput = z.infer<typeof checkoutInput>;
export type PriceLine = {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};
export function totalCents(
  lines: Pick<PriceLine, "unitPrice" | "quantity">[],
): number {
  const total = lines.reduce((sum, i) => {
    if (
      !Number.isSafeInteger(i.unitPrice) ||
      i.unitPrice < 0 ||
      i.unitPrice > 10_000_000 ||
      !Number.isSafeInteger(i.quantity) ||
      i.quantity < 1 ||
      i.quantity > 20
    )
      throw new CommerceError(
        "invalid_price",
        "Invalid price or quantity.",
        400,
      );
    return sum + i.unitPrice * i.quantity;
  }, 0);
  if (!Number.isSafeInteger(total) || total <= 0 || total > 99_999_999)
    throw new CommerceError("invalid_total", "Invalid order total.", 400);
  return total;
}
export function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
export function cartFingerprint(input: CheckoutInput) {
  return hash(
    JSON.stringify({
      date: input.pickupDate,
      items: [...input.items].sort((a, b) =>
        `${a.productId}:${a.variantId}`.localeCompare(
          `${b.productId}:${b.variantId}`,
        ),
      ),
      prices: [...input.reviewedPrices].sort((a, b) =>
        `${a.productId}:${a.variantId}`.localeCompare(
          `${b.productId}:${b.variantId}`,
        ),
      ),
      // Preserve existing non-opted-in checkout fingerprints across this upgrade.
      ...(input.marketingOptIn
        ? {
            marketingOptIn: true,
            marketingConsentText: input.marketingConsentText,
          }
        : {}),
    }),
  );
}
export function pricesMatch(
  lines: PriceLine[],
  reviewed: CheckoutInput["reviewedPrices"],
) {
  return (
    reviewed.length === lines.length &&
    lines.every((line) =>
      reviewed.some(
        (r) =>
          r.productId === line.productId &&
          r.variantId === line.variantId &&
          r.unitPrice === line.unitPrice,
      ),
    )
  );
}
