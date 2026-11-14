import type { Metadata } from "next";
import { editorialFont, displayFont } from "@/lib/fonts";
import "../../../globals.css";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
// Capability-bearing fragments must never reach storefront analytics or third-party scripts.
export default function OrderAccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${editorialFont.variable} ${displayFont.variable}`}
    >
      <body>
        <main className="shell py-16">{children}</main>
      </body>
    </html>
  );
}
