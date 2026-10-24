import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, ArrowRight, Camera } from "lucide-react";
import { Hero } from "@/components/home/hero";
import { ProductStorefront } from "@/components/home/product-storefront";
import { ProductCard } from "@/components/commerce/product-card";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { LogoMark } from "@/components/brand/logo-mark";
import { products } from "@/data/products";
import { recipes } from "@/data/recipes";
import { reviews } from "@/data/reviews";
import { siteConfig } from "@/data/site-config";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function HomePage() {
  return (
    <>
      <Hero />
      <div className="bread-strip" aria-hidden="true">
        <span>SLOW DOUGH</span>
        <span>✳</span>
        <span>CRISPY EDGES</span>
        <span>✳</span>
        <span>SOFT MIDDLES</span>
        <span>✳</span>
        <span>VERY GOOD BREAD</span>
        <span>✳</span>
      </div>
      <section id="products" className="shell section-pad storefront">
        <div className="section-heading">
          <div>
            <p className="eyebrow">The weekly bread edit</p>
            <h2>
              This week’s
              <br className="sm:hidden" /> good stuff.
            </h2>
          </div>
          <p className="section-intro">
            For your table. For your people.
            <br />
            For the drive home. We get it.
          </p>
        </div>
        <ProductStorefront
          items={products
            .filter((product) => product.active)
            .map((product) => ({
              id: product.id,
              category: product.category,
              content: <ProductCard product={product} />,
            }))}
        />
        <p className="menu-note">
          A preview of what’s baking. Final ingredients and allergen information
          are awaiting bakery approval.
        </p>
      </section>
      <section className="seasonal-section">
        <div className="shell seasonal-grid">
          <div className="seasonal-art">
            <span className="seasonal-asterisk" aria-hidden="true">
              ✳
            </span>
            <p>
              Something
              <br />
              <em>good</em>
              <br />
              is coming.
            </p>
            <span className="eyebrow">The next seasonal chapter</span>
          </div>
          <div className="seasonal-copy">
            <p className="eyebrow">{siteConfig.seasonal.eyebrow}</p>
            <h2>{siteConfig.seasonal.title}</h2>
            <p className="editorial-copy">{siteConfig.seasonal.description}</p>
            <Link className="inline-link" href="/products/seasonal-flavor">
              Meet the seasonal flavor <ArrowUpRight size={18} />
            </Link>
            <p className="draft-note">{siteConfig.seasonal.note}</p>
          </div>
        </div>
      </section>
      <section className="shell section-pad how-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Good bread. Easy plans.</p>
            <h2>Your Friday, sorted.</h2>
          </div>
          <Link className="inline-link" href="/pickup">
            The pickup details <ArrowUpRight size={17} />
          </Link>
        </div>
        <ol className="how-grid">
          {siteConfig.howItWorks.map((step) => (
            <li key={step.number}>
              <span className="step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
        <p className="draft-note mt-7">
          You’re exploring our preview. Online payment will be available in a
          future phase.
        </p>
      </section>
      <section className="about-section">
        <div className="shell about-grid">
          <div className="about-image">
            <Image
              src="https://placehold.co/1000x1100/D8C6AF/594735/png?text=flour.%0Awater.%0Aa+little%0Alove.&font=lora"
              alt="Placeholder for a future behind-the-scenes bakery photograph"
              fill
              unoptimized
              sizes="(max-width: 767px) 100vw, 45vw"
            />
            <span className="photo-label">
              A little look behind the dough · coming soon
            </span>
          </div>
          <div className="about-copy">
            <p className="eyebrow">A little about salted</p>
            <h2>{siteConfig.about.heading}</h2>
            <p className="editorial-copy">{siteConfig.about.description}</p>
            <Link className="inline-link" href="/about">
              Pull up a chair <ArrowUpRight size={18} />
            </Link>
            <p className="draft-note">{siteConfig.about.status}</p>
          </div>
        </div>
      </section>
      <section className="shell section-pad reviews-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Word around the table</p>
            <h2>We’ll let the bread talk.</h2>
          </div>
          <span className="draft-pill">Sample testimonials</span>
        </div>
        <div className="reviews-grid">
          {reviews.map((review) => (
            <figure key={review.id}>
              <span className="quote-mark" aria-hidden="true">
                “
              </span>
              <blockquote>{review.quote}</blockquote>
              <figcaption>
                — {review.attribution}
                <span>Illustrative review · not a real customer quote</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
      <section className="storage-callout">
        <div className="shell flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <p className="eyebrow">A word to the bread-wise</p>
            <h2>Don’t ruin good focaccia.</h2>
            <p>Keep the crispy edges. Keep the good thing going.</p>
          </div>
          <Link className="button-outline" href="/storage-heating">
            Storage + reheating <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <section className="shell section-pad">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Beyond the bread basket</p>
            <h2>A little table inspiration.</h2>
          </div>
          <Link href="/recipes" className="inline-link">
            All recipes <ArrowRight size={17} />
          </Link>
        </div>
        <div className="recipe-grid">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
        <p className="draft-note mt-7">
          Draft recipe inspiration · final recipes are awaiting bakery approval.
        </p>
      </section>
      <section className="instagram-section">
        <div className="shell instagram-inner">
          <LogoMark />
          <div>
            <p className="eyebrow">Fresh from the oven. And the feed.</p>
            <h2>Let’s break bread.</h2>
          </div>
          <a
            className="inline-link"
            href={siteConfig.instagram.url}
            target="_blank"
            rel="noreferrer"
          >
            <Camera size={18} />
            {siteConfig.instagram.label}
            <ArrowUpRight size={17} />
          </a>
        </div>
      </section>
    </>
  );
}
