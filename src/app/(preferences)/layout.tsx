import type { Metadata } from "next";
import Link from "next/link";
import { draftMode } from "next/headers";
import { editorialFont, displayFont } from "@/lib/fonts";
import { Wordmark } from "@/components/brand/wordmark";
import { SiteFooter } from "@/components/layout/site-footer";
import { SanityLive } from "@/sanity/lib/live";
import { getGlobalContent } from "@/sanity/lib/data";
import { isSanityConfigured } from "@/sanity/env";
import { DraftVisualEditing } from "@/components/cms/draft-visual-editing";
import { DisableDraftMode } from "@/components/cms/disable-draft-mode";
import { hasText } from "@/sanity/lib/content";
import "../globals.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
// Preference links use a separate root so storefront analytics cannot capture them.
export default async function PreferencesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ settings }, draft] = await Promise.all([
    getGlobalContent(),
    draftMode(),
  ]);
  return (
    <html
      lang="en"
      className={`${editorialFont.variable} ${displayFont.variable}`}
    >
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {hasText(settings?.brand?.wordmark) ? (
          <header className="shell py-8">
            <Link href="/" aria-label="Salted Focaccia home">
              <Wordmark
                value={settings?.brand?.wordmark}
                className="text-6xl"
              />
            </Link>
          </header>
        ) : null}
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter settings={settings} />
        {isSanityConfigured ? <SanityLive /> : null}
        {draft.isEnabled ? (
          <>
            <DraftVisualEditing />
            <DisableDraftMode />
          </>
        ) : null}
      </body>
    </html>
  );
}
