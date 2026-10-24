import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { products, getProductBySlug } from "@/data/products";
import { recipes } from "@/data/recipes";
import { ProductPurchase } from "@/components/commerce/product-purchase";
import { ProductCard } from "@/components/commerce/product-card";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { money } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = getProductBySlug((await params).slug);
  return {
    title: product?.name ?? "Product not found",
    description: product?.shortDescription,
    alternates: { canonical: `/products/${product?.slug ?? ""}` },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = getProductBySlug((await params).slug);
  if (!product) notFound();
  const relatedRecipes = recipes.filter((recipe) =>
    product.relatedRecipeIds.includes(recipe.id),
  );
  const relatedProducts = products
    .filter(
      (other) => other.id !== product.id && other.category === product.category,
    )
    .slice(0, 3);
  return (
    <div className="shell">
      <Link href="/#products" className="back-link">
        <ArrowLeft size={15} /> Back to the good stuff
      </Link>
      <article className="product-detail-grid">
        <div className="product-detail-image">
          <Image
            src={product.image}
            alt={product.imageAlt}
            fill
            unoptimized
            priority
            sizes="(max-width: 767px) 100vw, 50vw"
          />
          <span className="photo-label">Product photography coming soon</span>
        </div>
        <div className="product-detail-copy">
          <p className="eyebrow">
            {product.tier} {product.category}{" "}
            {product.badge ? `· ${product.badge}` : ""}
          </p>
          <h1>{product.name}</h1>
          <p className="detail-price">
            {product.variants.length > 1 ? "From " : ""}
            {money(product.variants[0].price)}
          </p>
          <p className="text-lg leading-relaxed">{product.shortDescription}</p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
          <ProductPurchase product={product} detailed />
          <div className="product-information">
            <details>
              <summary>Ingredients + allergens</summary>
              <div className="detail-content">
                <p className="draft-pill mb-3">Draft · approval required</p>
                <h2>Ingredients</h2>
                <ul>
                  {product.ingredients.map((ingredient) => (
                    <li key={ingredient}>{ingredient}</li>
                  ))}
                </ul>
                <h2>Allergens</h2>
                <ul>
                  {product.allergens.map((allergen) => (
                    <li key={allergen}>{allergen}</li>
                  ))}
                </ul>
                {product.dietaryLabels.length ? (
                  <p>{product.dietaryLabels.join(" · ")}</p>
                ) : (
                  <p className="mt-3">
                    Dietary classifications have not yet been confirmed.
                  </p>
                )}
              </div>
            </details>
            <details>
              <summary>Keeping it good</summary>
              <div className="detail-content">
                <p>
                  Storage and reheating instructions are awaiting bakery
                  approval. No final temperatures or storage periods are
                  published in this preview.
                </p>
                <Link href="/storage-heating" className="inline-link mt-4">
                  Storage + reheating guide
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            </details>
            <details>
              <summary>Friday pickup</summary>
              <div className="detail-content">
                <p>
                  Pick up in Rocklin, California on an available Friday, 2–6 pm.
                  Choose one pickup date for your whole bag during checkout.
                </p>
                <Link href="/pickup" className="inline-link mt-4">
                  Pickup details
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            </details>
          </div>
        </div>
      </article>
      {relatedRecipes.length ? (
        <section className="section-pad">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Good company for your bread</p>
              <h2>Try it with.</h2>
            </div>
          </div>
          <div className="recipe-grid">
            {relatedRecipes.map((recipe) => (
              <RecipeCard recipe={recipe} key={recipe.id} />
            ))}
          </div>
        </section>
      ) : null}
      {relatedProducts.length ? (
        <section className="section-pad border-t border-border">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Room for one more?</p>
              <h2>Also very good.</h2>
            </div>
          </div>
          <div className="related-product-grid">
            {relatedProducts.map((other) => (
              <ProductCard product={other} key={other.id} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
