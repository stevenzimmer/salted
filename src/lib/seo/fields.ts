import type { ImageWithAlt } from "../../../sanity.types";
import { imageUrl } from "@/components/cms/image";
import { clean, hasImage } from "@/sanity/lib/content";

export function searchText(value?: string | null) {
  return clean(value).replace(/\s+/g, " ").trim() || undefined;
}

export function approvedPhoto(image: ImageWithAlt | null | undefined) {
  return hasImage(image) &&
    !image.decorative &&
    !/\b(?:placeholder|stock photo|mockup)\b/i.test(
      clean(image.alt) + " " + clean(image.caption),
    )
    ? image
    : undefined;
}

export function searchImage(
  image: ImageWithAlt | null | undefined,
  width = 1200,
  height = 630,
) {
  const photo = approvedPhoto(image);
  const url = imageUrl(photo, width, width / height, "jpg");
  return url ? { url, width, height, alt: searchText(photo?.alt) } : undefined;
}
