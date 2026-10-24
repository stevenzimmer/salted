"use client";

import {
  createContext,
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
} from "@/lib/cart-store";
import { maximumInventory } from "@/lib/availability";
import { MAX_CART_QUANTITY } from "@/lib/cart";
import type { CartItem, MockSchedule } from "@/types/content";

const CartDrawer = dynamic(
  () => import("./cart-drawer").then((module) => module.CartDrawer),
  { ssr: false },
);

type CartContextValue = {
  items: CartItem[];
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
}: {
  children: ReactNode;
  schedule: MockSchedule;
}) {
  const items = useSyncExternalStore(
    subscribeCart,
    getCartSnapshot,
    getServerCartSnapshot,
  );
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const opener = useRef<HTMLElement | null>(null);

  function handleOpen(next: boolean) {
    if (next) {
      if (!open && document.activeElement instanceof HTMLElement) {
        opener.current = document.activeElement;
      }
      setHasOpened(true);
    }
    setOpen(next);
  }

  function restoreFocus() {
    if (opener.current?.isConnected) opener.current.focus();
    else document.querySelector<HTMLButtonElement>(".cart-trigger")?.focus();
  }

  function addItem(item: CartItem): boolean {
    const current =
      getCartSnapshot().find(
        (line) =>
          line.productId === item.productId &&
          line.variantId === item.variantId,
      )?.quantity ?? 0;
    const max = Math.min(
      MAX_CART_QUANTITY,
      maximumInventory(schedule, item.productId, item.variantId),
    );
    if (
      item.quantity < 1 ||
      !Number.isSafeInteger(item.quantity) ||
      current + item.quantity > max
    )
      return false;
    updateCart((cart) => [...cart, item]);
    handleOpen(true);
    return true;
  }

  function setQuantity(productId: string, variantId: string, quantity: number) {
    const max = Math.min(
      MAX_CART_QUANTITY,
      maximumInventory(schedule, productId, variantId),
    );
    updateCart((cart) =>
      cart.map((item) =>
        item.productId === productId && item.variantId === variantId
          ? { ...item, quantity: Math.min(max, Math.max(1, quantity)) }
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
        schedule,
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
