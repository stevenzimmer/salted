import { clean, hasText } from "@/sanity/lib/content";

export function searchableSlug(slug: string | null | undefined) {
  return /^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u.test(clean(slug));
}

type SearchDocument = {
  active?: boolean | null;
  slug?: { current?: string | null } | null;
  seo?: { noIndex?: boolean | null } | null;
};

type SearchProduct = SearchDocument & {
  category?: { _ref: string } | null;
  displayName?: string | null;
  id?: string | null;
  keepUnavailableIndexed?: boolean | null;
  tier?: string | null;
};

export function searchableProduct(product: SearchProduct | null) {
  return Boolean(
    product &&
    product.seo?.noIndex !== true &&
    (product.active === true || product.keepUnavailableIndexed === true) &&
    hasText(product.displayName) &&
    searchableSlug(product.slug?.current) &&
    hasText(product.id) &&
    hasText(product.category?._ref) &&
    ["classic", "specialty"].includes(clean(product.tier)),
  );
}

type SearchRecipe = SearchDocument & { displayTitle?: string | null };

export function searchableRecipe(recipe: SearchRecipe | null) {
  return Boolean(
    recipe?.active &&
    recipe.seo?.noIndex !== true &&
    hasText(recipe.displayTitle) &&
    searchableSlug(recipe.slug?.current),
  );
}
