import type { Metadata } from "next";
import { recipes } from "@/data/recipes";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { PageIntro } from "@/components/content/page-intro";

export const metadata: Metadata = {
  title: "Recipes",
  description:
    "A little table inspiration, made even better with Salted bread.",
  alternates: { canonical: "/recipes" },
};

export default function RecipesPage() {
  return (
    <div className="shell pb-24">
      <PageIntro
        eyebrow="Beyond the bread basket"
        title={"Good bread.\nGreat possibilities."}
        description="Slow lunches, picnic plans, and the things we gather around. A little inspiration for your Salted bread."
      />
      <div className="recipe-grid">
        {recipes.map((recipe) => (
          <RecipeCard recipe={recipe} key={recipe.id} />
        ))}
      </div>
      <p className="draft-note mt-8">
        All recipes are draft inspiration and require bakery approval before
        publication.
      </p>
    </div>
  );
}
