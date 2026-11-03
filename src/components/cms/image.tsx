import Image from "next/image";
import { createImageUrlBuilder } from "@sanity/image-url";
import { createDataAttribute } from "next-sanity";
import type { ImageWithAlt } from "../../../sanity.types";
import { dataset, projectId } from "@/sanity/env";
import { clean, hasImage, hasText } from "@/sanity/lib/content";

const builder = createImageUrlBuilder({ projectId, dataset });
export function imageUrl(
  image: ImageWithAlt | null | undefined,
  width = 1600,
  aspectRatio?: number,
) {
  if (!hasImage(image)) return undefined;
  const url = builder.image(image).width(width).auto("format");
  // Code owns the display ratio; Sanity owns crop and focal-point selection.
  return (
    aspectRatio ? url.height(Math.round(width / aspectRatio)).fit("crop") : url
  ).url();
}
export function imageAnnotation(
  documentId: string,
  path: string,
  documentType: string,
) {
  return createDataAttribute({
    id: clean(documentId),
    type: documentType,
    path,
    projectId,
    dataset,
    baseUrl: "/studio",
  }).toString();
}
export function CmsImage({
  image,
  documentId,
  documentType,
  path,
  className,
  sizes = "100vw",
  preload = false,
  fill = true,
  aspectRatio,
}: {
  image?: ImageWithAlt | null;
  documentId: string;
  documentType: string;
  path: string;
  className?: string;
  sizes?: string;
  preload?: boolean;
  fill?: boolean;
  aspectRatio?: number;
}) {
  const src = imageUrl(image, 1600, aspectRatio);
  if (!src || !hasImage(image)) return null;
  // Invalid imported meaningful images are omitted instead of inventing alt text.
  if (!image.decorative && !hasText(image.alt)) return null;
  return (
    <Image
      src={src}
      alt={image.decorative ? "" : clean(image.alt)}
      data-sanity={imageAnnotation(documentId, path, documentType)}
      fill={fill || undefined}
      width={fill ? undefined : 1200}
      height={fill ? undefined : 900}
      sizes={sizes}
      preload={preload}
      className={className}
    />
  );
}
