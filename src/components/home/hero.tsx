import Link from "next/link";
import { ArrowDownRight, MapPin } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { ProductCard } from "@/components/commerce/product-card";
import { HeroProductCarousel } from "@/components/home/hero-product-carousel";
import { products } from "@/data/products";
import { siteConfig } from "@/data/site-config";

export function Hero() {
  return (
    <section className="shell hero" aria-label="Welcome to Salted">
      <div>
        <p className="eyebrow hero-eyebrow">
          <span>
            <span className="hero-eyebrow-star" aria-hidden="true">
              ✳
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
        <Link className="button-primary hero-cta" href="#products">
          Feed me
          <ArrowDownRight size={18} />
        </Link>
      </div>
      <div className="hero-visual min-w-0 self-center">
        <HeroProductCarousel
          items={products
            .filter((product) => product.active)
            .map((product, index) => ({
              id: product.id,
              name: product.name,
              content: (
                <ProductCard
                  product={product}
                  variant="preview"
                  preload={index === 0}
                />
              ),
            }))}
        />
        <div
          className="hero-sticker pointer-events-none"
          aria-label="Made for sharing, or not"
        >
          <span>made for</span>
          <span className="sticker-script">sharing</span>
          <span>(or not.)</span>
        </div>
      </div>
    </section>
  );
}
