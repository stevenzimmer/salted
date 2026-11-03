import { hasRecipeCardContent } from "@/sanity/lib/card-content";
import { hasCopy } from "@/sanity/lib/content";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { PageIntro } from "@/components/content/page-intro";
import { Text } from "@/components/cms/text";
import { fetchContent } from "@/sanity/lib/fetch-content";
import { RECIPES_QUERY, RECIPES_PAGE_QUERY } from "@/sanity/lib/queries";
import { contentMetadata } from "@/sanity/lib/metadata";
import { mapRecipe } from "@/sanity/lib/mappers";
import { getGlobalContent } from "@/sanity/lib/data";
export async function generateMetadata() {
  return contentMetadata(
    (await fetchContent(RECIPES_PAGE_QUERY))?.seo,
    "/recipes",
  );
}
export default async function RecipesPage() {
  const [page, recipes, { commerce }] = await Promise.all([
    fetchContent(RECIPES_PAGE_QUERY),
    fetchContent(RECIPES_QUERY),
    getGlobalContent(),
  ]);
  const items = recipes?.map(mapRecipe).filter(hasRecipeCardContent) ?? [];
  if (!hasCopy(page?.intro) && !hasCopy(page?.listing) && !items.length)
    return null;
  return (
    <div className="shell pb-24">
      <PageIntro {...page?.intro} />
      {items.length ? (
        <div className="recipe-grid">
          {items.map((recipe) => (
            <RecipeCard
              recipe={recipe}
              key={recipe.id}
              copy={commerce?.recipe}
            />
          ))}
        </div>
      ) : (
        <Text value={page?.listing?.empty} />
      )}
      <Text className="draft-note mt-8" value={page?.listing?.note} />
    </div>
  );
}
