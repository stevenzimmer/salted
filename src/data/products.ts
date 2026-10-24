import type { Product } from "@/types/content";
import { focacciaVariants, pricing } from "./pricing";

const approval = {
  ingredients: ["Ingredient list awaiting bakery approval."],
  allergens: [
    "Allergen information is not yet approved. Please confirm with the bakery before ordering.",
  ],
  dietaryLabels: [],
  contentStatus: "draft" as const,
  active: true,
};

export const products: Product[] = [
  {
    ...approval,
    id: "classic-focaccia",
    slug: "classic-focaccia",
    name: "Classic Focaccia",
    category: "focaccia",
    tier: "classic",
    shortDescription: "The golden, olive-oil-kissed original.",
    description:
      "A crisp, golden outside. A soft, airy middle. Our classic sourdough focaccia is the starting point for a very good meal. Temporary tasting copy, subject to bakery approval.",
    image:
      "https://placehold.co/800x1000/DAC8AD/594735/png?text=the%0Aclassic.&font=lora",
    imageAlt: "Classic focaccia product photography placeholder",
    variants: focacciaVariants("classic"),
    relatedRecipeIds: ["tomato-toast", "focaccia-sandwich"],
    badge: "The original",
  },
  {
    ...approval,
    id: "pesto-mozzarella",
    slug: "pesto-mozzarella",
    name: "Pesto Mozzarella",
    category: "focaccia",
    tier: "specialty",
    shortDescription: "A little herby. A little melty. A favorite.",
    description:
      "Our sourdough focaccia meets the familiar pairing of pesto and mozzarella. Made for the center of the table — if it makes it that far. Temporary description; final recipe and ingredient details are pending.",
    image:
      "https://placehold.co/800x1000/C9CEB7/45513B/png?text=pesto%0Aplease.&font=lora",
    imageAlt: "Pesto mozzarella focaccia photography placeholder",
    variants: focacciaVariants("specialty"),
    relatedRecipeIds: ["focaccia-sandwich"],
    badge: "Crowd favorite",
  },
  {
    ...approval,
    id: "jalapeno-cheddar",
    slug: "jalapeno-cheddar",
    name: "Jalapeño Cheddar",
    category: "focaccia",
    tier: "specialty",
    shortDescription: "For the ones who like a little kick.",
    description:
      "A savory, slightly spirited take on sourdough focaccia. Jalapeño and cheddar bring a little extra personality to the table. Temporary tasting copy awaiting bakery approval.",
    image:
      "https://placehold.co/800x1000/E4C99C/6B4B2C/png?text=a+little%0Aheat.&font=lora",
    imageAlt: "Jalapeño cheddar focaccia photography placeholder",
    variants: focacciaVariants("specialty"),
    relatedRecipeIds: ["tomato-toast"],
  },
  {
    ...approval,
    id: "parmesan-chili-crisp",
    slug: "parmesan-chili-crisp",
    name: "Parmesan Chili Crisp",
    category: "focaccia",
    tier: "specialty",
    shortDescription: "Savory, crispy, and just a bit fiery.",
    description:
      "Parmesan and chili crisp, on a sourdough focaccia foundation. A flavor for anyone who reaches for the spicy stuff. Temporary description, pending final recipe and ingredient approval.",
    image:
      "https://placehold.co/800x1000/CEAA94/613C28/png?text=crisp.%0Achili.%0Arepeat.&font=lora",
    imageAlt: "Parmesan chili crisp focaccia photography placeholder",
    variants: focacciaVariants("specialty"),
    relatedRecipeIds: ["tomato-toast"],
  },
  {
    ...approval,
    id: "rosemary-olive-black-pepper",
    slug: "rosemary-olive-black-pepper",
    name: "Rosemary, Olive & Black Pepper",
    category: "focaccia",
    tier: "specialty",
    shortDescription: "Big Mediterranean energy. Pass the olive oil.",
    description:
      "Rosemary, olive, and black pepper come together in our sourdough focaccia. A good companion for a generous salad or a slow lunch. Temporary tasting copy awaiting bakery approval.",
    image:
      "https://placehold.co/800x1000/C7C5AE/4B4B36/png?text=olive%0Ayou.&font=lora",
    imageAlt:
      "Rosemary olive and black pepper focaccia photography placeholder",
    variants: focacciaVariants("specialty"),
    relatedRecipeIds: ["bread-salad"],
  },
  {
    ...approval,
    id: "seasonal-flavor",
    slug: "seasonal-flavor",
    name: "Seasonal Flavor",
    category: "focaccia",
    tier: "specialty",
    shortDescription: "Something new is on its way to the oven.",
    description:
      "A place on the menu for a rotating seasonal focaccia. The next flavor and release date are still being decided. This preview product is currently sold out.",
    image:
      "https://placehold.co/800x1000/B8BCE3/393D64/png?text=what%27s%0Anext%3F&font=lora",
    imageAlt: "Seasonal focaccia photography placeholder",
    variants: focacciaVariants("specialty"),
    relatedRecipeIds: [],
    badge: "Coming soon",
  },
  {
    ...approval,
    id: "classic-sourdough",
    slug: "classic-sourdough",
    name: "Classic Sourdough",
    category: "sourdough",
    tier: "classic",
    shortDescription: "A good loaf for the everyday things.",
    description:
      "A round sourdough loaf made with sourdough starter, organic flour, and sea salt. For toast, sandwiches, and whatever the day brings. Full ingredient and allergen information is awaiting approval.",
    image:
      "https://placehold.co/800x1000/DCCDB9/594735/png?text=your+daily%0Abread.&font=lora",
    imageAlt: "Classic sourdough loaf photography placeholder",
    variants: [
      {
        id: "loaf",
        label: "Round loaf",
        shortLabel: "Round loaf",
        price: pricing.classicSourdough,
        servingDescription:
          "One round sourdough loaf. Final loaf weight to be confirmed.",
      },
    ],
    relatedRecipeIds: ["tomato-toast"],
  },
  {
    ...approval,
    id: "specialty-sourdough",
    slug: "specialty-sourdough",
    name: "Specialty Sourdough",
    category: "sourdough",
    tier: "specialty",
    shortDescription: "Your favorite loaf, with a little extra.",
    description:
      "Our rotating specialty sourdough loaf. Final flavors will be shared here when the bakery menu is confirmed. This is a preview of the specialty loaf offering.",
    image:
      "https://placehold.co/800x1000/CEC0AF/594735/png?text=loaf%0Aat+first%0Abite.&font=lora",
    imageAlt: "Specialty sourdough loaf photography placeholder",
    variants: [
      {
        id: "loaf",
        label: "Round loaf",
        shortLabel: "Round loaf",
        price: pricing.specialtySourdough,
        servingDescription:
          "One specialty round loaf. Final loaf weight to be confirmed.",
      },
    ],
    relatedRecipeIds: [],
    badge: "Small batch",
  },
];

export function getProduct(id: string) {
  return products.find((product) => product.id === id && product.active);
}

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug && product.active);
}
