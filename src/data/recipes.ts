import type { Recipe } from "@/types/content";

export const recipes: Recipe[] = [
  {
    id: "tomato-toast",
    slug: "tomato-burrata-toast",
    title: "Tomatoes, burrata & a very good toast",
    description:
      "A generous slice, ripe tomatoes, and something creamy. A little inspiration for your next slow lunch.",
    image:
      "https://placehold.co/1000x700/D6B79A/594735/png?text=a+very%0Agood+toast.&font=lora",
    imageAlt: "Tomato and burrata toast recipe photography placeholder",
    ingredients: [
      "2 generous slices of Salted bread",
      "2 ripe tomatoes, sliced",
      "1 ball of burrata",
      "Olive oil, fresh basil, and seasoning to taste",
    ],
    instructions: [
      "Toast the bread to your liking.",
      "Arrange the sliced tomatoes and torn burrata over the toast.",
      "Finish with olive oil, basil, and seasoning. Serve immediately.",
    ],
    prepMinutes: 10,
    cookMinutes: 5,
    totalMinutes: 15,
    servings: "2",
    tags: ["Slow lunches", "Simple things"],
    relatedProductIds: ["classic-focaccia", "classic-sourdough"],
    contentStatus: "draft",
  },
  {
    id: "focaccia-sandwich",
    slug: "the-weekend-focaccia-sandwich",
    title: "The take-it-outside focaccia sandwich",
    description:
      "Your picnic plans, sorted. A generous focaccia sandwich with plenty of room to make it your own.",
    image:
      "https://placehold.co/1000x700/C9CEB7/45513B/png?text=the+weekend%0Asandwich.&font=lora",
    imageAlt: "Focaccia picnic sandwich recipe photography placeholder",
    ingredients: [
      "1 focaccia, sized for your table",
      "A handful of arugula",
      "Sliced tomato",
      "Mozzarella and your favorite sandwich spread",
    ],
    instructions: [
      "Slice the focaccia horizontally.",
      "Spread the cut sides with your favorite sandwich spread.",
      "Layer in the arugula, tomato, and mozzarella. Close, slice, and share.",
    ],
    prepMinutes: 15,
    cookMinutes: 0,
    totalMinutes: 15,
    servings: "2–4",
    tags: ["Picnic material", "Lunch"],
    relatedProductIds: ["pesto-mozzarella", "classic-focaccia"],
    contentStatus: "draft",
  },
  {
    id: "bread-salad",
    slug: "the-bread-is-the-best-part-salad",
    title: "The bread-is-the-best-part salad",
    description:
      "A bright, generous bread salad. Because a salad can absolutely be an excuse for more focaccia.",
    image:
      "https://placehold.co/1000x700/CECCB8/4B4B36/png?text=more+bread.%0Amore+salad.&font=lora",
    imageAlt: "Focaccia bread salad recipe photography placeholder",
    ingredients: [
      "Focaccia, torn into bite-size pieces",
      "2 ripe tomatoes",
      "½ cucumber",
      "A handful of basil",
      "Olive oil and red wine vinegar to taste",
    ],
    instructions: [
      "Toast the torn focaccia until golden.",
      "Chop the tomatoes and cucumber and place in a large bowl.",
      "Add bread and basil. Dress with olive oil and vinegar, toss, and serve.",
    ],
    prepMinutes: 15,
    cookMinutes: 10,
    totalMinutes: 25,
    servings: "4",
    tags: ["For the table", "Salads"],
    relatedProductIds: ["rosemary-olive-black-pepper"],
    contentStatus: "draft",
  },
];

export function getRecipeBySlug(slug: string) {
  return recipes.find((recipe) => recipe.slug === slug);
}
