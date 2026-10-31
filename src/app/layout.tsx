import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { editorialFont, displayFont } from "@/lib/fonts";
import { siteConfig } from "@/data/site-config";
import { getMockSchedule } from "@/data/product-availability";
import { CartProvider } from "@/components/commerce/cart-provider";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import "./globals.css";

// The rolling demo calendar is calculated at request time, never frozen at build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Salted Focaccia · A little salty. A lot to love.",
    template: "%s | Salted Focaccia",
  },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    locale: "en_US",
  },
  robots: { index: false, follow: false }, // Remove only when approved content is ready for launch.
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
        <CartProvider schedule={getMockSchedule()}>
          <AnnouncementBar />
          <SiteHeader />
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
