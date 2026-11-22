import type { Metadata } from "next";
import { draftMode } from "next/headers";
import type { ReactNode } from "react";
import { DisableDraftMode } from "@/components/cms/disable-draft-mode";
import { DraftVisualEditing } from "@/components/cms/draft-visual-editing";
import { displayFont, editorialFont } from "@/lib/fonts";
import { isSanityConfigured } from "@/sanity/env";
import { SanityLive } from "@/sanity/lib/live";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  robots: { index: false, follow: false },
};

export default async function PackagingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const draft = (await draftMode()).isEnabled;

  return (
    <html
      lang="en"
      className={`${editorialFont.variable} ${displayFont.variable}`}
    >
      <body>
        {children}
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
