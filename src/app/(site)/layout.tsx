import type { Metadata } from "next";
import { StorefrontShell } from "@/components/layout/storefront-shell";
import { noIndex, siteName, siteOrigin } from "@/lib/seo/policy";
import "../globals.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: { default: siteName, template: `%s | ${siteName}` },
  robots: noIndex,
};
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StorefrontShell analytics>{children}</StorefrontShell>;
}
