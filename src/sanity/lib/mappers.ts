import type { StegaBranded } from "@sanity/client/stega";
import type {
  Product as SanityProduct,
  Recipe as SanityRecipe,
} from "../../../sanity.types";
import type { Product, Recipe } from "@/types/content";
import { clean, hasText } from "./content";

// Adapt the generated CMS shape to existing commerce props. Editorial strings
// retain source maps. IDs, slugs, enums and URLs are always cleaned at boundaries.
export function mapProduct(
  doc: SanityProduct | StegaBranded<SanityProduct>,
): Product | null {
  const id = clean(doc.id);
  const slug = clean(doc.slug?.current);
  const category = clean(doc.category);
  const tier = clean(doc.tier);
  if (
    !id ||
    !slug ||
    !["focaccia", "sourdough"].includes(category) ||
    !["classic", "specialty"].includes(tier)
  )
    return null;
  return {
    ...doc,
    id,
    slug,
    category: category as Product["category"],
    tier: tier as Product["tier"],
    name: doc.displayName ?? "",
    shortDescription: doc.shortDescription ?? "",
    description: doc.description ?? "",
    ingredients: doc.ingredients?.filter(hasText) ?? [],
    allergens: doc.allergens?.filter(hasText) ?? [],
    dietaryLabels: doc.dietaryLabels?.filter(hasText) ?? [],
    active: doc.active === true,
    variants:
      doc.variants?.flatMap((v) =>
        v.active !== false &&
        hasText(v.id) &&
        hasText(v.label) &&
        Number.isSafeInteger(v.price) &&
        v.price >= 0
          ? [
              {
                ...v,
                id: clean(v.id),
                label: v.label ?? "",
                shortLabel: hasText(v.shortLabel) ? v.shortLabel : v.label,
                servingDescription: v.servingDescription ?? "",
              },
            ]
          : [],
      ) ?? [],
    relatedRecipeIds: doc.relatedRecipes?.map((ref) => clean(ref._ref)) ?? [],
    relatedProductIds: doc.relatedProducts?.map((ref) => clean(ref._ref)) ?? [],
  };
}
export function mapRecipe(
  doc: SanityRecipe | StegaBranded<SanityRecipe>,
): Recipe {
  return {
    ...doc,
    id: doc._id,
    slug: clean(doc.slug?.current),
    title: doc.displayTitle ?? "",
    description: doc.description ?? "",
    tags: doc.tags?.filter(hasText) ?? [],
    relatedProductIds: doc.relatedProducts?.map((ref) => clean(ref._ref)) ?? [],
  };
}
