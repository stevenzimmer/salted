import Link from "next/link";
import { ArrowUpRight, Camera } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { LogoMark } from "@/components/brand/logo-mark";
import { CmsImage } from "@/components/cms/image";
import { Text } from "@/components/cms/text";
import { navigation } from "@/lib/navigation";
import { hasImage, hasText, safeUrl } from "@/sanity/lib/content";
import type { SiteSettings } from "../../../sanity.types";
export function SiteFooter({ settings }: { settings: SiteSettings | null }) {
  if (!settings) return null;
  const b = settings.brand,
    n = settings.navigation,
    c = settings.contact;
  const links = navigation(settings),
    instagram = safeUrl(c?.instagramUrl);
  const brand = [b?.wordmark, b?.tagline, b?.footerCopy].some(hasText);
  const social =
    hasImage(settings.footerImage) ||
    [b?.sealTop, b?.sealBottom, c?.instagramHeading].some(hasText) ||
    (instagram && hasText(c?.instagramLabel));
  if (
    !brand &&
    !social &&
    !links.length &&
    ![n?.storage, n?.privacy, n?.terms].some(hasText) &&
    !hasText(b?.copyright) &&
    !hasText(b?.previewLabel)
  )
    return null;
  return (
    <footer className="site-footer">
      {brand || links.length || hasText(n?.storage) || social ? (
        <div className="shell footer-grid">
          {brand ? (
            <div>
              {hasText(b?.wordmark) ? (
                <Link href="/" aria-label="Home">
                  <Wordmark
                    value={b.wordmark}
                    className="text-[88px] sm:text-[110px]"
                  />
                </Link>
              ) : null}
              <Text className="eyebrow mt-5" value={b?.tagline} />
              <Text className="mt-4 text-sm opacity-75" value={b?.footerCopy} />
            </div>
          ) : null}
          {links.length || hasText(n?.storage) ? (
            <nav className="footer-nav" aria-label="Footer navigation">
              {links.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
              {hasText(n?.storage) ? (
                <Link href="/storage-heating">{n.storage}</Link>
              ) : null}
            </nav>
          ) : null}
          {social ? (
            <div className="footer-social flex flex-col items-end gap-2 text-right">
              {hasImage(settings.footerImage) ? (
                <div className="relative h-24 w-24">
                  <CmsImage
                    image={settings.footerImage}
                    aspectRatio={1}
                    documentType={settings._type}
                    documentId={settings._id}
                    path="footerImage"
                    sizes="96px"
                  />
                </div>
              ) : (
                <LogoMark settings={settings} />
              )}
              <Text as="h2" value={c?.instagramHeading} />
              {instagram && hasText(c?.instagramLabel) ? (
                <a
                  className="inline-link text-sm"
                  href={instagram}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Camera size={18} aria-hidden="true" />
                  {c.instagramLabel}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {hasText(b?.copyright) ||
      hasText(b?.previewLabel) ||
      hasText(n?.privacy) ||
      hasText(n?.terms) ? (
        <div className="shell footer-bottom">
          {hasText(b?.copyright) ? (
            <p>
              © {new Date().getFullYear()} {b.copyright}
              {hasText(b.domain) ? <> · {b.domain}</> : null}
            </p>
          ) : null}
          <Text className="preview-label" value={b?.previewLabel} />
          {hasText(n?.privacy) || hasText(n?.terms) ? (
            <div className="flex gap-6">
              {hasText(n?.privacy) ? (
                <Link href="/privacy">{n.privacy}</Link>
              ) : null}
              {hasText(n?.terms) ? <Link href="/terms">{n.terms}</Link> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </footer>
  );
}
