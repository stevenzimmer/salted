import type { NextConfig } from "next";
import { HTML_LIMITED_BOT_UA_RE } from "next/dist/shared/lib/router/utils/html-bots";
import {
  launchApproved,
  noIndexHeader,
  privateSearchPaths,
  siteHost,
  siteOrigin,
} from "./src/lib/seo/policy";

const nextConfig: NextConfig = {
  experimental: { agentUpgrade: "security" },
  // Keep ws optional native addons out of the server bundle.
  serverExternalPackages: ["@neondatabase/serverless", "ws"],
  turbopack: { root: process.cwd() },
  // Preserve Next's social crawler defaults and add search crawlers that may
  // extract metadata without executing Next's streamed head instructions.
  htmlLimitedBots: new RegExp(
    `${HTML_LIMITED_BOT_UA_RE.source}|Googlebot|OAI-SearchBot|PerplexityBot`,
    "i",
  ),
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          { type: "host", value: `www[.]${siteHost.replaceAll(".", "\\.")}` },
        ],
        destination: `${siteOrigin}/:path*`,
        permanent: true,
      },
    ];
  },
  async headers() {
    const robots = [{ key: "X-Robots-Tag", value: noIndexHeader }];
    return [
      {
        source: "/:path*",
        ...(launchApproved()
          ? {
              missing: [
                {
                  type: "host" as const,
                  value: siteHost.replaceAll(".", "\\."),
                },
              ],
            }
          : {}),
        headers: robots,
      },
      {
        source: "/:path*",
        has: [{ type: "cookie", key: "__prerender_bypass" }],
        headers: robots,
      },
      ...privateSearchPaths.map((source) => ({ source, headers: robots })),
      {
        source: "/unsubscribe",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      ...["/order/open", "/order/success"].map((source) => ({
        source,
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      })),
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/**" },
    ],
  },
};

export default nextConfig;
