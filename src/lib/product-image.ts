import type { Product, ProductVariant } from "@/types/content";
import type { ImageWithAlt } from "../../sanity.types";
import { clean, hasImage } from "@/sanity/lib/content";

type DefaultProductImage = { src: string; alt: string };
type ProductImageSelection = {
  image: ImageWithAlt | undefined;
  path: string;
  fallback?: DefaultProductImage;
};

const focacciaSizeImages = new Map<string, DefaultProductImage>([
  [
    "round",
    {
      src: "/images/products/focaccia-6-inch-round.jpg",
      alt: "6-inch round focaccia sizing guide: about 1–2 side servings or two large sandwiches. Split horizontally, then cut in half. Side servings vary by cut; plan an extra loaf for leftovers.",
    },
  ],
  [
    "square",
    {
      src: "/images/products/focaccia-8x8-square.jpg",
      alt: "8×8 square focaccia sizing guide: about 4–6 side servings. For sandwiches, cut into four squares, then split horizontally. Side servings vary by cut; plan an extra loaf for leftovers.",
    },
  ],
  [
    "pan",
    {
      src: "/images/products/focaccia-9x13-pan.jpg",
      alt: "9×13 pan focaccia sizing guide: about 8–12 side servings. For sandwiches, cut into 6–8 pieces, then split horizontally. Side servings vary by cut; plan an extra loaf for leftovers.",
    },
  ],
]);

export function getProductImage(
  product: Product,
  variant?: ProductVariant,
): ProductImageSelection {
  if (hasImage(variant?.image)) {
    return {
      image: variant.image,
      path: `variants[_key==${JSON.stringify(clean(variant._key))}].image`,
    };
  }
  const category = clean(product.category);
  const fallback =
    variant &&
    (category === "product-category-focaccia" || category === "focaccia")
      ? focacciaSizeImages.get(clean(variant.id))
      : undefined;
  if (fallback) return { image: undefined, path: "image", fallback };

  return {
    image: hasImage(product.image) ? product.image : undefined,
    path: "image",
  };
}
