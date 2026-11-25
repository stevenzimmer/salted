import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getSearchSettings } from "@/lib/seo/content";
import { canIndexHost, canonicalUrl, siteHost } from "@/lib/seo/policy";

// Preserve the named content-collection restrictions on the existing domain.
// Discovery crawlers use the public wildcard rule after cutover.
const restrictedCrawlers = [
  "AI2Bot",
  "Ai2Bot-Dolma",
  "aiHitBot",
  "Amazonbot",
  "anthropic-ai",
  "Applebot-Extended",
  "Bytespider",
  "CCBot",
  "ClaudeBot",
  "cohere-ai",
  "cohere-training-data-crawler",
  "FacebookBot",
  "Google-Extended",
  "GoogleOther",
  "GoogleOther-Image",
  "GoogleOther-Video",
  "GPTBot",
  "img2dataset",
  "Meta-ExternalAgent",
  "MyCentralAIScraperBot",
  "omgili",
  "omgilibot",
  "Quora-Bot",
  "TikTokSpider",
];

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host")?.toLowerCase() ?? null;
  const launch = canIndexHost(host);
  const settings = launch ? await getSearchSettings() : null;
  return {
    rules: [
      ...(host === siteHost
        ? [{ userAgent: restrictedCrawlers, disallow: "/" }]
        : []),
      {
        userAgent: "*",
        allow: ["/", "/api/og/"],
        disallow: ["/studio", "/api/", "/order/"],
      },
    ],
    ...(launch && settings?.seo?.noIndex !== true
      ? { sitemap: canonicalUrl("/sitemap.xml") }
      : {}),
  };
}
