import "server-only";
import { cache } from "react";
import { draftMode } from "next/headers";
import { fetchContent } from "@/sanity/lib/fetch-content";
import {
  hasCopy,
  hasImage,
  hasPortableTextContent,
} from "@/sanity/lib/content";
import {
  ABOUT_QUERY,
  HOME_QUERY,
  PICKUP_QUERY,
  PRODUCT_QUERY,
  RECIPE_QUERY,
  RECIPES_PAGE_QUERY,
  SEARCH_SETTINGS_QUERY,
  SPECIAL_ORDERS_QUERY,
  STORAGE_QUERY,
} from "@/sanity/lib/queries";

const published = { publishedOnly: true };

export const getSearchSettings = cache(() =>
  fetchContent(SEARCH_SETTINGS_QUERY, {}, published),
);
export const getSearchPickup = cache(() =>
  fetchContent(PICKUP_QUERY, {}, published),
);
export const getSearchProduct = cache((slug: string) =>
  fetchContent(PRODUCT_QUERY, { slug }, published),
);
export const getSearchRecipe = cache((slug: string) =>
  fetchContent(RECIPE_QUERY, { slug }, published),
);
export const isSearchDraft = cache(async () => (await draftMode()).isEnabled);

export const fixedSearchPages = {
  "/": {
    title: "Sourdough Focaccia Bakery in Rocklin, CA",
    description:
      "Order small-batch sourdough focaccia and bread online for Friday pickup in Rocklin, California.",
    type: "WebPage",
    load: async () => {
      const page = (await fetchContent(HOME_QUERY, {}, published))?.page;
      return { page, eligible: !!page, description: page?.hero?.description };
    },
  },
  "/about": {
    title: "About Our Rocklin Sourdough Bakery",
    description:
      "Meet Salted Focaccia, a small-batch bakery making sourdough focaccia and bread for local pickup in Rocklin, California.",
    type: "AboutPage",
    load: async () => {
      const page = await fetchContent(ABOUT_QUERY, {}, published);
      return {
        page,
        eligible:
          !!page &&
          (hasCopy(page.intro) || hasCopy(page.story) || hasImage(page.image)),
        description: page?.intro?.description,
        image: page?.image,
      };
    },
  },
  "/pickup": {
    title: "Friday Bread Pickup in Rocklin, CA",
    description:
      "Plan Friday pickup for your Salted Focaccia order in Rocklin, California. Check ordering deadlines, pickup hours and what to expect.",
    type: "WebPage",
    load: async () => {
      const page = await getSearchPickup();
      return {
        page,
        eligible:
          !!page &&
          [page.intro, page.when, page.where, page.policies].some(hasCopy),
        description: page?.intro?.description,
      };
    },
  },
  "/special-orders": {
    title: "Special Order Focaccia in Placer County",
    description:
      "Request sourdough focaccia for a party or gathering. Salted Focaccia reviews special-order requests for local pickup.",
    type: "WebPage",
    load: async () => {
      const page = await fetchContent(SPECIAL_ORDERS_QUERY, {}, published);
      return { page, eligible: !!page, description: page?.intro?.description };
    },
  },
  "/storage-heating": {
    title: "How to Store & Reheat Focaccia",
    description:
      "Find Salted Focaccia’s bread care guide for keeping, reheating and freezing focaccia and sourdough bread.",
    type: "WebPage",
    load: async () => {
      const page = await fetchContent(STORAGE_QUERY, {}, published);
      const guide = page?.guide;
      const eligible =
        !!page &&
        (hasCopy(page.intro) ||
          hasCopy(guide) ||
          Object.values(guide ?? {}).some(
            (value) => Array.isArray(value) && hasPortableTextContent(value),
          ));
      return { page, eligible, description: page?.intro?.description };
    },
  },
  "/recipes": {
    title: "Focaccia Recipes & Serving Ideas",
    description:
      "Find serving ideas and recipes for sourdough focaccia, from sandwiches to bread salads, as Salted Focaccia publishes them.",
    type: "CollectionPage",
    load: async () => {
      const page = await fetchContent(RECIPES_PAGE_QUERY, {}, published);
      return {
        page,
        eligible: !!page && (hasCopy(page.intro) || hasCopy(page.listing)),
        description: page?.intro?.description,
      };
    },
  },
} as const;

export type FixedSearchPath = keyof typeof fixedSearchPages;

export const getFixedSearchPage = cache(async (path: FixedSearchPath) => {
  const config = fixedSearchPages[path];
  const content = await config.load();
  return {
    ...content,
    eligible: content.eligible && content.page?.seo?.noIndex !== true,
    image: "image" in content ? content.image : undefined,
    config,
  };
});
