"use client";

import { normalizeCart } from "./cart";
import type { CartItem } from "@/types/content";

const KEY = "salted:cart:v1";
const EVENT = "salted:cart-change";
const EMPTY: CartItem[] = [];
let lastRaw: string | null | undefined;
let snapshot: CartItem[] = EMPTY;

export function subscribeCart(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function getCartSnapshot(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== lastRaw) {
      lastRaw = raw;
      snapshot = raw ? normalizeCart(JSON.parse(raw)) : EMPTY;
    }
  } catch {
    // Keep a usable in-memory cart if storage is blocked or malformed.
  }
  return snapshot;
}

export function getServerCartSnapshot(): CartItem[] {
  return EMPTY;
}

export function updateCart(update: (items: CartItem[]) => CartItem[]): void {
  snapshot = normalizeCart(update(getCartSnapshot()));
  const raw = JSON.stringify(snapshot);
  try {
    localStorage.setItem(KEY, raw);
    lastRaw = raw;
  } catch {
    // The cart remains available in memory for this tab.
  }
  window.dispatchEvent(new Event(EVENT));
}

// Display-only price observations. They are never used to calculate server totals.
export function rememberCartPrice(
  productId: string,
  variantId: string,
  price: number,
) {
  try {
    const prices: unknown = JSON.parse(
      localStorage.getItem("salted:cart-prices:v1") ?? "{}",
    );
    const record =
      prices && typeof prices === "object" && !Array.isArray(prices)
        ? prices
        : {};
    localStorage.setItem(
      "salted:cart-prices:v1",
      JSON.stringify({ ...record, [`${productId}:${variantId}`]: price }),
    );
  } catch {
    /* Server price review still applies when storage is unavailable. */
  }
}
export function observedCartPrice(
  productId: string,
  variantId: string,
): number | undefined {
  try {
    const prices: unknown = JSON.parse(
      localStorage.getItem("salted:cart-prices:v1") ?? "{}",
    );
    const key = `${productId}:${variantId}`;
    if (prices && typeof prices === "object" && key in prices) {
      const value = (prices as Record<string, unknown>)[key];
      if (
        typeof value === "number" &&
        Number.isSafeInteger(value) &&
        value >= 0
      )
        return value;
    }
  } catch {
    /* Untrusted browser data is ignored. */
  }
}
