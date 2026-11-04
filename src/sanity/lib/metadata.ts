import type { Metadata } from "next";
import type { Seo } from "../../../sanity.types";
import { clean, hasText } from "./content";
import { imageUrl } from "@/components/cms/image";

export function contentMetadata(
  seo: Partial<Seo> | null | undefined,
  path: string,
): Metadata {
  const image = imageUrl(seo?.image);
  return {
    ...(hasText(seo?.title) ? { title: clean(seo.title) } : {}),
    ...(hasText(seo?.description)
      ? { description: clean(seo.description) }
      : {}),
    alternates: { canonical: path },
    ...(image ? { openGraph: { images: [image] } } : {}),
  };
}
