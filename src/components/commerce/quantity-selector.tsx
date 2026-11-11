"use client";

import { Minus, Plus } from "lucide-react";
import { Tooltip } from "radix-ui";
import { MAX_CART_QUANTITY } from "@/lib/cart";
import { hasText } from "@/sanity/lib/content";

export function QuantitySelector({
  value,
  onChange,
  max = 20,
  label = "Quantity",
  disabled = false,
  disabledTooltip,
}: {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  label?: string;
  disabled?: boolean;
  disabledTooltip?: string;
}) {
  const showTooltip = disabled && hasText(disabledTooltip);
  const control = (
    <div
      className="quantity-control"
      role="group"
      aria-label={label}
      tabIndex={showTooltip ? 0 : undefined}
      aria-disabled={disabled || undefined}
      data-size-required={showTooltip || undefined}
    >
      <button
        type="button"
        aria-label={`Decrease ${label.toLowerCase()}`}
        disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={14} />
      </button>
      <output aria-live="polite" aria-label={label}>
        {value}
      </output>
      <button
        type="button"
        aria-label={`Increase ${label.toLowerCase()}`}
        disabled={disabled || value >= Math.min(max, MAX_CART_QUANTITY)}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={14} />
      </button>
    </div>
  );
  return showTooltip ? (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{control}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="variant-tooltip"
          sideOffset={8}
          collisionPadding={12}
        >
          {disabledTooltip}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  ) : (
    control
  );
}
