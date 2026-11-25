import type { Metadata } from "next";
import type { Homepage, ImageWithAlt } from "../../../sanity.types";
import type { Product } from "@/types/content";
import { clean, hasText } from "@/sanity/lib/content";
import { approvedPhoto } from "@/lib/seo/fields";
import { money } from "@/lib/format";

export const shareImageSize = { width: 1200, height: 630 };
export const homeShareImagePath = "/api/og/home";

export function productShareImagePath(slug: string) {
  return `/api/og/products/${encodeURIComponent(slug)}`;
}

type HomeShareCard = {
  kind: "home";
  eyebrow: string;
  tagline: string;
  photo?: ImageWithAlt;
};
type ProductShareCard = {
  kind: "product";
  title: string;
  description: string;
  price?: string;
  photo?: ImageWithAlt;
  background: "cream" | "oat";
};
export type ShareCard = HomeShareCard | ProductShareCard;

function cardText(text: string | null | undefined) {
  return clean(text).replace(/\s+/g, " ").trim();
}

export function homeShareCard(
  page: Pick<Homepage, "hero" | "heroImage" | "heroPhotos">,
): HomeShareCard {
  return {
    kind: "home",
    eyebrow: [cardText(page.hero?.caption), cardText(page.hero?.location)]
      .filter(Boolean)
      .join(" · "),
    tagline: cardText(page.hero?.eyebrow),
    photo:
      approvedPhoto(page.heroImage) ?? page.heroPhotos?.find(approvedPhoto),
  };
}

export function productShareCard(
  product: Product,
  from?: string,
): ProductShareCard {
  const activePrices = product.variants
    .filter((variant) => variant.active !== false)
    .map((variant) => variant.price);
  const price =
    product.active && activePrices.length > 0
      ? [cardText(from), money(Math.min(...activePrices))]
          .filter(hasText)
          .join(" ")
      : undefined;
  return {
    kind: "product",
    title: cardText(product.name),
    description: cardText(product.shortDescription),
    price,
    photo: approvedPhoto(product.image),
    background:
      product.category === "product-category-sourdough" ? "oat" : "cream",
  };
}

export function shareCardMetadata(
  url: string,
  card: ShareCard,
): Pick<Metadata, "openGraph" | "twitter"> {
  const copy =
    card.kind === "home"
      ? [card.eyebrow, card.tagline]
      : [card.title, card.description];
  const photoAlt = card.photo?.decorative ? undefined : card.photo?.alt;
  const alt = ["Salted", ...copy, cardText(photoAlt)]
    .filter(hasText)
    .join(" · ");
  const image = { url, ...shareImageSize, alt, type: "image/png" };
  return {
    openGraph: { images: [image] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}
