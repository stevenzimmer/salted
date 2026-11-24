import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import {
  fixedSearchPages,
  getFixedSearchPage,
  getSearchSettings,
  type FixedSearchPath,
} from "@/lib/seo/content";
import { searchableProduct, searchableRecipe } from "@/lib/seo/eligibility";
import { canIndexHost, canonicalUrl, detailPath } from "@/lib/seo/policy";
import { clean } from "@/sanity/lib/content";
import { fetchContent } from "@/sanity/lib/fetch-content";
import { SEARCH_SITEMAP_DETAILS_QUERY } from "@/sanity/lib/queries";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!canIndexHost((await headers()).get("host"))) return [];
  const settings = await getSearchSettings();
  if (settings?.seo?.noIndex === true) return [];

  const paths = Object.keys(fixedSearchPages) as FixedSearchPath[];
  const [fixed, details] = await Promise.all([
    Promise.all(
      paths.map(async (path) => ({
        path,
        ...(await getFixedSearchPage(path)),
      })),
    ),
    fetchContent(SEARCH_SITEMAP_DETAILS_QUERY, {}, { publishedOnly: true }),
  ]);
  const entries = new Map<string, string | undefined>();
  for (const { path, page, eligible } of fixed) {
    if (eligible) entries.set(path, page?._updatedAt);
  }
  for (const product of details?.products ?? []) {
    if (searchableProduct(product)) {
      entries.set(
        detailPath("products", clean(product.slug?.current)),
        product._updatedAt,
      );
    }
  }
  for (const recipe of details?.recipes ?? []) {
    if (searchableRecipe(recipe)) {
      entries.set(
        detailPath("recipes", clean(recipe.slug?.current)),
        recipe._updatedAt,
      );
    }
  }
  return Array.from(entries, ([path, lastModified]) => ({
    url: canonicalUrl(path),
    lastModified,
  }));
}
