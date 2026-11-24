import { hasProductCardContent } from "@/sanity/lib/card-content";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductCard } from "@/components/commerce/product-card";
import { PageIntro } from "@/components/content/page-intro";
import { SectionHeading } from "@/components/content/section-heading";
import { Text } from "@/components/cms/text";
import { CmsImage } from "@/components/cms/image";
import { RichText } from "@/components/cms/rich-text";
import { fetchContent } from "@/sanity/lib/fetch-content";
import { RECIPE_QUERY } from "@/sanity/lib/queries";
import { getGlobalContent } from "@/sanity/lib/data";
import { mapRecipe } from "@/sanity/lib/mappers";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  getFixedSearchPage,
  getSearchRecipe,
  getSearchSettings,
  isSearchDraft,
} from "@/lib/seo/content";
import { searchableRecipe } from "@/lib/seo/eligibility";
import { searchText } from "@/lib/seo/fields";
import { detailPath, noIndex } from "@/lib/seo/policy";
import { pageEntities, recipeEntity } from "@/lib/seo/structured-data";
import { SearchStructuredData } from "@/components/cms/search-structured-data";
import { hasImage, hasText } from "@/sanity/lib/content";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const [doc] = await Promise.all([getSearchRecipe(slug), getSearchSettings()]);
  if (!doc) return { robots: noIndex };
  const title = searchText(doc.displayTitle) ?? "Focaccia Recipe";
  return pageMetadata({
    path: detailPath("recipes", slug),
    eligible: searchableRecipe(doc),
    seo: doc.seo,
    title,
    description: doc.description,
    fallbackDescription: `Read ${title}, a serving idea from Salted Focaccia.`,
    image: doc.image,
    article: true,
  });
}

async function RecipeStructuredData({ slug }: { slug: string }) {
  const [draft, doc, settings, listing] = await Promise.all([
    isSearchDraft(),
    getSearchRecipe(slug),
    getSearchSettings(),
    getFixedSearchPage("/recipes"),
  ]);
  if (
    draft ||
    !doc ||
    !searchableRecipe(doc) ||
    settings?.seo?.noIndex === true
  )
    return null;
  const path = detailPath("recipes", slug);
  const recipe = recipeEntity(path, mapRecipe(doc));
  const name = searchText(doc.displayTitle);
  if (!name) return null;
  return (
    <SearchStructuredData
      nodes={[
        ...pageEntities(
          path,
          name,
          "WebPage",
          recipe ? { "@id": recipe["@id"] } : undefined,
          listing.eligible,
        ),
        ...(recipe ? [recipe] : []),
      ]}
    />
  );
}

export default async function RecipePage({ params }: Props) {
  const { slug } = await params;
  const [doc, { products, commerce }] = await Promise.all([
    fetchContent(RECIPE_QUERY, { slug }),
    getGlobalContent(),
  ]);
  if (!doc) notFound();
  const recipe = mapRecipe(doc),
    c = commerce?.recipe;
  const related = products.filter(
    (product) =>
      recipe.relatedProductIds.includes(product._id) &&
      hasProductCardContent(product),
  );
  const groups =
    recipe.ingredientGroups
      ?.map((group) => ({
        ...group,
        ingredients: group.ingredients?.filter(hasText) ?? [],
      }))
      .filter((group) => hasText(group.heading) || group.ingredients.length) ??
    [];
  const steps =
    recipe.steps?.filter(
      (step) => hasText(step.heading) || hasText(step.body),
    ) ?? [];
  const meta = [
    { label: c?.prep, value: recipe.prepMinutes },
    { label: c?.cook, value: recipe.cookMinutes },
    { label: c?.total, value: recipe.totalMinutes },
  ].filter((item) => item.value !== undefined);
  return (
    <article className="shell">
      <RecipeStructuredData slug={slug} />
      {hasText(c?.allRecipes) ? (
        <Link className="back-link" href="/recipes">
          <ArrowLeft size={15} aria-hidden="true" />
          {c.allRecipes}
        </Link>
      ) : null}
      <PageIntro
        eyebrow={[...recipe.tags, recipe.recipeCategory, recipe.recipeCuisine]
          .filter(hasText)
          .join(" · ")}
        title={recipe.title}
        description={recipe.description}
      />
      <Text className="text-sm text-muted-foreground" value={recipe.author} />
      {hasImage(recipe.image) ? (
        <div className="recipe-hero-image">
          <CmsImage
            image={recipe.image}
            aspectRatio={2}
            documentType={recipe._type}
            documentId={recipe._id}
            path="image"
            preload
          />
          <Text
            as="span"
            className="photo-label"
            value={recipe.image?.caption}
          />
        </div>
      ) : null}
      <RichText value={recipe.introduction} />
      {meta.length || hasText(recipe.servings) ? (
        <div className="recipe-meta">
          {meta.map((item, i) => (
            <span key={i}>
              <Text as="span" value={item.label} />
              <strong>
                {item.value} <Text as="span" value={c?.minutes} />
              </strong>
            </span>
          ))}
          {hasText(recipe.servings) ? (
            <span>
              <Text as="span" value={c?.serves} />
              <strong>{recipe.servings}</strong>
            </span>
          ) : null}
        </div>
      ) : null}
      <Text className="draft-note mt-5" value={c?.note} />
      {groups.length || steps.length ? (
        <div
          className={`recipe-instructions ${!groups.length || !steps.length ? "cms-single-column" : ""}`}
        >
          {groups.length ? (
            <section>
              <Text className="eyebrow" value={c?.ingredientsEyebrow} />
              <Text as="h2" value={c?.ingredientsHeading} />
              {groups.map((group) => (
                <div key={group._key}>
                  <Text as="h3" value={group.heading} />
                  {group.ingredients.length ? (
                    <ul className="ingredient-list">
                      {group.ingredients.map((ingredient, i) => (
                        <li key={i}>{ingredient}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </section>
          ) : null}
          {steps.length ? (
            <section>
              <Text className="eyebrow" value={c?.instructionsEyebrow} />
              <Text as="h2" value={c?.instructionsHeading} />
              <ol className="instruction-list">
                {steps.map((step, i) => (
                  <li key={step._key}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <Text as="h3" value={step.heading} />
                      <Text value={step.body} />
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      ) : null}
      <RichText value={recipe.notes} />
      {related.length ? (
        <section className="section-pad border-t border-border">
          <SectionHeading
            eyebrow={c?.relatedEyebrow}
            heading={c?.relatedHeading}
          />
          <div className="related-product-grid">
            {related.map((product) => (
              <ProductCard
                product={product}
                key={product.id}
                copy={commerce?.product}
              />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
