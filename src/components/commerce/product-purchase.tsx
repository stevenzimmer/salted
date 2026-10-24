"use client";

import { useState, useId } from "react";
import { ArrowUpRight } from "lucide-react";
import { useCart } from "./cart-provider";
import { QuantitySelector } from "./quantity-selector";
import { maximumInventory } from "@/lib/availability";
import { money } from "@/lib/format";
import type { Product } from "@/types/content";

export function ProductPurchase({
  product,
  detailed = false,
}: {
  product: Product;
  detailed?: boolean;
}) {
  const { schedule, addItem } = useCart();
  const firstAvailable = product.variants.find(
    (variant) => maximumInventory(schedule, product.id, variant.id) > 0,
  );
  const [variantId, setVariantId] = useState(
    firstAvailable?.id ?? product.variants[0].id,
  );
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const id = useId();
  const variant =
    product.variants.find((variant) => variant.id === variantId) ??
    product.variants[0];
  const inventory = maximumInventory(schedule, product.id, variant.id);
  const soldOut = inventory === 0;
  const safeQuantity = Math.min(quantity, Math.max(1, inventory));

  function handleAdd() {
    const added = addItem({
      productId: product.id,
      variantId: variant.id,
      quantity: safeQuantity,
    });
    setMessage(
      added
        ? `${product.name} added to your bag.`
        : "You’ve reached the available quantity for this size. Check your bag.",
    );
  }

  return (
    <div
      className={detailed ? "product-purchase detailed" : "product-purchase"}
    >
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="eyebrow mb-2.5">
          {product.category === "focaccia" ? "Choose your size" : "Your loaf"}
        </legend>
        <div className="variant-options">
          {product.variants.map((option) => {
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
                    setMessage("");
                  }}
                />
                <span>{option.shortLabel}</span>
                {detailed ? (
                  <span className="variant-price">
                    {unavailable ? "Unavailable" : money(option.price)}
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      </fieldset>
      {detailed ? (
        <p className="serving-note">{variant.servingDescription}</p>
      ) : null}
      {inventory > 0 && inventory <= 3 ? (
        <p className="stock-note">
          Small batch · up to {inventory} available on a future Friday
        </p>
      ) : null}
      <div className="purchase-actions">
        <QuantitySelector
          value={safeQuantity}
          onChange={setQuantity}
          max={inventory}
          label={`Quantity for ${product.name}`}
          disabled={soldOut}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={soldOut}
          className="add-button"
        >
          {soldOut ? (
            "Sold out"
          ) : (
            <>
              Add to bag <span>— {money(variant.price * safeQuantity)}</span>
              <ArrowUpRight size={15} />
            </>
          )}
        </button>
      </div>
      {detailed ? (
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Pickup in Rocklin · choose your Friday in checkout.
          <br />
          Preview only. No payment or real order is created.
        </p>
      ) : null}
      <p className="sr-only" role="status">
        {message}
      </p>
      {message.includes("reached") ? (
        <p className="mt-2 text-xs" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
