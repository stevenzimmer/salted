import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { GoogleAnalytics } from "@next/third-parties/google";
import { DraftVisualEditing } from "@/components/cms/draft-visual-editing";
import { editorialFont, displayFont } from "@/lib/fonts";
import { getMockSchedule } from "@/data/product-availability";
import { CartProvider } from "@/components/commerce/cart-provider";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { SanityLive } from "@/sanity/lib/live";
import { getGlobalContent } from "@/sanity/lib/data";
import { contentMetadata } from "@/sanity/lib/metadata";
import { isSanityConfigured } from "@/sanity/env";
import { DisableDraftMode } from "@/components/cms/disable-draft-mode";
import "../globals.css";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getGlobalContent();
  return {
    ...contentMetadata(settings?.seo, "/"),
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    ),
    robots: { index: false, follow: false },
  };
}
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { settings, commerce, products } = await getGlobalContent();
  const draft = (await draftMode()).isEnabled;
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${editorialFont.variable} ${displayFont.variable}`}
    >
      <body>
        <GoogleAnalytics gaId="G-FF1JFYJLTV" />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <CartProvider
          schedule={getMockSchedule()}
          products={products}
          commerce={commerce}
          settings={settings}
        >
          <AnnouncementBar settings={settings} />
          <SiteHeader settings={settings} />
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter settings={settings} />
        </CartProvider>
        {isSanityConfigured ? <SanityLive /> : null}
        {draft ? (
          <>
            <DraftVisualEditing />
            <DisableDraftMode />
          </>
        ) : null}
      </body>
    </html>
  );
}
