"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Product, ProductVariant } from "@/types/content";
import { maximumInventory } from "@/lib/availability";
import { hasText } from "@/sanity/lib/content";
import { useCart } from "./cart-provider";

type ProductSelection = {
  product: Product;
  options: ProductVariant[];
  variant: ProductVariant | undefined;
  setVariantId: (id: string) => void;
};

const ProductSelectionContext = createContext<ProductSelection | null>(null);

export function ProductSelectionProvider({
  product,
  children,
}: {
  product: Product;
  children: ReactNode;
}) {
  const { schedule } = useCart();
  const [variantId, setVariantId] = useState<string | null>(null);
  const options = product.variants.filter((option) => hasText(option.label));
  const variant =
    options.find((option) => option.id === variantId) ??
    options.find(
      (option) => maximumInventory(schedule, product.id, option.id) > 0,
    ) ??
    options[0];

  return (
    <ProductSelectionContext
      value={{ product, options, variant, setVariantId }}
    >
      {children}
    </ProductSelectionContext>
  );
}

export function useProductSelection() {
  const selection = useContext(ProductSelectionContext);
  if (!selection)
    throw new Error(
      "Product controls must be used within ProductSelectionProvider",
    );
  return selection;
}
