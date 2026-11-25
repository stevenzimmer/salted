import "server-only";
import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ImageWithAlt, Seo } from "../../../sanity.types";
import { homeShareImagePath, shareImageSize } from "@/lib/og/cards";
import {
  getFixedSearchPage,
  getSearchSettings,
  isSearchDraft,
  type FixedSearchPath,
} from "./content";
import { searchImage, searchText } from "./fields";
import {
  canIndexHost,
  canonicalUrl,
  noIndex,
  siteHost,
  siteName,
} from "./policy";

const brandImage = {
  url: canonicalUrl(homeShareImagePath),
  alt: siteName,
  ...shareImageSize,
};

function brandedTitle(value: string) {
  return value.toLowerCase().includes(siteName.toLowerCase())
    ? value
    : `${value} | ${siteName}`;
}

type PageMetadataInput = {
  path: string;
  eligible: boolean;
  seo?: Seo | null;
  title: string;
  description?: string | null;
  fallbackDescription?: string;
  image?: ImageWithAlt | null;
  article?: boolean;
};

export async function pageMetadata(
  input: PageMetadataInput,
): Promise<Metadata> {
  const [settings, requestHeaders, draft] = await Promise.all([
    getSearchSettings(),
    headers(),
    isSearchDraft(),
  ]);
  const defaults = settings?.seo;
  const seo = input.seo;
  const title = brandedTitle(
    searchText(seo?.title) ??
      searchText(input.title) ??
      searchText(defaults?.title) ??
      siteName,
  );
  const description =
    searchText(seo?.description) ??
    searchText(input.description) ??
    input.fallbackDescription ??
    searchText(defaults?.description);
  const url = canonicalUrl(input.path);
  const pageImage =
    searchImage(seo?.image) ??
    searchImage(input.image) ??
    searchImage(defaults?.image) ??
    brandImage;
  const socialTitle =
    searchText(seo?.socialTitle) ?? searchText(defaults?.socialTitle) ?? title;
  const socialDescription =
    searchText(seo?.socialDescription) ??
    description ??
    searchText(defaults?.socialDescription);
  const host = requestHeaders.get("host")?.toLowerCase() ?? null;
  const bingVerification = searchText(process.env.BING_SITE_VERIFICATION);
  const index =
    canIndexHost(host) &&
    !draft &&
    input.eligible &&
    seo?.noIndex !== true &&
    defaults?.noIndex !== true;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    robots: index
      ? {
          index: true,
          follow: true,
          googleBot: { "max-image-preview": "large" },
        }
      : noIndex,
    openGraph: {
      title: socialTitle,
      description: socialDescription,
      url,
      siteName,
      type: input.article ? "article" : "website",
      locale: "en_US",
      images: [pageImage],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: socialDescription,
      images: [pageImage],
    },
    ...(host === siteHost && !draft && input.path === "/"
      ? {
          verification: {
            google: searchText(process.env.GOOGLE_SITE_VERIFICATION),
            other: bingVerification
              ? { "msvalidate.01": bingVerification }
              : undefined,
          },
        }
      : {}),
  };
}

export async function fixedPageMetadata(path: FixedSearchPath) {
  const [{ page, eligible, config, description, image }] = await Promise.all([
    getFixedSearchPage(path),
    getSearchSettings(),
  ]);
  return pageMetadata({
    path,
    eligible,
    seo: page?.seo,
    title: config.title,
    description,
    fallbackDescription: config.description,
    image,
  });
}
