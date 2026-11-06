"use client";
import { useId, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { QuantitySelector } from "./quantity-selector";
import { useCart } from "./cart-provider";
import { maximumInventory } from "@/lib/availability";
import { money } from "@/lib/format";
import { hasText, clean, interpolate } from "@/sanity/lib/content";
import { Text } from "@/components/cms/text";
import type { Product } from "@/types/content";
export function ProductPurchase({
  product,
  detailed = false,
}: {
  product: Product;
  detailed?: boolean;
}) {
  const { schedule, addItem, commerce } = useCart();
  const copy = commerce?.product;
  const options = product.variants.filter((option) => hasText(option.label));
  const firstAvailable = options.find(
    (variant) => maximumInventory(schedule, product.id, variant.id) > 0,
  );
  const [variantId, setVariantId] = useState(
    firstAvailable?.id ?? options[0]?.id,
  );
  const [quantity, setQuantity] = useState(1);
  const [outcome, setOutcome] = useState<"added" | "blocked" | null>(null);
  const id = useId();
  const variant =
    options.find((variant) => variant.id === variantId) ??
    firstAvailable ??
    options[0];
  if (!variant) return null;
  const inventory = maximumInventory(schedule, product.id, variant.id);
  const soldOut = inventory === 0;
  const safeQuantity = Math.min(quantity, Math.max(1, inventory));
  const button = soldOut ? copy?.soldOut : copy?.add;
  const legend = copy?.chooseSize;
  const message =
    outcome === "added"
      ? interpolate(copy?.added, { product: product.name })
      : outcome === "blocked"
        ? copy?.quantityLimit
        : undefined;
  function handleAdd() {
    if (!variant) return;
    setOutcome(
      addItem({
        productId: product.id,
        variantId: variant.id,
        quantity: safeQuantity,
      })
        ? "added"
        : "blocked",
    );
  }
  return (
    <div
      className={detailed ? "product-purchase detailed" : "product-purchase"}
    >
      <fieldset
        className="m-0 min-w-0 border-0 p-0"
        aria-label={hasText(legend) ? clean(legend) : "Product size"}
      >
        <Text as="legend" className="eyebrow mb-2.5" value={legend} />
        <div className="variant-options">
          {options.map((option) => {
            const unavailable =
              maximumInventory(schedule, product.id, option.id) === 0;
            return (
              <label
                key={option.id}
                className={`variant-option ${option.id === variant.id ? "is-selected" : ""} ${unavailable ? "is-unavailable" : ""}`}
              >
                <input
                  type="radio"
                  name={`variant-${id}`}
                  value={option.id}
                  checked={option.id === variant.id}
                  disabled={unavailable}
                  onChange={() => {
                    setVariantId(option.id);
                    setQuantity(1);
                    setOutcome(null);
                  }}
                />
                <span>
                  {hasText(option.shortLabel)
                    ? option.shortLabel
                    : option.label}
                </span>
                {detailed ? (
                  unavailable ? (
                    <Text
                      as="span"
                      className="variant-price"
                      value={copy?.unavailable}
                    />
                  ) : (
                    <span className="variant-price">{money(option.price)}</span>
                  )
                ) : null}
              </label>
            );
          })}
        </div>
      </fieldset>
      {detailed ? (
        <Text className="serving-note" value={variant.servingDescription} />
      ) : null}
      {inventory > 0 && inventory <= 3 ? (
        <Text
          className="stock-note"
          value={interpolate(copy?.lowStock, { quantity: inventory })}
        />
      ) : null}
      <div className="purchase-actions">
        <QuantitySelector
          value={safeQuantity}
          onChange={setQuantity}
          max={inventory}
          label={`Quantity for ${clean(product.name) || "product"}`}
          disabled={soldOut}
        />
        {hasText(button) ? (
          <button
            type="button"
            onClick={handleAdd}
            disabled={soldOut}
            className="add-button"
          >
            {button}
            {!soldOut ? (
              <>
                <span>— {money(variant.price * safeQuantity)}</span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </>
            ) : null}
          </button>
        ) : null}
      </div>
      {detailed ? (
        <Text
          className="mt-4 whitespace-pre-line text-xs leading-relaxed text-muted-foreground"
          value={copy?.pickupNote}
        />
      ) : null}
      {hasText(message) ? (
        <p
          className={outcome === "blocked" ? "mt-2 text-xs" : "sr-only"}
          role={outcome === "blocked" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
