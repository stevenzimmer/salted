import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Recipe } from "@/types/content";
import type { CommerceCopy } from "../../../sanity.types";
import { hasImage, hasText, clean } from "@/sanity/lib/content";
import { CmsImage } from "@/components/cms/image";
import { Text } from "@/components/cms/text";
export function RecipeCard({
  recipe,
  copy,
}: {
  recipe: Recipe;
  copy?: CommerceCopy["recipe"];
}) {
  if (
    ![recipe.title, recipe.description, ...recipe.tags].some(hasText) &&
    !hasImage(recipe.image)
  )
    return null;
  return (
    <article className="recipe-card">
      {hasImage(recipe.image) ? (
        <Link
          href={`/recipes/${recipe.slug}`}
          className="recipe-image"
          aria-label={`Read ${clean(recipe.title) || "recipe"}`}
        >
          <CmsImage
            image={recipe.image}
            aspectRatio={10 / 7}
            documentType={recipe._type}
            documentId={recipe._id}
            path="image"
            sizes="(max-width: 639px) 100vw, 33vw"
          />
          <span className="image-arrow">
            <ArrowUpRight size={20} aria-hidden="true" />
          </span>
        </Link>
      ) : null}
      {hasText(recipe.tags[0]) || recipe.totalMinutes !== undefined ? (
        <p className="eyebrow mt-5">
          {recipe.tags[0]}
          {hasText(recipe.tags[0]) && recipe.totalMinutes !== undefined ? (
            <span aria-hidden="true"> · </span>
          ) : null}
          {recipe.totalMinutes !== undefined ? (
            <>
              {recipe.totalMinutes} <Text as="span" value={copy?.minutes} />
            </>
          ) : null}
        </p>
      ) : null}
      {hasText(recipe.title) ? (
        <h3>
          <Link href={`/recipes/${recipe.slug}`}>{recipe.title}</Link>
        </h3>
      ) : null}
      <Text
        className="mt-2 text-sm leading-relaxed text-muted-foreground"
        value={recipe.description}
      />
    </article>
  );
}
