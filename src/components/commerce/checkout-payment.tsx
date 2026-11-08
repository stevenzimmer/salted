"use client";
import { useRef, useState } from "react";
import { useCart } from "./cart-provider";
import { resolveCart } from "@/lib/cart";
import { observedCartPrice, rememberCartPrice } from "@/lib/cart-store";
import { clean, hasText } from "@/sanity/lib/content";
import { MarketingConsentCheckbox } from "./marketing-consent-checkbox";
import { Text } from "@/components/cms/text";
import { money } from "@/lib/format";
import { z } from "zod";
const responseInput = z.object({
  checkoutUrl: z.url().optional(),
  code: z.string().optional(),
  error: z.string().optional(),
  prices: z
    .array(
      z.object({
        productId: z.string(),
        variantId: z.string(),
        productName: z.string(),
        variantName: z.string(),
        unitPrice: z.number().int().nonnegative(),
        quantity: z.number().int().positive(),
      }),
    )
    .optional(),
});
export function CheckoutPayment({ pickupDate }: { pickupDate: string }) {
  const { items, products, commerce, refreshAvailability, updatePrices } =
    useCart();
  const copy = commerce?.checkout;
  const marketingLabel = commerce?.marketingConsent?.label;
  const consentText = clean(marketingLabel).trim();
  const [acceptedConsentText, setAcceptedConsentText] = useState<string | null>(
    null,
  );
  // Revised or cleared CMS wording requires a fresh affirmative choice.
  const marketingOptIn =
    hasText(marketingLabel) && acceptedConsentText === consentText;
  function changeMarketingConsent(checked: boolean) {
    setAcceptedConsentText(checked ? consentText : null);
  }
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  const [prices, setPrices] =
    useState<z.infer<typeof responseInput>["prices"]>();
  const [reviewed, setReviewed] = useState<string>();
  const request = useRef<{ fingerprint: string; key: string } | null>(null);
  const lines = resolveCart(items, products);
  const current =
    prices ??
    lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId,
      productName: l.product.name,
      variantName: l.variant.label,
      unitPrice: l.variant.price,
      quantity: l.quantity,
    }));
  const priceFingerprint = JSON.stringify({
    items,
    pickupDate,
    prices: current.map((l) => ({
      productId: l.productId,
      variantId: l.variantId,
      unitPrice: l.unitPrice,
    })),
  });
  const fingerprint = marketingOptIn
    ? JSON.stringify({
        priceFingerprint,
        marketingOptIn: true,
        marketingConsentText: consentText,
      })
    : priceFingerprint;
  const priceChanged =
    !!prices ||
    current.some((l) => {
      const observed = observedCartPrice(l.productId, l.variantId);
      return observed === undefined || observed !== l.unitPrice;
    });
  const needsReview = priceChanged && reviewed !== priceFingerprint;
  function reviewPrices() {
    for (const line of current)
      rememberCartPrice(line.productId, line.variantId, line.unitPrice);
    setReviewed(priceFingerprint);
  }
  async function pay() {
    setBusy(true);
    setError(undefined);
    if (!request.current || request.current.fingerprint !== fingerprint) {
      // Persist the key across refreshes and uncertain request outcomes.
      let saved: unknown;
      try {
        saved = JSON.parse(
          sessionStorage.getItem("salted:checkout-request") ?? "null",
        );
      } catch {}
      const parsed = z
        .object({ fingerprint: z.string(), key: z.uuid() })
        .safeParse(saved);
      request.current =
        parsed.success && parsed.data.fingerprint === fingerprint
          ? parsed.data
          : { fingerprint, key: crypto.randomUUID() };
      try {
        sessionStorage.setItem(
          "salted:checkout-request",
          JSON.stringify(request.current),
        );
      } catch {}
    }
    try {
      const response = await fetch("/api/commerce/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          pickupDate,
          requestKey: request.current.key,
          marketingOptIn,
          ...(marketingOptIn ? { marketingConsentText: consentText } : {}),
          reviewedPrices: current.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            unitPrice: l.unitPrice,
          })),
        }),
      });
      const value = responseInput.parse(await response.json());
      if (value.code === "price_changed" && value.prices) {
        setPrices(value.prices);
        updatePrices(value.prices);
        setReviewed(undefined);
        request.current = null;
      } else if (response.ok && value.checkoutUrl) {
        const url = new URL(value.checkoutUrl);
        if (
          url.origin !== window.location.origin &&
          url.hostname !== "checkout.stripe.com"
        )
          throw new Error("Invalid checkout destination");
        window.location.assign(url.href);
        return;
      } else {
        setError(value.error ?? "Checkout is unavailable. Please try again.");
        if (
          ["checkout_expired", "idempotency_conflict"].includes(
            value.code ?? "",
          )
        ) {
          request.current = null;
          sessionStorage.removeItem("salted:checkout-request");
        }
      }
    } catch {
      setError(
        "Checkout could not be reached. Your bag is saved; please retry.",
      );
    }
    await refreshAvailability();
    setBusy(false);
  }
  return (
    <div className="mt-5">
      {needsReview ? (
        <div className="checkout-notice" role="status">
          <Text value={copy?.priceChanged} />
          <ul>
            {current.map((l) => (
              <li key={`${l.productId}:${l.variantId}`}>
                {l.productName} / {l.variantName}: {money(l.unitPrice)} ×{" "}
                {l.quantity}
              </li>
            ))}
          </ul>
          {hasText(copy?.review) ? (
            <button
              className="button-primary mt-4 w-full"
              onClick={reviewPrices}
            >
              {copy.review}
            </button>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="draft-note mb-4">
          {error}
        </p>
      ) : null}
      {hasText(copy?.pay) ? (
        <MarketingConsentCheckbox
          label={marketingLabel}
          checked={marketingOptIn}
          disabled={busy}
          onChange={changeMarketingConsent}
        />
      ) : null}
      {hasText(copy?.pay) ? (
        <button
          type="button"
          className="button-primary w-full"
          disabled={busy || needsReview || lines.length !== items.length}
          onClick={pay}
        >
          {busy && hasText(copy?.busy) ? copy.busy : copy.pay}
        </button>
      ) : null}
    </div>
  );
}
