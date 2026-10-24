import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { siteConfig } from "@/data/site-config";

export function Hero() {
  return (
    <section className="shell hero" aria-label="Welcome to Salted">
      <div className="hero-copy">
        <div className="hero-brand">
          <Wordmark className="hero-wordmark" />
          <span className="hero-spark" aria-hidden="true">
            ✳
          </span>
        </div>
        <p className="eyebrow hero-tagline">{siteConfig.hero.eyebrow}</p>
        <h1 className="hero-headline">{siteConfig.hero.headline}</h1>
        <p className="hero-description">{siteConfig.hero.description}</p>
        <Link className="button-primary hero-cta" href="#products">
          Order the good stuff
          <ArrowUpRight size={18} />
        </Link>
        <p className="hero-footnote">
          <span className="small-star" aria-hidden="true">
            ✳
          </span>{" "}
          A small bakery. A very good Friday.
        </p>
      </div>
      <div className="hero-visual">
        <div className="hero-image">
          <Image
            src={siteConfig.hero.image}
            alt={siteConfig.hero.imageAlt}
            fill
            unoptimized
            priority
            sizes="(max-width: 767px) 100vw, 45vw"
          />
          <span className="hero-image-note">
            Fresh photography is on its way.
          </span>
        </div>
        <div className="hero-image-caption">
          <span>Slow dough. Happy people.</span>
          <span>
            Rocklin, CA <ArrowDown size={13} />
          </span>
        </div>
        <div className="hero-sticker" aria-label="Made for sharing, or not">
          <span>MADE FOR</span>
          <span className="sticker-script">sharing</span>
          <span>(OR NOT.)</span>
        </div>
      </div>
    </section>
  );
}
