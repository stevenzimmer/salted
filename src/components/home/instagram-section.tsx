import Image from "next/image";
import { ArrowUpRight, Camera } from "lucide-react";
import { HeroProductCarousel } from "@/components/home/hero-product-carousel";
import { instagramContent, instagramPhotos } from "@/data/instagram";
import { siteConfig } from "@/data/site-config";

export function InstagramSection() {
  return (
    <section
      id="instagram"
      aria-labelledby="instagram-heading"
      className="border-t border-border bg-muted/40"
    >
      <div className="shell section-pad grid items-center gap-10 md:grid-cols-[0.85fr_1fr] md:gap-16 lg:gap-24">
        <div className="flex flex-col items-start gap-6">
          <p className="eyebrow text-primary">{instagramContent.eyebrow}</p>
          <h2
            id="instagram-heading"
            className="whitespace-pre-line font-heading text-[clamp(48px,5.5vw,78px)] leading-[1.02] font-semibold"
          >
            {instagramContent.heading}
          </h2>
          <p className="max-w-80 text-base leading-relaxed text-muted-foreground">
            {instagramContent.description}
          </p>
          <a
            href={siteConfig.instagram.url}
            target="_blank"
            rel="noreferrer"
            className="inline-link text-primary"
            aria-label={`Follow ${siteConfig.instagram.label} on Instagram (opens in a new tab)`}
          >
            <Camera size={18} aria-hidden="true" />
            {siteConfig.instagram.label}
            <ArrowUpRight size={18} aria-hidden="true" />
          </a>
        </div>
        <div className="min-w-0">
          <HeroProductCarousel
            label={`Photos from ${siteConfig.instagram.label} on Instagram`}
            itemLabel="Instagram photo"
            showPlaybackControl
            items={instagramPhotos.map((photo, index) => ({
              id: photo.id,
              name: `Instagram photo ${index + 1}`,
              content: (
                <a
                  href={photo.permalink}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative block aspect-square overflow-hidden bg-muted focus-visible:outline-offset-[-6px]"
                  aria-label={`${photo.alt}. View original post on Instagram (opens in a new tab)`}
                >
                  <Image
                    src={photo.image}
                    alt={photo.alt}
                    fill
                    sizes="(max-width: 767px) calc(100vw - 44px), (max-width: 1439px) 50vw, 620px"
                    className="transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transition-none"
                  />
                  <span className="absolute right-4 bottom-4 flex min-h-11 items-center gap-3 bg-background px-4 font-heading text-sm tracking-wide text-foreground">
                    View post <ArrowUpRight size={16} aria-hidden="true" />
                  </span>
                </a>
              ),
            }))}
          />
        </div>
      </div>
    </section>
  );
}
