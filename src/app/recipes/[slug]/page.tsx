import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { recipes, getRecipeBySlug } from "@/data/recipes";
import { products } from "@/data/products";
import { ProductCard } from "@/components/commerce/product-card";
import { PageIntro } from "@/components/content/page-intro";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() {
  return recipes.map((recipe) => ({ slug: recipe.slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const recipe = getRecipeBySlug((await params).slug);
  return {
    title: recipe?.title ?? "Recipe not found",
    description: recipe?.description,
    alternates: { canonical: `/recipes/${recipe?.slug ?? ""}` },
  };
}

export default async function RecipePage({ params }: Props) {
  const recipe = getRecipeBySlug((await params).slug);
  if (!recipe) notFound();
  const relatedProducts = products.filter((product) =>
    recipe.relatedProductIds.includes(product.id),
  );
  return (
    <article className="shell">
      <Link className="back-link" href="/recipes">
        <ArrowLeft size={15} /> All recipes
      </Link>
      <PageIntro
        eyebrow={recipe.tags.join(" · ")}
        title={recipe.title}
        description={recipe.description}
      />
      <div className="recipe-hero-image">
        <Image
          src={recipe.image}
          alt={recipe.imageAlt}
          fill
          unoptimized
          priority
          sizes="100vw"
        />
      </div>
      <div className="recipe-meta">
        <span>
          Prep <strong>{recipe.prepMinutes} min</strong>
        </span>
        <span>
          Cook <strong>{recipe.cookMinutes} min</strong>
        </span>
        <span>
          Total <strong>{recipe.totalMinutes} min</strong>
        </span>
        <span>
          Serves <strong>{recipe.servings}</strong>
        </span>
      </div>
      <p className="draft-note mt-5">
        Draft recipe · illustrative content awaiting bakery approval.
      </p>
      <div className="recipe-instructions">
        <section>
          <p className="eyebrow">On the counter</p>
          <h2>What you’ll need.</h2>
          <ul className="ingredient-list">
            {recipe.ingredients.map((ingredient) => (
              <li key={ingredient}>{ingredient}</li>
            ))}
          </ul>
        </section>
        <section>
          <p className="eyebrow">Make something good</p>
          <h2>Bring it together.</h2>
          <ol className="instruction-list">
            {recipe.instructions.map((instruction, index) => (
              <li key={instruction}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{instruction}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <section className="section-pad border-t border-border">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Start with the good stuff</p>
            <h2>Made even better with.</h2>
          </div>
        </div>
        <div className="related-product-grid">
          {relatedProducts.map((product) => (
            <ProductCard product={product} key={product.id} />
          ))}
        </div>
      </section>
    </article>
  );
}
