import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep ws optional native addons out of the server bundle.
  serverExternalPackages: ["@neondatabase/serverless", "ws"],
  turbopack: { root: process.cwd() },
  async headers() {
    return [
      {
        source: "/unsubscribe",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      ...["/order/open", "/order/success"].map((source) => ({
        source,
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
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
