"use client";
import {
  useId,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { ArrowUpRight } from "lucide-react";
import { Tooltip } from "radix-ui";
import { QuantitySelector } from "./quantity-selector";
import { useCart } from "./cart-provider";
import { MAX_CART_QUANTITY } from "@/lib/cart";
import { money } from "@/lib/format";
import { hasText, clean, interpolate } from "@/sanity/lib/content";
import { Text } from "@/components/cms/text";
import { useProductSelection } from "./product-selection";
export function ProductPurchase({ detailed = false }: { detailed?: boolean }) {
  const { addItem, commerce } = useCart();
  const { product, options, variant, setVariantId } = useProductSelection();
  const copy = commerce?.product;
  const [quantity, setQuantity] = useState(1);
  const [outcome, setOutcome] = useState<"added" | "blocked" | null>(null);
  const id = useId();
  if (!product.active || !options.length) return null;
  const soldOut = !options.some((option) => option.active !== false);
  const disabled = soldOut || !variant;
  const addTooltip = disabled
    ? soldOut
      ? copy?.soldOut
      : copy?.selectSizeTooltip
    : undefined;
  const safeQuantity = Math.min(MAX_CART_QUANTITY, Math.max(1, quantity));
  const button = soldOut ? copy?.soldOut : copy?.add;
  const legend = copy?.chooseSize;
  const message =
    outcome === "added"
      ? interpolate(copy?.added, { product: product.name })
      : outcome === "blocked"
        ? copy?.quantityLimit
        : undefined;
  function handleVariantChange(event: ChangeEvent<HTMLInputElement>) {
    setVariantId(event.currentTarget.value);
    setQuantity(1);
    setOutcome(null);
  }
  function handleVariantClick(event: MouseEvent<HTMLInputElement>) {
    if (event.currentTarget.value !== variant?.id) return;
    setVariantId(null);
    setQuantity(1);
    setOutcome(null);
  }
  function handleVariantKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== " " || event.currentTarget.value !== variant?.id) return;
    event.preventDefault();
    setVariantId(null);
    setQuantity(1);
    setOutcome(null);
  }
  function handleAdd() {
    if (!variant) return;
    const added = addItem({
      productId: product.id,
      variantId: variant.id,
      quantity: safeQuantity,
    });
    setOutcome(added ? "added" : "blocked");
    if (added) {
      setVariantId(null);
      setQuantity(1);
    }
  }
  const addButton = (
    <button
      type="button"
      onClick={handleAdd}
      disabled={disabled}
      className="add-button"
    >
      {button}
      {variant && !soldOut ? (
        <>
          <span>— {money(variant.price * safeQuantity)}</span>
          <ArrowUpRight size={15} aria-hidden="true" />
        </>
      ) : null}
    </button>
  );
  return (
    <Tooltip.Provider delayDuration={250}>
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
              const unavailable = option.active === false;
              const showTooltip = unavailable && hasText(copy?.soldOut);
              const label = (
                <label
                  key={option.id}
                  className={`variant-option ${option.id === variant?.id ? "is-selected" : ""} ${unavailable ? "is-unavailable" : ""}`}
                  tabIndex={showTooltip ? 0 : undefined}
                  aria-disabled={unavailable || undefined}
                >
                  <input
                    type="radio"
                    name={`variant-${id}`}
                    value={option.id}
                    checked={option.id === variant?.id}
                    disabled={unavailable}
                    onClick={handleVariantClick}
                    onKeyDown={handleVariantKeyDown}
                    onChange={handleVariantChange}
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
                      <span className="variant-price">
                        {money(option.price)}
                      </span>
                    )
                  ) : null}
                </label>
              );
              return showTooltip ? (
                <Tooltip.Root key={option.id}>
                  <Tooltip.Trigger asChild>{label}</Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className="variant-tooltip"
                      sideOffset={8}
                      collisionPadding={12}
                    >
                      {copy?.soldOut}
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              ) : (
                label
              );
            })}
          </div>
        </fieldset>
        {detailed ? (
          <Text className="serving-note" value={variant?.servingDescription} />
        ) : null}
        <div className="purchase-actions">
          <QuantitySelector
            value={safeQuantity}
            onChange={setQuantity}
            max={MAX_CART_QUANTITY}
            label={`Quantity for ${clean(product.name) || "product"}`}
            disabled={disabled}
            disabledTooltip={
              !variant && !soldOut ? copy?.selectSizeTooltip : undefined
            }
          />
          {hasText(button) ? (
            hasText(addTooltip) ? (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <span
                    className="add-button-tooltip-trigger"
                    tabIndex={0}
                    role="group"
                    aria-label={clean(button)}
                    aria-disabled="true"
                  >
                    {addButton}
                  </span>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="variant-tooltip"
                    sideOffset={8}
                    collisionPadding={12}
                  >
                    {addTooltip}
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            ) : (
              addButton
            )
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
    </Tooltip.Provider>
  );
}
