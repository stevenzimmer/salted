import { draftMode } from "next/headers";
import { GoogleAnalytics } from "@next/third-parties/google";
import { DraftVisualEditing } from "@/components/cms/draft-visual-editing";
import { editorialFont, displayFont } from "@/lib/fonts";
import { storefrontSchedule } from "@/commerce/schedule";
import { CartProvider } from "@/components/commerce/cart-provider";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { SanityLive } from "@/sanity/lib/live";
import { getGlobalContent } from "@/sanity/lib/data";
import { isSanityConfigured } from "@/sanity/env";
import { DisableDraftMode } from "@/components/cms/disable-draft-mode";

export async function StorefrontShell({
  children,
  analytics = false,
}: {
  children: React.ReactNode;
  analytics?: boolean;
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
        {analytics ? <GoogleAnalytics gaId="G-FF1JFYJLTV" /> : null}
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <CartProvider
          schedule={await storefrontSchedule()}
          isDraftMode={draft}
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
