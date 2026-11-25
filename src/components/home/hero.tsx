import { ArrowDownRight, MapPin } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { Spark } from "@/components/brand/spark";
import { CmsImage } from "@/components/cms/image";
import { Text } from "@/components/cms/text";
import { HeroProductCarousel } from "@/components/home/hero-product-carousel";
import { clean, hasCopy, hasImage, hasText } from "@/sanity/lib/content";
import type { Homepage } from "../../../sanity.types";

export function Hero({ page }: { page: Homepage }) {
  const hero = page.hero;
  const hasColumn = hasCopy(hero);
  const photos = [
    ...(hasImage(page.heroImage)
      ? [{ path: "heroImage", image: page.heroImage }]
      : []),
    ...(page.heroPhotos ?? []).filter(hasImage).map((image) => ({
      path: `heroPhotos[_key==${JSON.stringify(image._key)}]`,
      image,
    })),
  ];
  const slides = photos.map(({ image, path }, index) => ({
    id: path,
    name: image.decorative ? `Photo ${index + 1}` : clean(image.alt),
    content: (
      <figure>
        <CmsImage
          image={image}
          aspectRatio={4 / 3}
          documentType={page._type}
          documentId={page._id}
          path={path}
          fill={false}
          preload={index === 0}
          sizes="(max-width: 767px) calc(100vw - 44px), (max-width: 1199px) calc(50vw - 36px), min(calc(50vw - 52px), 660px)"
          className="aspect-4/3 w-full border border-border bg-muted object-cover"
        />
        <Text
          as="figcaption"
          value={image.caption}
          className="mt-2 px-2 text-center text-sm text-pretty wrap-anywhere text-muted-foreground italic"
        />
      </figure>
    ),
  }));
  if (!hasColumn && !slides.length) return null;
  return (
    <section
      className={`shell hero section-pad ${!hasColumn || !slides.length ? "cms-single-column" : ""}`}
      aria-label="Welcome"
    >
      {hasColumn ? (
        <div className="pt-6 lg:pt-12">
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

          <h1 className="hero-brand" aria-label="Salted Focaccia">
            <Wordmark className="hero-wordmark" />
          </h1>
          <Text className="eyebrow hero-tagline" value={hero?.eyebrow} />
          {hasText(hero?.cta) ? (
            <a className="button-primary hero-cta" href="#products">
              {hero.cta}
              <ArrowDownRight size={18} aria-hidden="true" />
            </a>
          ) : null}
        </div>
      ) : null}
      {slides.length > 0 ? (
        <div className="hero-visual min-w-0 self-center">
          {slides.length === 1 ? (
            slides[0].content
          ) : (
            <HeroProductCarousel
              items={slides}
              label="Bakery photos"
              itemLabel="photo"
              autoAdvance={false}
            />
          )}
        </div>
      ) : null}
    </section>
  );
}
