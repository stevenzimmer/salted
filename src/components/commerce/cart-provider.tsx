"use client";

import {
  createContext,
  useEffect,
  useContext,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import {
  getCartSnapshot,
  getServerCartSnapshot,
  subscribeCart,
  updateCart,
  rememberCartPrice,
} from "@/lib/cart-store";
import { MAX_CART_QUANTITY } from "@/lib/cart";
import { trackAddToCart, trackCheckoutEvent } from "@/lib/analytics";
import type { CommerceCopy, SiteSettings } from "../../../sanity.types";
import { normalizeCart } from "@/lib/cart";
import type { CartItem, MockSchedule, Product } from "@/types/content";

const CartDrawer = dynamic(
  () => import("./cart-drawer").then((module) => module.CartDrawer),
  { ssr: false },
);

type CartContextValue = {
  items: CartItem[];
  commerceEnabled: boolean;
  refreshAvailability: () => Promise<void>;
  updatePrices: (
    prices: { productId: string; variantId: string; unitPrice: number }[],
  ) => void;
  products: Product[];
  commerce: CommerceCopy | null;
  settings: SiteSettings | null;
  schedule: MockSchedule;
  open: boolean;
  setOpen: (open: boolean) => void;
  addItem: (item: CartItem) => boolean;
  setQuantity: (productId: string, variantId: string, quantity: number) => void;
  removeItem: (productId: string, variantId: string) => void;
  restoreFocus: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  children,
  schedule,
  products: initialProducts,
  commerce,
  settings,
  commerceEnabled = false,
}: {
  products: Product[];
  commerce: CommerceCopy | null;
  settings: SiteSettings | null;
  commerceEnabled?: boolean;
  children: ReactNode;
  schedule: MockSchedule;
}) {
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>(
    {},
  );
  const products = initialProducts.map((product) => ({
    ...product,
    variants: product.variants.map((variant) => ({
      ...variant,
      price: priceOverrides[`${product.id}:${variant.id}`] ?? variant.price,
    })),
  }));
  function updatePrices(
    prices: { productId: string; variantId: string; unitPrice: number }[],
  ) {
    setPriceOverrides((previous) => ({
      ...previous,
      ...Object.fromEntries(
        prices
          .filter((p) => Number.isSafeInteger(p.unitPrice) && p.unitPrice >= 0)
          .map((p) => [`${p.productId}:${p.variantId}`, p.unitPrice]),
      ),
    }));
  }
  const storedItems = useSyncExternalStore(
    subscribeCart,
    getCartSnapshot,
    getServerCartSnapshot,
  );
  const items = normalizeCart(
    storedItems,
    commerceEnabled ? undefined : products,
  );
  const [liveSchedule, setLiveSchedule] = useState<MockSchedule | null>(null);
  const currentSchedule = liveSchedule ?? schedule;
  async function refreshAvailability() {
    try {
      const response = await fetch("/api/commerce/availability", {
        cache: "no-store",
      });
      const value: unknown = await response.json();
      const { scheduleInput } = await import("@/lib/schedule-validation");
      const parsed = scheduleInput.safeParse(value);
      setLiveSchedule(
        response.ok && parsed.success
          ? parsed.data
          : { dates: [], availability: [] },
      );
    } catch {
      setLiveSchedule({ dates: [], availability: [] });
    }
  }
  useEffect(() => {
    const refresh = () => {
      void refreshAvailability();
    };
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
    // Availability is read-only and remains current when payments are disabled.
  }, []);
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const opener = useRef<HTMLElement | null>(null);

  function handleOpen(next: boolean) {
    if (next) {
      if (!open && document.activeElement instanceof HTMLElement) {
        opener.current = document.activeElement;
      }
      setHasOpened(true);
      void refreshAvailability();
    }
    setOpen(next);
  }

  function restoreFocus() {
    if (opener.current?.isConnected) opener.current.focus();
    else document.querySelector<HTMLButtonElement>(".cart-trigger")?.focus();
  }

  function addItem(item: CartItem): boolean {
    if (
      !products.some(
        (product) =>
          product.id === item.productId &&
          product.active &&
          product.variants.some(
            (variant) =>
              variant.id === item.variantId && variant.active !== false,
          ),
      )
    )
      return false;
    const current =
      getCartSnapshot().find(
        (line) =>
          line.productId === item.productId &&
          line.variantId === item.variantId,
      )?.quantity ?? 0;
    const max = MAX_CART_QUANTITY;
    if (
      item.quantity < 1 ||
      !Number.isSafeInteger(item.quantity) ||
      current + item.quantity > max
    ) {
      if (Number.isSafeInteger(item.quantity) && item.quantity > 0) {
        trackCheckoutEvent("add_to_cart_blocked", {
          item_id: item.productId,
          item_variant: item.variantId,
          requested_quantity: item.quantity,
          cart_quantity: current,
          available_quantity: max,
          reason_code: "quantity_limit",
        });
      }
      return false;
    }
    if (current === 0) {
      const variant = products
        .find((p) => p.id === item.productId)
        ?.variants.find((v) => v.id === item.variantId);
      if (variant)
        rememberCartPrice(item.productId, item.variantId, variant.price);
    }
    updateCart((cart) => [...cart, item]);
    trackAddToCart(item, products);
    handleOpen(true);
    return true;
  }

  function setQuantity(productId: string, variantId: string, quantity: number) {
    if (
      !Number.isSafeInteger(quantity) ||
      !products.some(
        (product) =>
          product.id === productId &&
          product.active &&
          product.variants.some(
            (variant) => variant.id === variantId && variant.active !== false,
          ),
      )
    )
      return;
    updateCart((cart) =>
      cart.map((item) =>
        item.productId === productId && item.variantId === variantId
          ? {
              ...item,
              quantity: Math.min(MAX_CART_QUANTITY, Math.max(1, quantity)),
            }
          : item,
      ),
    );
  }

  function removeItem(productId: string, variantId: string) {
    updateCart((cart) =>
      cart.filter(
        (item) => item.productId !== productId || item.variantId !== variantId,
      ),
    );
  }

  return (
    <CartContext
      value={{
        items,
        products,
        commerce,
        settings,
        schedule: currentSchedule,
        commerceEnabled,
        refreshAvailability,
        updatePrices,
        open,
        setOpen: handleOpen,
        addItem,
        setQuantity,
        removeItem,
        restoreFocus,
      }}
    >
      {children}
      {hasOpened ? <CartDrawer /> : null}
    </CartContext>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
