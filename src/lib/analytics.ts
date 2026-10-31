import { sendGAEvent } from "@next/third-parties/google";

export type CheckoutStep = "bag" | "pickup" | "payment_preview";

type CartContext = {
  item_count: number;
};

type CheckoutEvents = {
  add_to_cart_blocked: {
    item_id: string;
    item_variant: string;
    requested_quantity: number;
    cart_quantity: number;
    available_quantity: number;
    reason_code: "quantity_limit";
  };
  pickup_dates_unavailable: CartContext & {
    step_name: "pickup";
    available_date_count: 0;
  };
  pickup_date_selected: CartContext & {
    pickup_date: string;
    available_date_count: number;
  };
  checkout_step_view: CartContext & {
    step_name: CheckoutStep;
    available_date_count: number;
  };
  checkout_back: CartContext & {
    from_step: CheckoutStep;
    to_step: CheckoutStep;
  };
  checkout_closed: CartContext & {
    step_name: CheckoutStep;
  };
  order_preview_view: {
    has_valid_pickup_date: boolean;
  };
};

export function trackCheckoutEvent<Name extends keyof CheckoutEvents>(
  name: Name,
  parameters: CheckoutEvents[Name],
): void {
  if (typeof window === "undefined") return;

  try {
    // A page-view effect can run before the after-hydration GA script creates
    // its queue. The script preserves this queue when it initializes.
    window.dataLayer ??= [];
    sendGAEvent("event", name, {
      ...parameters,
      flow_version: "checkout_preview_v1",
      preview_mode: true,
    });
  } catch {
    // Analytics must never prevent a cart update or checkout navigation.
  }
}
