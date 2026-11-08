"use client";
import { useState } from "react";
import { useCart } from "./cart-provider";
import { hasText } from "@/sanity/lib/content";
export function CheckoutReturn() {
  const { commerceEnabled, commerce, refreshAvailability } = useCart();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  if (!commerceEnabled) return null;
  async function endCheckout() {
    setBusy(true);
    setError(false);
    try {
      const response = await fetch("/api/commerce/cancel", { method: "POST" });
      if (!response.ok) throw new Error();
      sessionStorage.removeItem("salted:checkout-request");
      window.history.replaceState(null, "", window.location.pathname);
      await refreshAvailability();
    } catch {
      setError(true);
    }
    setBusy(false);
  }
  return hasText(commerce?.checkout?.cancel) ? (
    <div className="checkout-notice">
      <button
        type="button"
        className="text-button"
        onClick={endCheckout}
        disabled={busy}
      >
        {commerce.checkout.cancel}
      </button>
      {error ? (
        <p role="alert">Please retry ending your previous checkout.</p>
      ) : null}
    </div>
  ) : null;
}
