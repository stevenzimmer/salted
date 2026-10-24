import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Recipe } from "@/types/content";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <article className="recipe-card">
      <Link
        href={`/recipes/${recipe.slug}`}
        className="recipe-image"
        aria-label={`Read ${recipe.title}`}
      >
        <Image
          src={recipe.image}
          alt={recipe.imageAlt}
          fill
          unoptimized
          sizes="(max-width: 639px) 100vw, 33vw"
        />
        <span className="image-arrow">
          <ArrowUpRight size={20} />
        </span>
      </Link>
      <p className="eyebrow mt-5">
        {recipe.tags[0]} <span aria-hidden="true">·</span> {recipe.totalMinutes}{" "}
        minutes
      </p>
      <h3>
        <Link href={`/recipes/${recipe.slug}`}>{recipe.title}</Link>
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {recipe.description}
      </p>
    </article>
  );
}
