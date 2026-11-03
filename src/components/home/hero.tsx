import Image from "next/image";
import { ArrowDownRight, MapPin } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { siteConfig } from "@/data/site-config";

export function Hero() {
  return (
    <section className="shell hero section-pad" aria-label="Welcome to Salted">
      <div>
        <p className="eyebrow hero-eyebrow">
          <span>
            <span className="hero-eyebrow-star" aria-hidden="true">
              {"\u2733\uFE0E"}
            </span>
            <span>{siteConfig.hero.caption}</span>
          </span>
          <span>
            <MapPin size={13} aria-hidden="true" /> {siteConfig.hero.location}
          </span>
        </p>
        <div className="hero-brand">
          <Wordmark className="hero-wordmark" />
          <span className="hero-spark" aria-hidden="true">
            {/* Request text presentation to prevent mobile emoji substitution. */}
            {"\u2733\uFE0E"}
          </span>
        </div>
        <p className="eyebrow hero-tagline">{siteConfig.hero.eyebrow}</p>
        <h1 className="hero-headline">{siteConfig.hero.headline}</h1>
        <p className="hero-description">{siteConfig.hero.description}</p>
        <a className="button-primary hero-cta" href="#products">
          Feed me
          <ArrowDownRight size={18} />
        </a>
      </div>
      <div className="hero-visual min-w-0 self-center">
        <Image
          src={siteConfig.hero.image}
          alt={siteConfig.hero.imageAlt}
          width={1200}
          height={1400}
          preload
          unoptimized
          sizes="(max-width: 767px) 100vw, 45vw"
          className="aspect-[4/3] w-full border border-border bg-muted object-cover"
        />
      </div>
    </section>
  );
}
