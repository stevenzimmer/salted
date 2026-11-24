export const siteOrigin = "https://saltedfocaccia.com";
export const siteHost = "saltedfocaccia.com";
export const siteName = "Salted Focaccia";
export const noIndex = { index: false, follow: false };
export const noIndexHeader = "noindex, nofollow";

export const privateSearchPaths = [
  "/api/:path*",
  "/studio/:path*",
  "/order/:path*",
  "/unsubscribe",
  "/links",
  "/privacy",
  "/terms",
];

export function launchApproved() {
  return (
    process.env.SEO_INDEXING_ENABLED === "true" &&
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL_ENV !== "preview" &&
    process.env.VERCEL_ENV !== "development"
  );
}

export function canIndexHost(host: string | null) {
  return launchApproved() && host?.toLowerCase() === siteHost;
}

export function canonicalUrl(path: string) {
  return new URL(path, siteOrigin).href;
}

export function detailPath(kind: "products" | "recipes", slug: string) {
  return `/${kind}/${encodeURIComponent(slug)}`;
}
