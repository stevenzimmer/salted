import type { Product, ProductVariant } from "@/types/content";
import { clean, hasImage } from "@/sanity/lib/content";

export function getProductImage(product: Product, variant?: ProductVariant) {
  if (hasImage(variant?.image)) {
    return {
      image: variant.image,
      path: `variants[_key==${JSON.stringify(clean(variant._key))}].image`,
    };
  }
  return {
    image: hasImage(product.image) ? product.image : undefined,
    path: "image",
  };
}
