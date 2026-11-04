import { ArrowUpRight, Camera } from "lucide-react";
import { HeroProductCarousel } from "@/components/home/hero-product-carousel";
import { CmsImage } from "@/components/cms/image";
import { Text } from "@/components/cms/text";
import { clean, hasImage, hasText, safeUrl } from "@/sanity/lib/content";
import type { Homepage, SiteSettings } from "../../../sanity.types";
export function InstagramSection({
  page,
  settings,
}: {
  page: Homepage;
  settings: SiteSettings | null;
}) {
  const copy = page.instagramSection,
    contact = settings?.contact;
  const url = safeUrl(contact?.instagramUrl);
  const photos =
    page.instagramPhotos?.filter((photo) => hasImage(photo.image)) ?? [];
  const hasLink = url && hasText(contact?.instagramLabel);
  const textColumn =
    [copy?.eyebrow, copy?.heading, copy?.description].some(hasText) || hasLink;
  if (!textColumn && !photos.length) return null;
  return (
    <section
      id="instagram"
      aria-labelledby={hasText(copy?.heading) ? "instagram-heading" : undefined}
      className="border-t border-border bg-muted/40"
    >
      <div
        className={`shell section-pad grid items-center gap-10 md:grid-cols-[0.85fr_1fr] md:gap-16 lg:gap-24 ${!textColumn || !photos.length ? "cms-single-column" : ""}`}
      >
        {textColumn ? (
          <div className="flex flex-col items-start gap-6">
            <Text className="eyebrow text-primary" value={copy?.eyebrow} />
            <Text
              as="h2"
              id="instagram-heading"
              className="whitespace-pre-line font-heading text-[clamp(48px,5.5vw,78px)] leading-[1.02] font-semibold"
              value={copy?.heading}
            />
            <Text
              className="max-w-80 text-base leading-relaxed text-muted-foreground"
              value={copy?.description}
            />
            {hasLink ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-link text-primary"
              >
                <Camera size={18} aria-hidden="true" />
                {contact?.instagramLabel}
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
            ) : null}
          </div>
        ) : null}
        {photos.length ? (
          <div className="min-w-0 sm:px-6 md:px-12 xl:px-24">
            <HeroProductCarousel
              label="Instagram photos"
              itemLabel="Instagram photo"
              showPlaybackControl
              playLabel={copy?.play}
              pauseLabel={copy?.pause}
              items={photos.map((photo, index) => {
                const permalink = safeUrl(photo.permalink);
                const content = (
                  <>
                    <CmsImage
                      image={photo.image}
                      aspectRatio={1}
                      documentType={page._type}
                      documentId={page._id}
                      path={`instagramPhotos[_key=="${photo._key}"].image`}
                      sizes="(max-width: 767px) calc(100vw - 44px), (max-width: 1439px) 50vw, 620px"
                      className="transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transition-none"
                    />
                    {permalink && hasText(copy?.postLabel) ? (
                      <span className="absolute right-4 bottom-4 flex min-h-11 items-center gap-3 bg-background px-4 font-heading text-sm tracking-wide text-foreground">
                        {copy.postLabel}
                        <ArrowUpRight size={16} aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                );
                const className =
                  "group relative block aspect-square overflow-hidden bg-muted focus-visible:outline-offset-[-6px]";
                return {
                  id: photo._key,
                  name:
                    clean(photo.image?.alt) || `Instagram photo ${index + 1}`,
                  content: permalink ? (
                    <a
                      href={permalink}
                      target="_blank"
                      rel="noreferrer"
                      className={className}
                      aria-label={`${clean(photo.image?.alt)}. View original post on Instagram (opens in a new tab)`}
                    >
                      {content}
                    </a>
                  ) : (
                    <div className={className}>{content}</div>
                  ),
                };
              })}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
