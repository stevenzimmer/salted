import type { Product, Recipe } from "@/types/content";
import { hasImage, hasText } from "./content";
export function hasProductCardContent(product: Product): boolean {
  return (
    hasImage(product.image) ||
    [product.name, product.badge, product.shortDescription].some(hasText) ||
    product.variants.length > 0
  );
}
export function hasRecipeCardContent(recipe: Recipe): boolean {
  return (
    hasImage(recipe.image) ||
    [recipe.title, recipe.description, ...recipe.tags].some(hasText) ||
    recipe.totalMinutes !== undefined
  );
}
