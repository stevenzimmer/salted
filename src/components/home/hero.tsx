import { ArrowDownRight, MapPin } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { CmsImage } from "@/components/cms/image";
import { Text } from "@/components/cms/text";
import { hasCopy, hasImage, hasText } from "@/sanity/lib/content";
import type { Homepage, SiteSettings } from "../../../sanity.types";

export function Hero({
  page,
  settings,
}: {
  page: Homepage;
  settings: SiteSettings | null;
}) {
  const hero = page.hero;
  const hasBrand = hasText(settings?.brand?.wordmark);
  const hasColumn = hasCopy(hero) || hasBrand;
  if (!hasColumn && !hasImage(page.heroImage)) return null;
  return (
    <section
      className={`shell hero section-pad ${!hasColumn || !hasImage(page.heroImage) ? "cms-single-column" : ""}`}
      aria-label="Welcome"
    >
      {hasColumn ? (
        <div>
          {hasText(hero?.caption) || hasText(hero?.location) ? (
            <p className="eyebrow hero-eyebrow">
              {hasText(hero?.caption) ? (
                <span>
                  <span className="hero-eyebrow-star" aria-hidden="true">
                    {"\u2733\uFE0E"}
                  </span>
                  <span>{hero.caption}</span>
                </span>
              ) : null}
              {hasText(hero?.location) ? (
                <span>
                  <MapPin size={13} aria-hidden="true" />
                  {hero.location}
                </span>
              ) : null}
            </p>
          ) : null}
          {hasBrand ? (
            <div className="hero-brand">
              <Wordmark
                value={settings?.brand?.wordmark}
                className="hero-wordmark"
              />
              <svg
                className="hero-spark"
                viewBox="0 0 40 48"
                fill="currentColor"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M20 0C23.5 14 27 18.5 40 24C27 29.5 23.5 34 20 48C16.5 34 13 29.5 0 24C13 18.5 16.5 14 20 0Z" />
              </svg>
            </div>
          ) : null}
          <Text className="eyebrow hero-tagline" value={hero?.eyebrow} />
          <Text as="h1" className="hero-headline" value={hero?.headline} />
          <Text className="hero-description" value={hero?.description} />
          {hasText(hero?.cta) ? (
            <a className="button-primary hero-cta" href="#products">
              {hero.cta}
              <ArrowDownRight size={18} aria-hidden="true" />
            </a>
          ) : null}
        </div>
      ) : null}
      {hasImage(page.heroImage) ? (
        <div className="hero-visual min-w-0 self-center">
          <CmsImage
            image={page.heroImage}
            aspectRatio={4 / 3}
            documentType={page._type}
            documentId={page._id}
            path="heroImage"
            fill={false}
            preload
            sizes="(max-width: 767px) 100vw, 45vw"
            className="aspect-[4/3] w-full border border-border bg-muted object-cover"
          />
        </div>
      ) : null}
    </section>
  );
}
