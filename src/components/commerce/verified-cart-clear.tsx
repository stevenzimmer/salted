"use client";
import { useEffect } from "react";
import { getCartSnapshot, updateCart } from "@/lib/cart-store";
import type { CartItem } from "@/types/content";
const cleared = new Set<string>();
function key(items: CartItem[]) {
  return JSON.stringify(
    items
      .map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
      }))
      .sort((a, b) =>
        `${a.productId}:${a.variantId}`.localeCompare(
          `${b.productId}:${b.variantId}`,
        ),
      ),
  );
}
export function VerifiedCartClear({
  orderNumber,
  items,
}: {
  orderNumber: string;
  items: CartItem[];
}) {
  useEffect(() => {
    if (cleared.has(orderNumber)) return;
    try {
      if (localStorage.getItem(`salted:paid:${orderNumber}`)) return;
    } catch {}
    if (key(getCartSnapshot()) === key(items)) updateCart(() => []);
    cleared.add(orderNumber);
    try {
      localStorage.setItem(`salted:paid:${orderNumber}`, "1");
      sessionStorage.removeItem("salted:checkout-request");
    } catch {}
  }, [orderNumber, items]);
  return null;
}
