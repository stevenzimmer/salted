import type { Metadata } from "next";
import { StorefrontShell } from "@/components/layout/storefront-shell";
import { noIndex } from "@/lib/seo/policy";
import "../globals.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: noIndex, referrer: "no-referrer" };

export default function ConfirmationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
