"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Product, ProductVariant } from "@/types/content";
import { hasText } from "@/sanity/lib/content";

type ProductSelection = {
  product: Product;
  options: ProductVariant[];
  variant: ProductVariant | undefined;
  setVariantId: (id: string | null) => void;
};

const ProductSelectionContext = createContext<ProductSelection | null>(null);

export function ProductSelectionProvider({
  product,
  children,
}: {
  product: Product;
  children: ReactNode;
}) {
  const options = product.variants.filter((option) => hasText(option.label));
  const [variantId, setVariantId] = useState<string | null>(() =>
    options.length === 1 && options[0].active !== false ? options[0].id : null,
  );
  const variant = options.find(
    (option) => option.id === variantId && option.active !== false,
  );

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
