import {
  hasProductCardContent,
  hasRecipeCardContent,
} from "@/sanity/lib/card-content";
import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { Hero } from "@/components/home/hero";
import { InstagramSection } from "@/components/home/instagram-section";
import { ProductStorefront } from "@/components/home/product-storefront";
import { ProductCard } from "@/components/commerce/product-card";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { Text } from "@/components/cms/text";
import { hasCopy, hasText } from "@/sanity/lib/content";
import { getGlobalContent } from "@/sanity/lib/data";
import { fetchContent } from "@/sanity/lib/fetch-content";
import { HOME_QUERY } from "@/sanity/lib/queries";
import { mapRecipe } from "@/sanity/lib/mappers";
import { contentMetadata } from "@/sanity/lib/metadata";
import { SectionHeading } from "@/components/content/section-heading";

export async function generateMetadata() {
  return contentMetadata((await fetchContent(HOME_QUERY))?.page?.seo, "/");
}
export default async function HomePage() {
  const [data, { settings, commerce, products }] = await Promise.all([
    fetchContent(HOME_QUERY),
    getGlobalContent(),
  ]);
  const visibleProducts = products.filter(hasProductCardContent);
  const page = data?.page;
  if (!page) return null;
  const how = page.howItWorks;
  const steps = [
    { number: "01", title: how?.stepOneTitle, description: how?.stepOneBody },
    { number: "02", title: how?.stepTwoTitle, description: how?.stepTwoBody },
    {
      number: "03",
      title: how?.stepThreeTitle,
      description: how?.stepThreeBody,
    },
  ].filter((step) => hasText(step.title) || hasText(step.description));
  const recipes =
    page.recipes?.flatMap((recipe) =>
      recipe?.active ? [mapRecipe(recipe)] : [],
    ) ?? [];
  const visibleRecipes = recipes.filter(hasRecipeCardContent);
  const reviews =
    page.reviews?.filter(
      (review) =>
        review?.active &&
        [
          review.heading,
          review.quote,
          review.customerName,
          review.customerDetail,
        ].some(hasText),
    ) ?? [];
  const p = page.productsSection,
    r = page.recipesPreview,
    v = page.reviewsSection;
  return (
    <>
      <Hero page={page} />
      {hasCopy(how) ? (
        <section className="section-pad how-section border-border bg-muted/40">
          <div className="shell">
            <SectionHeading
              eyebrow={how?.eyebrow}
              heading={how?.heading}
              action={
                hasText(how?.cta) ? (
                  <Link className="inline-link" href="/pickup">
                    {how.cta}
                    <ArrowUpRight size={17} />
                  </Link>
                ) : null
              }
            />
            {steps.length ? (
              <ol className="how-grid">
                {steps.map((step) => (
                  <li key={step.number}>
                    <span className="step-number">{step.number}</span>
                    <Text as="h3" value={step.title} />
                    <Text value={step.description} />
                  </li>
                ))}
              </ol>
            ) : null}
            <Text className="draft-note mt-7" value={how?.note} />
          </div>
        </section>
      ) : null}
      {hasCopy(p) || visibleProducts.length ? (
        <section id="products" className="shell section-pad storefront">
          <SectionHeading
            eyebrow={p?.eyebrow}
            heading={p?.heading}
            action={
              hasText(p?.intro) ? (
                <Text
                  className="section-intro whitespace-pre-line"
                  value={p.intro}
                />
              ) : null
            }
          />
          <ProductStorefront
            copy={commerce?.product}
            items={visibleProducts.map((product) => ({
              id: product.id,
              category: product.category,
              content: (
                <ProductCard
                  product={product}
                  copy={commerce?.product}
                  showDetailsLink={false}
                />
              ),
            }))}
          />
          <Text className="menu-note" value={p?.note} />
        </section>
      ) : null}
      {/* {hasCopy(r) || visibleRecipes.length ? (
        <section className="section-pad border-border bg-muted/40">
          <div className="shell">
            <SectionHeading
              eyebrow={r?.eyebrow}
              heading={r?.heading}
              action={
                hasText(r?.cta) ? (
                  <Link href="/recipes" className="inline-link">
                    {r.cta}
                    <ArrowRight size={17} />
                  </Link>
                ) : null
              }
            />
            {visibleRecipes.length ? (
              <div className="recipe-grid">
                {visibleRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    copy={commerce?.recipe}
                  />
                ))}
              </div>
            ) : null}
            <Text className="draft-note mt-7" value={r?.note} />
            {hasText(r?.orderCta) ? (
              <div className="mt-16 flex justify-center">
                <a className="button-primary" href="#products">
                  {r.orderCta}
                  <ArrowUpRight size={18} aria-hidden="true" />
                </a>
              </div>
            ) : null}
          </div>
        </section>
      ) : null} */}
      {hasCopy(v) || reviews.length ? (
        <section className="section-pad reviews-section bg-muted/40">
          <div className="shell">
          <SectionHeading
            eyebrow={v?.eyebrow}
            heading={v?.heading}
            action={
              hasText(v?.badge) ? (
                <Text as="span" className="draft-pill" value={v.badge} />
              ) : null
            }
          />
          {reviews.length ? (
            <div className="reviews-grid">
              {reviews.map((review) =>
                review ? (
                  <figure key={review._id}>
                    <Text as="h3" value={review.heading} />
                    {hasText(review.quote) ? (
                      <>
                        <span className="quote-mark" aria-hidden="true">
                          “
                        </span>
                        <blockquote>{review.quote}</blockquote>
                      </>
                    ) : null}
                    {hasText(review.customerName) ||
                    hasText(review.customerDetail) ? (
                      <figcaption>
                        <Text as="span" value={review.customerName} />
                        <Text as="span" value={review.customerDetail} />
                      </figcaption>
                    ) : null}
                  </figure>
                ) : null,
              )}
            </div>
          ) : null}
          {hasText(v?.orderCta) ? (
            <div className="mt-16 flex justify-center">
              <a className="button-primary" href="#products">
                {v.orderCta}
                <ArrowUpRight size={18} />
              </a>
            </div>
          ) : null}
          </div>
        </section>
      ) : null}
      <InstagramSection page={page} settings={settings} />
    </>
  );
}
