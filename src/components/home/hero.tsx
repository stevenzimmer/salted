import { ArrowDownRight, MapPin } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { Spark } from "@/components/brand/spark";
import { CmsImage } from "@/components/cms/image";
import { Text } from "@/components/cms/text";
import { hasCopy, hasImage, hasText } from "@/sanity/lib/content";
import type { Homepage } from "../../../sanity.types";

export function Hero({ page }: { page: Homepage }) {
  const hero = page.hero;
  const hasColumn = hasCopy(hero);
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
                  <Spark className="hero-eyebrow-spark" />
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

          <div className="hero-brand">
            <Wordmark className="hero-wordmark" />
          </div>
          <Text className="eyebrow hero-tagline" value={hero?.eyebrow} />
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
