import type { Product } from "@/types/content";
import type { CartItem } from "@/types/content";

export const MAX_CART_QUANTITY = 20;

export function normalizeCart(
  input: unknown,
  products?: Product[],
): CartItem[] {
  if (!Array.isArray(input)) return [];
  const rows = new Map<string, CartItem>();
  for (const value of input) {
    if (typeof value !== "object" || value === null) continue;
    const { productId, variantId, quantity } = value;
    if (
      typeof productId !== "string" ||
      typeof variantId !== "string" ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    )
      continue;
    const product = products?.find(
      (product) => product.id === productId && product.active,
    );
    if (
      products &&
      !product?.variants.some((variant) => variant.id === variantId)
    )
      continue;
    const key = `${productId}:${variantId}`;
    rows.set(key, {
      productId,
      variantId,
      quantity: Math.min(
        MAX_CART_QUANTITY,
        quantity + (rows.get(key)?.quantity ?? 0),
      ),
    });
  }
  return [...rows.values()];
}

export function resolveCart(items: CartItem[], products: Product[]) {
  return items.flatMap((item) => {
    const product = products.find(
      (product) => product.id === item.productId && product.active,
    );
    const variant = product?.variants.find(
      (variant) => variant.id === item.variantId,
    );
    return product && variant
      ? [
          {
            ...item,
            product,
            variant,
            lineTotal: variant.price * item.quantity,
          },
        ]
      : [];
  });
}

export function cartSubtotal(items: CartItem[], products: Product[]): number {
  return resolveCart(items, products).reduce(
    (subtotal, line) => subtotal + line.lineTotal,
    0,
  );
}
