import { createClient } from "@sanity/client";
import {
  COMMERCE_CATALOG_QUERY,
  MARKETING_CONSENT_QUERY,
  PICKUP_BLACKOUT_DATES_QUERY,
  ORDER_EMAIL_QUERY,
  SPECIAL_ORDERS_QUERY,
} from "../sanity/lib/queries";
import type {
  COMMERCE_CATALOG_QUERY_RESULT,
  MARKETING_CONSENT_QUERY_RESULT,
  PICKUP_BLACKOUT_DATES_QUERY_RESULT,
  ORDER_EMAIL_QUERY_RESULT,
  SPECIAL_ORDERS_QUERY_RESULT,
} from "../../sanity.types";
import {
  CommerceError,
  type CheckoutInput,
  type PriceLine,
  totalCents,
} from "./validation";
import { blackoutDatesInput } from "../lib/pickup-policy";
// Transactional validation must bypass CDN, draft perspective and Next caches.
const client = () =>
  createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "",
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2026-02-01",
    token: process.env.SANITY_API_READ_TOKEN || process.env.SANITY_API_TOKEN,
    useCdn: false,
    perspective: "published",
    stega: false,
  });
export const fetchCatalog = () =>
  client().fetch<COMMERCE_CATALOG_QUERY_RESULT>(
    COMMERCE_CATALOG_QUERY,
    {},
    { cache: "no-store" },
  );
export const fetchOrderEmailCopy = () =>
  client().fetch<ORDER_EMAIL_QUERY_RESULT>(
    ORDER_EMAIL_QUERY,
    {},
    { cache: "no-store" },
  );
export const fetchSpecialOrderPage = () =>
  client().fetch<SPECIAL_ORDERS_QUERY_RESULT>(
    SPECIAL_ORDERS_QUERY,
    {},
    { cache: "no-store" },
  );
export const fetchMarketingConsentLabel = () =>
  client().fetch<MARKETING_CONSENT_QUERY_RESULT>(
    MARKETING_CONSENT_QUERY,
    {},
    { cache: "no-store" },
  );
export type Catalog = COMMERCE_CATALOG_QUERY_RESULT;
export async function fetchPickupBlackoutDates(): Promise<string[]> {
  const dates = await client().fetch<PICKUP_BLACKOUT_DATES_QUERY_RESULT>(
    PICKUP_BLACKOUT_DATES_QUERY,
    {},
    { cache: "no-store" },
  );
  return blackoutDatesInput.parse(dates ?? []);
}

// The published active product/size switches are the complete launch menu.
export function activeOfferings(
  catalog: Catalog,
): { productId: string; variantId: string }[] {
  return catalog.flatMap((product) => {
    if (
      !product.active ||
      !product.id ||
      !product.displayName?.trim() ||
      catalog.filter((p) => p.id === product.id).length !== 1
    )
      return [];
    const productId = product.id;
    return (product.variants ?? []).flatMap((variant) =>
      variant.active !== false &&
      variant.id &&
      variant.label?.trim() &&
      typeof variant.price === "number" &&
      Number.isSafeInteger(variant.price) &&
      variant.price >= 0 &&
      variant.price <= 10_000_000 &&
      product.variants?.filter((v) => v.id === variant.id).length === 1
        ? [{ productId, variantId: variant.id }]
        : [],
    );
  });
}
export function priceCart(
  input: CheckoutInput,
  products: COMMERCE_CATALOG_QUERY_RESULT,
): PriceLine[] {
  const lines = input.items.map((item) => {
    const matches = products.filter((p) => p.id === item.productId);
    const product = matches.length === 1 ? matches[0] : undefined;
    const variants =
      product?.variants?.filter((v) => v.id === item.variantId) ?? [];
    const variant = variants.length === 1 ? variants[0] : undefined;
    const label = `${product?.displayName || item.productId} / ${variant?.label || item.variantId}`;
    if (!product?.active || !variant || variant.active === false)
      throw new CommerceError(
        "product_unavailable",
        `${label} is no longer offered. Please remove it from your bag.`,
      );
    if (
      !product.displayName?.trim() ||
      !variant.label?.trim() ||
      !Number.isSafeInteger(variant.price) ||
      typeof variant.price !== "number" ||
      variant.price < 0
    )
      throw new CommerceError(
        "invalid_price",
        `${label} cannot be checked out right now.`,
      );
    return {
      ...item,
      productName: product.displayName,
      variantName: variant.label,
      unitPrice: variant.price,
      lineTotal: variant.price * item.quantity,
    };
  });
  totalCents(lines);
  return lines;
}
